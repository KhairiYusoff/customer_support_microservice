import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../common/services/notification.service';
import { AgentStatus, AgentStatusType, ChatRoom, UserRole, ChatStatus } from '@prisma/client';

export interface UpdateAgentStatusInput {
  agentId: string;
  status: AgentStatusType;
  statusMessage?: string;
  maxChats?: number;
}

export interface AssignChatInput {
  chatRoomId: string;
  agentId: string;
}

@Injectable()
export class AgentService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private notificationService: NotificationService,
  ) {}

  async updateAgentStatus(input: UpdateAgentStatusInput): Promise<AgentStatus> {
    try {
      const { agentId, status, statusMessage, maxChats } = input;

      // Verify agent exists
      const agent = await this.prisma.user.findUnique({
        where: { id: agentId },
      });

      if (!agent || agent.role !== UserRole.AGENT) {
        throw new BadRequestException('Invalid agent');
      }

      // Get or create agent status
      let agentStatus = await this.prisma.agentStatus.findUnique({
        where: { agentId },
      });

      if (!agentStatus) {
        agentStatus = await this.prisma.agentStatus.create({
          data: {
            agentId,
            status,
            statusMessage,
            maxChats: maxChats || 5,
            lastActiveAt: new Date(),
          },
        });
      } else {
        agentStatus = await this.prisma.agentStatus.update({
          where: { agentId },
          data: {
            status,
            statusMessage,
            maxChats: maxChats !== undefined ? maxChats : agentStatus.maxChats,
            lastActiveAt: new Date(),
          },
        });
      }

      // Update Redis cache
      await this.redisService.set(`agent:${agentId}:status`, agentStatus, 3600);

      // If agent goes offline, remove from online agents set
      if (status === AgentStatusType.OFFLINE) {
        await this.redisService.removeFromSet('online_agents', agentId);
      } else {
        await this.redisService.addToSet('online_agents', agentId);
      }

      // If agent becomes available, try to assign waiting chats
      if (status === AgentStatusType.AVAILABLE) {
        await this.tryAssignWaitingChats(agentId);
      }

      return agentStatus;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update agent status: ${error.message}`);
    }
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus | null> {
    try {
      // Try cache first
      const cached = await this.redisService.get(`agent:${agentId}:status`);
      if (cached) {
        return cached;
      }

      const agentStatus = await this.prisma.agentStatus.findUnique({
        where: { agentId },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      if (agentStatus) {
        // Cache the result
        await this.redisService.set(`agent:${agentId}:status`, agentStatus, 3600);
      }

      return agentStatus;
    } catch (error) {
      console.error('Failed to get agent status:', error);
      return null;
    }
  }

  async getAvailableAgents(): Promise<AgentStatus[]> {
    try {
      const availableAgents = await this.prisma.agentStatus.findMany({
        where: {
          status: AgentStatusType.AVAILABLE,
        },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: [
          { currentChats: 'asc' },
          { lastActiveAt: 'desc' },
        ],
      });

      return availableAgents.filter(agent => agent.currentChats < agent.maxChats);
    } catch (error) {
      throw new BadRequestException(`Failed to get available agents: ${error.message}`);
    }
  }

  async assignChatToAgent(input: AssignChatInput): Promise<ChatRoom> {
    try {
      const { chatRoomId, agentId } = input;

      // Verify chat room exists and is waiting
      const chatRoom = await this.prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!chatRoom) {
        throw new NotFoundException('Chat room not found');
      }

      if (chatRoom.status !== ChatStatus.WAITING) {
        throw new BadRequestException('Chat is not waiting for assignment');
      }

      // Verify agent is available
      const agentStatus = await this.getAgentStatus(agentId);
      if (!agentStatus || agentStatus.status !== AgentStatusType.AVAILABLE) {
        throw new BadRequestException('Agent is not available');
      }

      if (agentStatus.currentChats >= agentStatus.maxChats) {
        throw new BadRequestException('Agent has reached maximum chat capacity');
      }

      // Assign chat to agent
      const updatedChatRoom = await this.prisma.chatRoom.update({
        where: { id: chatRoomId },
        data: {
          assignedToId: agentId,
          status: ChatStatus.ACTIVE,
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

      // Add agent to chat room participants
      await this.prisma.userChatRoom.create({
        data: {
          userId: agentId,
          chatRoomId,
          joinedAt: new Date(),
        },
      });

      // Update agent's current chat count
      await this.prisma.agentStatus.update({
        where: { agentId },
        data: {
          currentChats: {
            increment: 1,
          },
        },
      });

      // Remove from agent queue
      await this.removeFromAgentQueue(chatRoomId);

      // Clear caches
      await this.redisService.del(`chat:${chatRoomId}`);
      await this.redisService.del(`agent:${agentId}:status`);

      // Notify agent
      await this.notificationService.sendNotification({
        userId: agentId,
        type: 'CHAT_ASSIGNED',
        title: 'Chat Assigned',
        message: `New chat assigned from ${updatedChatRoom.participants?.[0]?.user?.name || 'Customer'}`,
        data: { chatRoomId },
      });

      // Notify customer
      const customer = updatedChatRoom.participants?.find(p => p.user.role === UserRole.CUSTOMER);
      if (customer) {
        await this.notificationService.sendNotification({
          userId: customer.userId,
          type: 'AGENT_ASSIGNED',
          title: 'Agent Assigned',
          message: `${updatedChatRoom.assignedTo?.name} is now helping you`,
          data: { chatRoomId, agentName: updatedChatRoom.assignedTo?.name },
        });
      }

      return updatedChatRoom;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to assign chat to agent: ${error.message}`);
    }
  }

  async getAgentChats(agentId: string): Promise<ChatRoom[]> {
    try {
      const agentChats = await this.prisma.chatRoom.findMany({
        where: {
          assignedToId: agentId,
          status: {
            in: [ChatStatus.ACTIVE, ChatStatus.TRANSFERRED],
          },
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
        orderBy: { updatedAt: 'desc' },
      });

      return agentChats;
    } catch (error) {
      throw new BadRequestException(`Failed to get agent chats: ${error.message}`);
    }
  }

  async autoAssignNextChat(): Promise<ChatRoom | null> {
    try {
      // Get the oldest waiting chat
      const waitingChat = await this.prisma.chatRoom.findFirst({
        where: {
          status: ChatStatus.WAITING,
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        include: {
          participants: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!waitingChat) {
        return null;
      }

      // Get the best available agent (least loaded)
      const availableAgents = await this.getAvailableAgents();
      if (availableAgents.length === 0) {
        return null;
      }

      const bestAgent = availableAgents[0]; // Already sorted by current chats ascending

      // Assign the chat
      return await this.assignChatToAgent({
        chatRoomId: waitingChat.id,
        agentId: bestAgent.agentId,
      });
    } catch (error) {
      console.error('Failed to auto-assign chat:', error);
      return null;
    }
  }

  async getAgentPerformanceStats(agentId: string, days = 7): Promise<{
    totalChats: number;
    avgResponseTime: number;
    customerSatisfaction: number;
    resolvedChats: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total chats
      const totalChats = await this.prisma.chatRoom.count({
        where: {
          assignedToId: agentId,
          createdAt: {
            gte: startDate,
          },
        },
      });

      // Get resolved chats
      const resolvedChats = await this.prisma.chatRoom.count({
        where: {
          assignedToId: agentId,
          status: ChatStatus.CLOSED,
          createdAt: {
            gte: startDate,
          },
        },
      });

      // Get customer satisfaction (average rating)
      const ratings = await this.prisma.chatRating.findMany({
        where: {
          chatRoom: {
            assignedToId: agentId,
            createdAt: {
              gte: startDate,
            },
          },
        },
      });

      const customerSatisfaction = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
        : 0;

      // Calculate average response time (simplified)
      const avgResponseTime = 0; // This would require more complex calculation

      return {
        totalChats,
        avgResponseTime,
        customerSatisfaction,
        resolvedChats,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get agent performance stats: ${error.message}`);
    }
  }

  private async tryAssignWaitingChats(agentId: string): Promise<void> {
    try {
      const agentStatus = await this.getAgentStatus(agentId);
      if (!agentStatus || agentStatus.currentChats >= agentStatus.maxChats) {
        return;
      }

      const availableSlots = agentStatus.maxChats - agentStatus.currentChats;
      
      // Get waiting chats
      const waitingChats = await this.prisma.chatRoom.findMany({
        where: {
          status: ChatStatus.WAITING,
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: availableSlots,
      });

      // Assign chats
      for (const chat of waitingChats) {
        try {
          await this.assignChatToAgent({
            chatRoomId: chat.id,
            agentId,
          });
        } catch (error) {
          console.error(`Failed to assign chat ${chat.id} to agent ${agentId}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to try assign waiting chats:', error);
    }
  }

  private async removeFromAgentQueue(chatRoomId: string): Promise<void> {
    try {
      // Get all items from queue
      const queue = await this.redisService.lrange('agent_queue', 0, -1);
      const filteredQueue = queue.filter(id => id !== chatRoomId);
      
      // Clear and repopulate queue
      await this.redisService.del('agent_queue');
      if (filteredQueue.length > 0) {
        await this.redisService.lpush('agent_queue', ...filteredQueue);
      }
    } catch (error) {
      console.error('Failed to remove from agent queue:', error);
    }
  }
}