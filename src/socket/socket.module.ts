import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { RedisModule } from '../redis/redis.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [AuthModule, ChatModule, RedisModule, CommonModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}