import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { PrismaService } from '../prisma.service';
import { RedisModule } from 'src/redis/redis.module';
import { UploadModule } from 'src/uploads/upload.module';

@Module({
  imports: [RedisModule, UploadModule],
  providers: [NotesService, PrismaService],
  controllers: [NotesController],
})
export class NotesModule {}
