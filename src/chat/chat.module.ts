import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { MessageService } from './message.service';
import { AgentService } from './agent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, CommonModule],
  providers: [ChatService, ChatResolver, MessageService, AgentService],
  exports: [ChatService, MessageService, AgentService],
})
export class ChatModule {}