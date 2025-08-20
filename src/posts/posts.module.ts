import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { RedisModule } from 'src/redis/redis.module';
import { UploadModule } from 'src/uploads/upload.module';

@Module({
  imports: [RedisModule, UploadModule],
  providers: [PostsService, PrismaService],
  controllers: [PostsController],
})
export class PostsModule {}
