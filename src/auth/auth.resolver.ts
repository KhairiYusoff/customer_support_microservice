import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User): Promise<boolean> {
    await this.authService.revokeSession(user.id);
    await this.authService.setUserOffline(user.id);
    return true;
  }

  @Query(() => [String])
  @UseGuards(JwtAuthGuard)
  async onlineUsers(): Promise<string[]> {
    return this.authService.getOnlineUsers();
  }
}