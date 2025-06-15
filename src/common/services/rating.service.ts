import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatRating, UserRole } from '@prisma/client';

export interface CreateRatingInput {
  chatRoomId: string;
  customerId: string;
  rating: number;
  feedback?: string;
}

export interface UpdateRatingInput {
  ratingId: string;
  customerId: string;
  rating: number;
  feedback?: string;
}

@Injectable()
export class RatingService {
  constructor(private prisma: PrismaService) {}

  async createRating(input: CreateRatingInput): Promise<ChatRating> {
    try {
      const { chatRoomId, customerId, rating, feedback } = input;

      // Validate rating range
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      // Verify customer exists and has access to chat room
      const customer = await this.prisma.user.findUnique({
        where: { id: customerId },
      });

      if (!customer || customer.role !== UserRole.CUSTOMER) {
        throw new BadRequestException('Invalid customer');
      }

      // Verify chat room exists and is closed
      const chatRoom = await this.prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        include: {
          participants: true,
        },
      });

      if (!chatRoom) {
        throw new NotFoundException('Chat room not found');
      }

      if (chatRoom.status !== 'CLOSED') {
        throw new BadRequestException('Can only rate closed chats');
      }

      // Verify customer was a participant
      const customerParticipant = chatRoom.participants.find(p => p.userId === customerId);
      if (!customerParticipant) {
        throw new ForbiddenException('Customer was not a participant in this chat');
      }

      // Check if rating already exists
      const existingRating = await this.prisma.chatRating.findUnique({
        where: {
          chatRoomId_customerId: {
            chatRoomId,
            customerId,
          },
        },
      });

      if (existingRating) {
        throw new BadRequestException('Rating already exists for this chat');
      }

      // Create rating
      const chatRating = await this.prisma.chatRating.create({
        data: {
          chatRoomId,
          customerId,
          rating,
          feedback,
        },
        include: {
          chatRoom: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return chatRating;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create rating: ${error.message}`);
    }
  }

  async updateRating(input: UpdateRatingInput): Promise<ChatRating> {
    try {
      const { ratingId, customerId, rating, feedback } = input;

      // Validate rating range
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      // Verify rating exists and belongs to customer
      const existingRating = await this.prisma.chatRating.findUnique({
        where: { id: ratingId },
      });

      if (!existingRating) {
        throw new NotFoundException('Rating not found');
      }

      if (existingRating.customerId !== customerId) {
        throw new ForbiddenException('Can only update your own ratings');
      }

      // Update rating
      const updatedRating = await this.prisma.chatRating.update({
        where: { id: ratingId },
        data: {
          rating,
          feedback,
        },
        include: {
          chatRoom: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedRating;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update rating: ${error.message}`);
    }
  }

  async getRating(chatRoomId: string, customerId: string): Promise<ChatRating | null> {
    try {
      return await this.prisma.chatRating.findUnique({
        where: {
          chatRoomId_customerId: {
            chatRoomId,
            customerId,
          },
        },
        include: {
          chatRoom: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Failed to get rating:', error);
      return null;
    }
  }

  async getAgentRatings(agentId: string, limit = 50): Promise<ChatRating[]> {
    try {
      return await this.prisma.chatRating.findMany({
        where: {
          chatRoom: {
            assignedToId: agentId,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          chatRoom: {
            select: {
              id: true,
              title: true,
              createdAt: true,
              closedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      throw new BadRequestException(`Failed to get agent ratings: ${error.message}`);
    }
  }

  async getAgentAverageRating(agentId: string): Promise<{ averageRating: number; totalRatings: number }> {
    try {
      const ratings = await this.prisma.chatRating.findMany({
        where: {
          chatRoom: {
            assignedToId: agentId,
          },
        },
        select: {
          rating: true,
        },
      });

      if (ratings.length === 0) {
        return { averageRating: 0, totalRatings: 0 };
      }

      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / ratings.length;

      return {
        averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
        totalRatings: ratings.length,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get agent average rating: ${error.message}`);
    }
  }

  async deleteRating(ratingId: string, customerId: string): Promise<boolean> {
    try {
      // Verify rating exists and belongs to customer
      const existingRating = await this.prisma.chatRating.findUnique({
        where: { id: ratingId },
      });

      if (!existingRating) {
        throw new NotFoundException('Rating not found');
      }

      if (existingRating.customerId !== customerId) {
        throw new ForbiddenException('Can only delete your own ratings');
      }

      await this.prisma.chatRating.delete({
        where: { id: ratingId },
      });

      return true;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete rating: ${error.message}`);
    }
  }
}