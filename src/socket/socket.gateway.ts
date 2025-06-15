import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { ChatService } from '../chat/chat.service';
import { MessageService } from '../chat/message.service';
import { AgentService } from '../chat/agent.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../common/services/notification.service';
import { ChatResolver } from '../chat/chat.resolver';
import { Prisma, MessageType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  user?: Prisma.User;
}

interface TypingData {
  chatRoomId: string;
  isTyping: boolean;
}

interface JoinRoomData {
  chatRoomId: string;
}

interface SendMessageData {
  chatRoomId: string;
  content: string;
  type?: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

interface AgentStatusData {
  status: string;
  statusMessage?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SocketGateway');
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private socketUsers: Map<string, Prisma.User> = new Map(); // socketId -> user

  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    private chatService: ChatService,
    private messageService: MessageService,
    private agentService: AgentService,
    private redisService: RedisService,
    private notificationService: NotificationService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Socket.IO Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.authService.validateToken(token);
      const user = await this.authService.validateUser(payload);

      if (!user) {
        throw new UnauthorizedException('Invalid user');
      }

      client.user = user;
      this.userSockets.set(user.id, client.id);
      this.socketUsers.set(client.id, user);

      // Set user online
      await this.authService.setUserOnline(user.id);

      // Join user-specific room for notifications
      client.join(`user:${user.id}`);
      
      // If agent, join agent-specific room
      if (user.role === 'AGENT') {
        client.join('agents');
        
        // Update agent status to available if they were offline
        try {
          const agentStatus = await this.agentService.getAgentStatus(user.id);
          if (!agentStatus || agentStatus.status === 'OFFLINE') {
            await this.agentService.updateAgentStatus({
              agentId: user.id,
              status: 'AVAILABLE',
            });
          }
        } catch (error) {
          this.logger.error('Failed to update agent status on connection:', error);
        }
      }

      // Join user's active chat rooms
      await this.joinUserChatRooms(client, user.id);

      this.logger.log(`Client connected: ${client.id} (User: ${user.name})`);

      // Emit connection success
      client.emit('connected', {
        message: 'Successfully connected',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

    } catch (error) {
      this.logger.error('Connection failed:', error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      const user = this.socketUsers.get(client.id);
      
      if (user) {
        // Set user offline
        await this.authService.setUserOffline(user.id);
        
        // If agent, update status to offline
        if (user.role === 'AGENT') {
          try {
            await this.agentService.updateAgentStatus({
              agentId: user.id,
              status: 'OFFLINE',
            });
          } catch (error) {
            this.logger.error('Failed to update agent status on disconnect:', error);
          }
        }

        // Clean up maps
        this.userSockets.delete(user.id);
        this.socketUsers.delete(client.id);

        this.logger.log(`Client disconnected: ${client.id} (User: ${user.name})`);
      }
    } catch (error) {
      this.logger.error('Disconnect error:', error);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: JoinRoomData,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        throw new UnauthorizedException('Not authenticated');
      }

      const { chatRoomId } = data;

      // Verify user has access to this chat room
      try {
        await this.chatService.getChatRoom(chatRoomId, client.user.id);
      } catch (error) {
        client.emit('error', { message: 'Access denied to chat room' });
        return;
      }

      // Join the room
      client.join(`chat:${chatRoomId}`);

      // Mark messages as read
      await this.messageService.markMessagesAsRead(chatRoomId, client.user.id);

      client.emit('joined_room', { chatRoomId });
      
      // Notify other users in the room
      client.to(`chat:${chatRoomId}`).emit('user_joined', {
        chatRoomId,
        user: {
          id: client.user.id,
          name: client.user.name,
          role: client.user.role,
        },
        joinedAt: new Date(),
      });

      this.logger.log(`User ${client.user.name} joined room ${chatRoomId}`);
    } catch (error) {
      this.logger.error('Join room error:', error);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: JoinRoomData,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        throw new UnauthorizedException('Not authenticated');
      }

      const { chatRoomId } = data;

      // Leave the room
      client.leave(`chat:${chatRoomId}`);

      client.emit('left_room', { chatRoomId });
      
      // Notify other users in the room
      client.to(`chat:${chatRoomId}`).emit('user_left', {
        chatRoomId,
        user: {
          id: client.user.id,
          name: client.user.name,
          role: client.user.role,
        },
        leftAt: new Date(),
      });

      this.logger.log(`User ${client.user.name} left room ${chatRoomId}`);
    } catch (error) {
      this.logger.error('Leave room error:', error);
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SendMessageData,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        throw new UnauthorizedException('Not authenticated');
      }

