import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../common/services/notification.service';
import { User, ChatRoom, ChatStatus, UserRole, Prisma } from '@prisma/client';

export interface CreateChatRoomInput {
  title?: string;
  customerId: string;
  priority?: number;
}

export interface JoinChatInput {
  chatRoomId: string;
  userId: string;
}

export interface CloseChatInput {
  chatRoomId: string;
  userId: string;
}

export interface TransferChatInput {
  chatRoomId: string;
  fromAgentId: string;
  toAgentId: string;
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private notificationService: NotificationService,
  ) {}

  async createChatRoom(input: CreateChatRoomInput): Promise<ChatRoom> {
    try {
      // Validate customer exists
      const customer = await this.prisma.user.findUnique({
        where: { id: input.customerId },
      });

      if (!customer || customer.role !== UserRole.CUSTOMER) {
        throw new BadRequestException('Invalid customer');
      }

      // Create chat room
      const chatRoom = await this.prisma.chatRoom.create({
        data: {
          title: input.title || `Support Chat - ${customer.name}`,
          status: ChatStatus.WAITING,
          priority: input.priority || 0,
          participants: {
            create: {
              userId: input.customerId,
              joinedAt: new Date(),
            },
          },
        },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          assignedTo: true,
        },
      });

      // Add to Redis queue for agent assignment
      await this.addToAgentQueue(chatRoom.id);

      // Notify available agents
      await this.notifyAvailableAgents(chatRoom);

      // Cache chat room
      await this.redisService.set(`chat:${chatRoom.id}`, chatRoom, 3600);

      return chatRoom;
    } catch (error) {
      throw new BadRequestException(`Failed to create chat room: ${error.message}`);
    }
  }

  async getChatRoom(id: string, userId: string): Promise<ChatRoom> {
    try {
      // Try cache first
      const cached = await this.redisService.get(`chat:${id}`);
      if (cached) {
        // Verify user has access
        if (await this.userHasAccessToChat(id, userId)) {
          return cached;
        }
        throw new ForbiddenException('Access denied to this chat');
      }

      const chatRoom = await this.prisma.chatRoom.findUnique({
        where: { id },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          assignedTo: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              sender: true,
            },
          },
        },
      });

      if (!chatRoom) {
        throw new NotFoundException('Chat room not found');
      }

      // Verify user has access
      if (!(await this.userHasAccessToChat(id, userId))) {
        throw new ForbiddenException('Access denied to this chat');
      }

      // Cache the result
      await this.redisService.set(`chat:${id}`, chatRoom, 3600);

      return chatRoom;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get chat room: ${error.message}`);
    }
  }

  async getUserChatRooms(userId: string, status?: ChatStatus): Promise<ChatRoom[]> {
    try {
      const whereClause: Prisma.ChatRoomWhereInput = {
        participants: {
          some: {
            userId,
          },
        },
      };

      if (status) {
        whereClause.status = status;
      }

      const chatRooms = await this.prisma.chatRoom.findMany({
        where: whereClause,
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          assignedTo: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return chatRooms;
    } catch (error) {
      throw new BadRequestException(`Failed to get user chat rooms: ${error.message}`);
    }
  }

  async joinChatRoom(input: JoinChatInput): Promise<ChatRoom> {
    try {
      const { chatRoomId, userId } = input;

      // Check if user is already in the chat
      const existingParticipant = await this.prisma.userChatRoom.findUnique({
        where: {
          userId_chatRoomId: {
            userId,
            chatRoomId,
          },
        },
      });

      if (existingParticipant && !existingParticipant.leftAt) {
        throw new BadRequestException('User already in chat room');
      }

      // If user was previously in chat, rejoin
      if (existingParticipant) {
        await this.prisma.userChatRoom.update({
          where: { id: existingParticipant.id },
          data: {
            leftAt: null,
            joinedAt: new Date(),
            unreadCount: 0,
          },
        });
      } else {
        // Add user to chat room
        await this.prisma.userChatRoom.create({
          data: {
            userId,
            chatRoomId,
            joinedAt: new Date(),
          },
        });
      }

      // Clear cache
      await this.redisService.del(`chat:${chatRoomId}`);

      // Get updated chat room
      const chatRoom = await this.getChatRoom(chatRoomId, userId);

      return chatRoom;
    } catch (error) {
      throw new BadRequestException(`Failed to join chat room: ${error.message}`);
    }
  }

  async leaveChatRoom(chatRoomId: string, userId: string): Promise<boolean> {
    try {
      const participant = await this.prisma.userChatRoom.findUnique({
        where: {
          userId_chatRoomId: {
            userId,
            chatRoomId,
          },
        },
      });

      if (!participant) {
        throw new NotFoundException('User not in chat room');
      }

      await this.prisma.userChatRoom.update({
        where: { id: participant.id },
        data: {
          leftAt: new Date(),
        },
      });

      // Clear cache
      await this.redisService.del(`chat:${chatRoomId}`);

      return true;
    } catch (error) {
      throw new BadRequestException(`Failed to leave chat room: ${error.message}`);
    }
  }

  async closeChatRoom(input: CloseChatInput): Promise<ChatRoom> {
    try {
      const { chatRoomId, userId } = input;

      const chatRoom = await this.prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        include: {
          assignedTo: true,
          participants: true,
        },
      });

      if (!chatRoom) {
        throw new NotFoundException('Chat room not found');
      }

      // Only assigned agent or admin can close chat
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        user?.role !== UserRole.ADMIN &&
        chatRoom.assignedToId !== userId
      ) {
        throw new ForbiddenException('Only assigned agent or admin can close chat');
      }

      const updatedChatRoom = await this.prisma.chatRoom.update({
        where: { id: chatRoomId },
        data: {
          status: ChatStatus.CLOSED,
          closedAt: new Date(),
        },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          assignedTo: true,
        },
      });

      // Remove from agent queue
      await this.removeFromAgentQueue(chatRoomId);

      // Clear cache
      await this.redisService.del(`chat:${chatRoomId}`);

      // Notify participants
      await this.notifyChatClosed(updatedChatRoom);

      return updatedChatRoom;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to close chat room: ${error.message}`);
    }
  }

  async transferChat(input: TransferChatInput): Promise<ChatRoom> {
    try {
      const { chatRoomId, fromAgentId, toAgentId } = input;

      const chatRoom = await this.prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        include: {
          assignedTo: true,
        },
      });

      if (!chatRoom) {
        throw new NotFoundException('Chat room not found');
      }

      if (chatRoom.assignedToId !== fromAgentId) {
        throw new ForbiddenException('Only assigned agent can transfer chat');
      }

      // Check if target agent is available
      const targetAgent = await this.prisma.user.findUnique({
        where: { id: toAgentId },
        include: {
          agentStatus: true,
        },
      });

      if (!targetAgent || targetAgent.role !== UserRole.AGENT) {
        throw new BadRequestException('Invalid target agent');
      }

      if (targetAgent.agentStatus?.status !== 'AVAILABLE') {
        throw new BadRequestException('Target agent is not available');
      }

      // Transfer the chat
      const updatedChatRoom = await this.prisma.chatRoom.update({
        where: { id: chatRoomId },
        data: {
          assignedToId: toAgentId,
          status: ChatStatus.TRANSFERRED,
        },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          assignedTo: true,
        },
      });

      // Update agent chat counts
      await this.updateAgentChatCount(fromAgentId, -1);
      await this.updateAgentChatCount(toAgentId, 1);

      // Clear cache
      await this.redisService.del(`chat:${chatRoomId}`);

      // Notify both agents
      await this.notifyChatTransferred(updatedChatRoom, fromAgentId, toAgentId);

      return updatedChatRoom;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to transfer chat: ${error.message}`);
    }
  }

  async getAgentQueue(): Promise<ChatRoom[]> {
    try {
      const waitingChats = await this.prisma.chatRoom.findMany({
        where: {
          status: ChatStatus.WAITING,
        },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
      });

      return waitingChats;
    } catch (error) {
      throw new BadRequestException(`Failed to get agent queue: ${error.message}`);
    }
  }

  private async userHasAccessToChat(chatRoomId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.userChatRoom.findUnique({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId,
        },
      },
    });

    return !!participant;
  }

  private async addToAgentQueue(chatRoomId: string): Promise<void> {
    await this.redisService.lpush('agent_queue', chatRoomId);
  }

  private async removeFromAgentQueue(chatRoomId: string): Promise<void> {
    // Get all items from queue
    const queue = await this.redisService.lrange('agent_queue', 0, -1);
    const filteredQueue = queue.filter(id => id !== chatRoomId);
    
    // Clear and repopulate queue
    await this.redisService.del('agent_queue');
    if (filteredQueue.length > 0) {
      await this.redisService.lpush('agent_queue', ...filteredQueue);
    }
  }

  private async notifyAvailableAgents(chatRoom: ChatRoom): Promise<void> {
    const availableAgents = await this.prisma.user.findMany({
      where: {
        role: UserRole.AGENT,
        agentStatus: {
          status: 'AVAILABLE',
        },
      },
    });

    for (const agent of availableAgents) {
      await this.notificationService.sendNotification({
        userId: agent.id,
        type: 'NEW_CHAT',
        title: 'New Chat Request',
        message: `New support request from ${chatRoom.participants?.[0]?.user?.name || 'Customer'}`,
        data: { chatRoomId: chatRoom.id },
      });
    }
  }

  private async notifyChatClosed(chatRoom: ChatRoom): Promise<void> {
    for (const participant of chatRoom.participants || []) {
      if (participant.user.role === UserRole.CUSTOMER) {
        await this.notificationService.sendNotification({
          userId: participant.user.id,
          type: 'CHAT_CLOSED',
          title: 'Chat Closed',
          message: 'Your support chat has been closed',
          data: { chatRoomId: chatRoom.id },
        });
      }
    }
  }

  private async notifyChatTransferred(
    chatRoom: ChatRoom,
    fromAgentId: string,
    toAgentId: string,
  ): Promise<void> {
    await this.notificationService.sendNotification({
      userId: toAgentId,
      type: 'CHAT_TRANSFERRED',
      title: 'Chat Transferred',
      message: `Chat transferred to you from another agent`,
      data: { chatRoomId: chatRoom.id },
    });

    await this.notificationService.sendNotification({
      userId: fromAgentId,
      type: 'CHAT_TRANSFERRED',
      title: 'Chat Transferred',
      message: `Chat successfully transferred`,
      data: { chatRoomId: chatRoom.id },
    });
  }

  private async updateAgentChatCount(agentId: string, delta: number): Promise<void> {
    await this.prisma.agentStatus.update({
      where: { agentId },
      data: {
        currentChats: {
          increment: delta,
        },
      },
    });
  }
}