import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Message, MessageType, Prisma } from '@prisma/client';

export interface SendMessageInput {
  chatRoomId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface UpdateMessageInput {
  messageId: string;
  content: string;
  userId: string;
}

export interface DeleteMessageInput {
  messageId: string;
  userId: string;
}

export interface GetMessagesInput {
  chatRoomId: string;
  userId: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async sendMessage(input: SendMessageInput): Promise<Message> {
    try {
      const { chatRoomId, senderId, content, type = MessageType.TEXT, fileUrl, fileName, fileSize } = input;

      // Verify user has access to chat room
      if (!(await this.userHasAccessToChat(chatRoomId, senderId))) {
        throw new ForbiddenException('Access denied to this chat room');
      }

      // Verify chat room exists and is not closed
      const chatRoom = await this.prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
      });

      if (!chatRoom) {
        throw new NotFoundException('Chat room not found');
      }

      if (chatRoom.status === 'CLOSED') {
        throw new BadRequestException('Cannot send message to closed chat');
      }

      // Create message
      const message = await this.prisma.message.create({
        data: {
          content,
          type,
          fileUrl,
          fileName,
          fileSize,
          chatRoomId,
          senderId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
            },
          },
          chatRoom: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      // Update chat room timestamp
      await this.prisma.chatRoom.update({
        where: { id: chatRoomId },
        data: {
          updatedAt: new Date(),
          status: chatRoom.status === 'WAITING' ? 'ACTIVE' : chatRoom.status,
        },
      });

      // Update unread counts for other participants
      await this.updateUnreadCounts(chatRoomId, senderId);

      // Cache recent messages
      await this.cacheRecentMessage(chatRoomId, message);

      // Clear chat room cache to force refresh
      await this.redisService.del(`chat:${chatRoomId}`);

      return message;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }
  }

  async updateMessage(input: UpdateMessageInput): Promise<Message> {
    try {
      const { messageId, content, userId } = input;

      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: true,
        },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      if (message.senderId !== userId) {
        throw new ForbiddenException('Can only edit your own messages');
      }

      if (message.deletedAt) {
        throw new BadRequestException('Cannot edit deleted message');
      }

      // Messages can only be edited within 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (message.createdAt < fifteenMinutesAgo) {
        throw new BadRequestException('Message can only be edited within 15 minutes');
      }

      const updatedMessage = await this.prisma.message.update({
        where: { id: messageId },
        data: {
          content,
          editedAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
            },
          },
        },
      });

      // Clear cache
      await this.redisService.del(`chat:${message.chatRoomId}`);
      await this.redisService.del(`messages:${message.chatRoomId}`);

      return updatedMessage;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update message: ${error.message}`);
    }
  }

  async deleteMessage(input: DeleteMessageInput): Promise<boolean> {
    try {
      const { messageId, userId } = input;

      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: true,
        },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      if (message.senderId !== userId) {
        throw new ForbiddenException('Can only delete your own messages');
      }

      if (message.deletedAt) {
        throw new BadRequestException('Message already deleted');
      }

      // Soft delete
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          content: '[Message deleted]',
        },
      });

      // Clear cache
      await this.redisService.del(`chat:${message.chatRoomId}`);
      await this.redisService.del(`messages:${message.chatRoomId}`);

      return true;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete message: ${error.message}`);
    }
  }

  async getMessages(input: GetMessagesInput): Promise<{
    messages: Message[];
    hasMore: boolean;
    cursor?: string;
  }> {
    try {
      const { chatRoomId, userId, limit = 50, offset = 0, cursor } = input;

      // Verify user has access to chat room
      if (!(await this.userHasAccessToChat(chatRoomId, userId))) {
        throw new ForbiddenException('Access denied to this chat room');
      }

      // Try cache first for recent messages
      if (!cursor && offset === 0) {
        const cached = await this.redisService.get(`messages:${chatRoomId}`);
        if (cached && cached.length >= limit) {
          return {
            messages: cached.slice(0, limit),
            hasMore: cached.length > limit,
          };
        }
      }

      let whereClause: any = {
        chatRoomId,
        deletedAt: null,
      };

      // Cursor-based pagination
      if (cursor) {
        whereClause.createdAt = {
          lt: new Date(cursor),
        };
      }

      const messages = await this.prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Get one extra to check if there are more
        skip: cursor ? 0 : offset,
      });

      const hasMore = messages.length > limit;
      const resultMessages = hasMore ? messages.slice(0, limit) : messages;

      // Cache recent messages
      if (!cursor && offset === 0) {
        await this.redisService.set(`messages:${chatRoomId}`, resultMessages, 300); // 5 minutes
      }

      const nextCursor = hasMore && resultMessages.length > 0 
        ? resultMessages[resultMessages.length - 1].createdAt.toISOString()
        : undefined;

      return {
        messages: resultMessages.reverse(), // Return in chronological order
        hasMore,
        cursor: nextCursor,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get messages: ${error.message}`);
    }
  }

  async markMessagesAsRead(chatRoomId: string, userId: string, lastReadMessageId?: string): Promise<boolean> {
    try {
      // Verify user has access to chat room
      if (!(await this.userHasAccessToChat(chatRoomId, userId))) {
        throw new ForbiddenException('Access denied to this chat room');
      }

      await this.prisma.userChatRoom.updateMany({
        where: {
          chatRoomId,
          userId,
        },
        data: {
          lastReadAt: new Date(),
          unreadCount: 0,
        },
      });

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to mark messages as read: ${error.message}`);
    }
  }

  async getUnreadCount(chatRoomId: string, userId: string): Promise<number> {
    try {
      const userChatRoom = await this.prisma.userChatRoom.findUnique({
        where: {
          userId_chatRoomId: {
            userId,
            chatRoomId,
          },
        },
      });

      return userChatRoom?.unreadCount || 0;
    } catch (error) {
      return 0;
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

    return !!participant && !participant.leftAt;
  }

  private async updateUnreadCounts(chatRoomId: string, senderId: string): Promise<void> {
    // Get all participants except sender
    const participants = await this.prisma.userChatRoom.findMany({
      where: {
        chatRoomId,
        userId: {
          not: senderId,
        },
        leftAt: null,
      },
    });

    // Increment unread count for each participant
    const updatePromises = participants.map(participant =>
      this.prisma.userChatRoom.update({
        where: { id: participant.id },
        data: {
          unreadCount: {
            increment: 1,
          },
        },
      })
    );

    await Promise.all(updatePromises);
  }

  private async cacheRecentMessage(chatRoomId: string, message: Message): Promise<void> {
    try {
      const cacheKey = `messages:${chatRoomId}`;
      const cached = await this.redisService.get(cacheKey) || [];
      
      // Add new message to the beginning
      cached.unshift(message);
      
      // Keep only last 100 messages in cache
      if (cached.length > 100) {
        cached.splice(100);
      }
      
      await this.redisService.set(cacheKey, cached, 300); // 5 minutes
    } catch (error) {
      console.error('Failed to cache message:', error);
    }
  }
}