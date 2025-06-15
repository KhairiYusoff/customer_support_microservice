import { Module } from '@nestjs/common';
import { FileUploadService } from './services/file-upload.service';
import { NotificationService } from './services/notification.service';
import { RatingService } from './services/rating.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [FileUploadService, NotificationService, RatingService],
  exports: [FileUploadService, NotificationService, RatingService],
})
export class CommonModule {}