import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Prisma, UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  bankingId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async validateUser(payload: JwtPayload): Promise<Prisma.User> {
    try {
      // Check if session exists in Redis
      const sessionKey = `session:${payload.sub}`;
      const session = await this.redisService.getSession(sessionKey);
      
      if (!session) {
        throw new UnauthorizedException('Session expired');
      }

      // Find or create user from banking service payload
      let user = await this.prisma.user.findUnique({
        where: { bankingId: payload.bankingId },
      });

      if (!user) {
        // Create new user from JWT payload (trust banking service)
        user = await this.prisma.user.create({
          data: {
            bankingId: payload.bankingId,
            email: payload.email,
            name: payload.name,
            role: payload.role,
          },
        });
      } else {
        // Update user info if changed
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            email: payload.email,
            name: payload.name,
            role: payload.role,
          },
        });
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async createSession(user: Prisma.User, token: string): Promise<void> {
    const sessionKey = `session:${user.id}`;
    const expiresIn = parseInt(this.configService.get('JWT_EXPIRES_IN', '86400'));
    
    await this.redisService.setSession(
      sessionKey,
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        token,
      },
      expiresIn,
    );

    // Store session in database as well
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });
  }

  async revokeSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    await this.redisService.deleteSession(sessionKey);
    
    // Remove from database
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshUserData(bankingId: string): Promise<Prisma.User> {
    // This would typically call the banking service API
    // For now, we'll just return the existing user
    const user = await this.prisma.user.findUnique({
      where: { bankingId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async setUserOnline(userId: string): Promise<void> {
    await this.redisService.addToSet('online_users', userId);
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.redisService.removeFromSet('online_users', userId);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return this.redisService.isSetMember('online_users', userId);
  }

  async getOnlineUsers(): Promise<string[]> {
    return this.redisService.getSetMembers('online_users');
  }
}