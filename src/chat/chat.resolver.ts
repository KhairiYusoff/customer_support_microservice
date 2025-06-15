import { Resolver, Query, Mutation, Args, Subscription, Context } from '@nestjs/graphql';
import { UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { MessageService } from './message.service';
import { AgentService } from './agent.service';
import { User, ChatRoom, Message, UserRole, AgentStatus, MessageType, ChatStatus, AgentStatusType } from '@prisma/client';

const pubSub = new PubSub();

// GraphQL Types (these would typically be in separate files)
@Resolver()
export class ChatResolver {
  constructor(
    private chatService: ChatService,
    private messageService: MessageService,
    private agentService: AgentService,
  ) {}

  // Queries
  @Query(() => [ChatRoom])
  @UseGuards(JwtAuthGuard)
  async myChatRooms(
    @CurrentUser() user: User,
    @Args('status', { nullable: true }) status?: ChatStatus,
  ): Promise<ChatRoom[]> {
    return this.chatService.getUserChatRooms(user.id, status);
  }

  @Query(() => ChatRoom)
  @UseGuards(JwtAuthGuard)
  async chatRoom(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ChatRoom> {
    return this.chatService.getChatRoom(id, user.id);
  }

  @Query(() => [Message])
  @UseGuards(JwtAuthGuard)
  async messages(
    @Args('chatRoomId') chatRoomId: string,
    @Args('limit', { nullable: true, type: () => ParseIntPipe }) limit?: number,
    @Args('offset', { nullable: true, type: () => ParseIntPipe }) offset?: number,
    @Args('cursor', { nullable: true }) cursor?: string,
    @CurrentUser() user: User,
  ): Promise<Message[]> {
    const result = await this.messageService.getMessages({
      chatRoomId,
      userId: user.id,
      limit: limit || 50,
      offset: offset || 0,
      cursor,
    });
    return result.messages;
  }

  @Query(() => [ChatRoom])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async agentQueue(): Promise<ChatRoom[]> {
    return this.chatService.getAgentQueue();
  }

  @Query(() => [ChatRoom])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT)
  async myAssignedChats(@CurrentUser() user: User): Promise<ChatRoom[]> {
    return this.agentService.getAgentChats(user.id);
  }

  @Query(() => [AgentStatus])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async availableAgents(): Promise<AgentStatus[]> {
    return this.agentService.getAvailableAgents();
  }

  @Query(() => AgentStatus)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async agentStatus(
    @Args('agentId', { nullable: true }) agentId?: string,
    @CurrentUser() user?: User,
  ): Promise<AgentStatus | null> {
    const targetAgentId = agentId || user?.id;
    if (!targetAgentId) {
      throw new BadRequestException('Agent ID is required');
    }
    return this.agentService.getAgentStatus(targetAgentId);
  }

  @Query(() => Number)
  @UseGuards(JwtAuthGuard)
  async unreadCount(
    @Args('chatRoomId') chatRoomId: string,
    @CurrentUser() user: User,
  ): Promise<number> {
    return this.messageService.getUnreadCount(chatRoomId, user.id);
  }

  // Mutations
  @Mutation(() => ChatRoom)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async createChatRoom(
    @Args('title', { nullable: true }) title?: string,
    @Args('priority', { nullable: true, type: () => ParseIntPipe }) priority?: number,
    @CurrentUser() user?: User,
  ): Promise<ChatRoom> {
    return this.chatService.createChatRoom({
      title,
      customerId: user!.id,
      priority: priority || 0,
    });
  }

  @Mutation(() => ChatRoom)
  @UseGuards(JwtAuthGuard)
  async joinChatRoom(
    @Args('chatRoomId') chatRoomId: string,
    @CurrentUser() user: User,
  ): Promise<ChatRoom> {
    const chatRoom = await this.chatService.joinChatRoom({
      chatRoomId,
      userId: user.id,
    });

    // Publish subscription event
    pubSub.publish('userJoinedChat', {
      userJoinedChat: {
        chatRoomId,
        user,
        joinedAt: new Date(),
      },
    });

    return chatRoom;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async leaveChatRoom(
    @Args('chatRoomId') chatRoomId: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const result = await this.chatService.leaveChatRoom(chatRoomId, user.id);

    // Publish subscription event
    pubSub.publish('userLeftChat', {
      userLeftChat: {
        chatRoomId,
        user,
        leftAt: new Date(),
      },
    });

    return result;
  }

  @Mutation(() => Message)
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @Args('chatRoomId') chatRoomId: string,
    @Args('content') content: string,
    @Args('type', { nullable: true }) type?: MessageType,
    @Args('fileUrl', { nullable: true }) fileUrl?: string,
    @Args('fileName', { nullable: true }) fileName?: string,
    @Args('fileSize', { nullable: true, type: () => ParseIntPipe }) fileSize?: number,
    @CurrentUser() user?: User,
  ): Promise<Message> {
    const message = await this.messageService.sendMessage({
      chatRoomId,
      senderId: user!.id,
      content,
      type: type || MessageType.TEXT,
      fileUrl,
      fileName,
      fileSize,
    });

    // Publish subscription event
    pubSub.publish('messageAdded', {
      messageAdded: message,
    });

    return message;
  }

  @Mutation(() => Message)
  @UseGuards(JwtAuthGuard)
  async updateMessage(
    @Args('messageId') messageId: string,
    @Args('content') content: string,
    @CurrentUser() user: User,
  ): Promise<Message> {
    const message = await this.messageService.updateMessage({
      messageId,
      content,
      userId: user.id,
    });

    // Publish subscription event
    pubSub.publish('messageUpdated', {
      messageUpdated: message,
    });

    return message;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteMessage(
    @Args('messageId') messageId: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const result = await this.messageService.deleteMessage({
      messageId,
      userId: user.id,
    });

    // Publish subscription event
    pubSub.publish('messageDeleted', {
      messageDeleted: {
        messageId,
        deletedBy: user.id,
        deletedAt: new Date(),
      },
    });

    return result;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async markMessagesAsRead(
    @Args('chatRoomId') chatRoomId: string,
    @Args('lastReadMessageId', { nullable: true }) lastReadMessageId?: string,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    return this.messageService.markMessagesAsRead(chatRoomId, user!.id, lastReadMessageId);
  }

  @Mutation(() => ChatRoom)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async assignChatToAgent(
    @Args('chatRoomId') chatRoomId: string,
    @Args('agentId', { nullable: true }) agentId?: string,
    @CurrentUser() user?: User,
  ): Promise<ChatRoom> {
    const targetAgentId = agentId || user?.id;
    if (!targetAgentId) {
      throw new BadRequestException('Agent ID is required');
    }

    const chatRoom = await this.agentService.assignChatToAgent({
      chatRoomId,
      agentId: targetAgentId,
    });

    // Publish subscription event
    pubSub.publish('chatAssigned', {
      chatAssigned: chatRoom,
    });

    return chatRoom;
  }

  @Mutation(() => ChatRoom)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async transferChat(
    @Args('chatRoomId') chatRoomId: string,
    @Args('toAgentId') toAgentId: string,
    @CurrentUser() user: User,
  ): Promise<ChatRoom> {
    const chatRoom = await this.chatService.transferChat({
      chatRoomId,
      fromAgentId: user.id,
      toAgentId,
    });

    // Publish subscription event
    pubSub.publish('chatTransferred', {
      chatTransferred: chatRoom,
    });

    return chatRoom;
  }

  @Mutation(() => ChatRoom)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async closeChatRoom(
    @Args('chatRoomId') chatRoomId: string,
    @CurrentUser() user: User,
  ): Promise<ChatRoom> {
    const chatRoom = await this.chatService.closeChatRoom({
      chatRoomId,
      userId: user.id,
    });

    // Publish subscription event
    pubSub.publish('chatClosed', {
      chatClosed: chatRoom,
    });

    return chatRoom;
  }

  @Mutation(() => AgentStatus)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT)
  async updateAgentStatus(
    @Args('status') status: AgentStatusType,
    @Args('statusMessage', { nullable: true }) statusMessage?: string,
    @Args('maxChats', { nullable: true, type: () => ParseIntPipe }) maxChats?: number,
    @CurrentUser() user?: User,
  ): Promise<AgentStatus> {
    const agentStatus = await this.agentService.updateAgentStatus({
      agentId: user!.id,
      status,
      statusMessage,
      maxChats,
    });

    // Publish subscription event
    pubSub.publish('agentStatusChanged', {
      agentStatusChanged: agentStatus,
    });

    return agentStatus;
  }

  @Mutation(() => ChatRoom)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async autoAssignNextChat(): Promise<ChatRoom | null> {
    const chatRoom = await this.agentService.autoAssignNextChat();
    
    if (chatRoom) {
      // Publish subscription event
      pubSub.publish('chatAssigned', {
        chatAssigned: chatRoom,
      });
    }

    return chatRoom;
  }

  // Subscriptions
  @Subscription(() => Message, {
    filter: (payload, variables) => {
      return payload.messageAdded.chatRoomId === variables.chatRoomId;
    },
  })
  messageAdded(@Args('chatRoomId') chatRoomId: string) {
    return pubSub.asyncIterator('messageAdded');
  }

  @Subscription(() => Message, {
    filter: (payload, variables) => {
      return payload.messageUpdated.chatRoomId === variables.chatRoomId;
    },
  })
  messageUpdated(@Args('chatRoomId') chatRoomId: string) {
    return pubSub.asyncIterator('messageUpdated');
  }

  @Subscription(() => Object, {
    filter: (payload, variables) => {
      return payload.messageDeleted.chatRoomId === variables.chatRoomId;
    },
  })
  messageDeleted(@Args('chatRoomId') chatRoomId: string) {
    return pubSub.asyncIterator('messageDeleted');
  }

  @Subscription(() => Object, {
    filter: (payload, variables) => {
      return payload.userJoinedChat.chatRoomId === variables.chatRoomId;
    },
  })
  userJoinedChat(@Args('chatRoomId') chatRoomId: string) {
    return pubSub.asyncIterator('userJoinedChat');
  }

  @Subscription(() => Object, {
    filter: (payload, variables) => {
      return payload.userLeftChat.chatRoomId === variables.chatRoomId;
    },
  })
  userLeftChat(@Args('chatRoomId') chatRoomId: string) {
    return pubSub.asyncIterator('userLeftChat');
  }

  @Subscription(() => Object, {
    filter: (payload, variables) => {
      const event = payload.typingEvent;
      return event.chatRoomId === variables.chatRoomId && event.userId !== variables.excludeUserId;
    },
  })
  typingEvent(
    @Args('chatRoomId') chatRoomId: string,
    @Args('excludeUserId', { nullable: true }) excludeUserId?: string,
  ) {
    return pubSub.asyncIterator('typingEvent');
  }

  @Subscription(() => ChatRoom)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  chatAssigned() {
    return pubSub.asyncIterator('chatAssigned');
  }

  @Subscription(() => ChatRoom)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  chatTransferred() {
    return pubSub.asyncIterator('chatTransferred');
  }

  @Subscription(() => ChatRoom)
  chatClosed(@Args('chatRoomId') chatRoomId: string) {
    return pubSub.asyncIterator('chatClosed');
  }

  @Subscription(() => AgentStatus)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  agentStatusChanged() {
    return pubSub.asyncIterator('agentStatusChanged');
  }

  // Helper method to publish typing events from Socket.IO
  static publishTypingEvent(event: any) {
    pubSub.publish('typingEvent', { typingEvent: event });
  }
}