      const { chatRoomId, content, type, fileUrl, fileName, fileSize } = data;

      // Send message via service
      const message = await this.messageService.sendMessage({
        chatRoomId,
        senderId: client.user.id,
        content,
        type: type || MessageType.TEXT,
        fileUrl,
        fileName,
        fileSize,
      });

      // Emit to all users in the chat room
      this.server.to(`chat:${chatRoomId}`).emit('message_received', message);

      // Publish to GraphQL subscriptions
      ChatResolver.publishTypingEvent({
        chatRoomId,
        userId: client.user.id,
        isTyping: false, // Stop typing when message is sent
      });

      this.logger.log(`Message sent in room ${chatRoomId} by ${client.user.name}`);
    } catch (error) {
      this.logger.error('Send message error:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: TypingData,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return;
      }

      const { chatRoomId, isTyping } = data;

      // Emit to other users in the room (exclude sender)
      client.to(`chat:${chatRoomId}`).emit('user_typing', {
        chatRoomId,
        user: {
          id: client.user.id,
          name: client.user.name,
        },
        isTyping,
      });

      // Publish to GraphQL subscriptions
      ChatResolver.publishTypingEvent({
        chatRoomId,
        userId: client.user.id,
        userName: client.user.name,
        isTyping,
      });
    } catch (error) {
      this.logger.error('Typing error:', error);
    }
  }

  @SubscribeMessage('agent_status')
  async handleAgentStatus(
    @MessageBody() data: AgentStatusData,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user || client.user.role !== 'AGENT') {
        throw new UnauthorizedException('Only agents can update status');
      }

      const { status, statusMessage } = data;

      await this.agentService.updateAgentStatus({
        agentId: client.user.id,
        status: status as any,
        statusMessage,
      });

      // Notify all agents about status change
      this.server.to('agents').emit('agent_status_changed', {
        agentId: client.user.id,
        agentName: client.user.name,
        status,
        statusMessage,
        updatedAt: new Date(),
      });

      client.emit('status_updated', { status, statusMessage });
      
      this.logger.log(`Agent ${client.user.name} status updated to ${status}`);
    } catch (error) {
      this.logger.error('Agent status error:', error);
      client.emit('error', { message: 'Failed to update status' });
    }
  }

  @SubscribeMessage('assign_chat')
  async handleAssignChat(
    @MessageBody() data: { chatRoomId: string; agentId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user || (client.user.role !== 'AGENT' && client.user.role !== 'ADMIN')) {
        throw new UnauthorizedException('Insufficient permissions');
      }

      const { chatRoomId, agentId } = data;
      const targetAgentId = agentId || client.user.id;

      const chatRoom = await this.agentService.assignChatToAgent({
        chatRoomId,
        agentId: targetAgentId,
      });

      // Notify the assigned agent
      const agentSocketId = this.userSockets.get(targetAgentId);
      if (agentSocketId) {
        this.server.to(agentSocketId).emit('chat_assigned', chatRoom);
      }

      // Notify customer
      const customer = chatRoom.participants?.find(p => p.user.role === 'CUSTOMER');
      if (customer) {
        const customerSocketId = this.userSockets.get(customer.userId);
        if (customerSocketId) {
          this.server.to(customerSocketId).emit('agent_assigned', {
            chatRoom,
            agent: chatRoom.assignedTo,
          });
        }
      }

      client.emit('chat_assigned_success', chatRoom);
      
      this.logger.log(`Chat ${chatRoomId} assigned to agent ${targetAgentId}`);
    } catch (error) {
      this.logger.error('Assign chat error:', error);
      client.emit('error', { message: 'Failed to assign chat' });
    }
  }

  // Helper method to notify users
  async notifyUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Helper method to notify all agents
  async notifyAgents(event: string, data: any) {
    this.server.to('agents').emit(event, data);
  }

  // Helper method to notify users in a chat room
  async notifyRoom(chatRoomId: string, event: string, data: any) {
    this.server.to(`chat:${chatRoomId}`).emit(event, data);
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from handshake auth
    const token = client.handshake.auth?.token || 
                  client.handshake.headers?.authorization?.replace('Bearer ', '');
    return token || null;
  }

  private async joinUserChatRooms(client: AuthenticatedSocket, userId: string) {
    try {
      const chatRooms = await this.chatService.getUserChatRooms(userId);
      
      for (const chatRoom of chatRooms) {
        if (chatRoom.status !== 'CLOSED') {
          client.join(`chat:${chatRoom.id}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to join user chat rooms:', error);
    }
  }
}