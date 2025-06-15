import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(private redisService: RedisService) {}

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Store notification in Redis for later retrieval
      const notificationKey = `notifications:${payload.userId}`;
      const notification = {
        id: Date.now().toString(),
        ...payload,
        createdAt: new Date().toISOString(),
        read: false,
      };

      await this.redisService.lpush(notificationKey, JSON.stringify(notification));
      
      // Keep only last 50 notifications per user
      await this.redisService.ltrim(notificationKey, 0, 49);

      // Publish notification for real-time delivery
      await this.redisService.publish(
        `user:${payload.userId}:notifications`,
        JSON.stringify(notification),
      );
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async getNotifications(userId: string, limit = 20): Promise<any[]> {
    try {
      const notificationKey = `notifications:${userId}`;
      const notifications = await this.redisService.lrange(notificationKey, 0, limit - 1);
      
      return notifications.map(n => JSON.parse(n));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const notificationKey = `notifications:${userId}`;
      const notifications = await this.redisService.lrange(notificationKey, 0, -1);
      
      const updatedNotifications = notifications.map(n => {
        const notification = JSON.parse(n);
        if (notification.id === notificationId) {
          notification.read = true;
        }
        return JSON.stringify(notification);
      });

      // Clear and repopulate the list
      await this.redisService.del(notificationKey);
      if (updatedNotifications.length > 0) {
        await this.redisService.lpush(notificationKey, ...updatedNotifications);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
}