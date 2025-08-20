import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { CreateNoteDto } from './create-note.dto';
import isValidObjectId from 'src/utils/isValidObjectId';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async findAll(
    skip = 0,
    take = 10,
    order: 'newest' | 'oldest' | 'popular' = 'newest',
    search = '',
  ) {
    type SortOrder = 'asc' | 'desc';

    const orderBy: { [key: string]: SortOrder } =
      order === 'newest'
        ? { createdAt: 'desc' }
        : order === 'oldest'
          ? { createdAt: 'asc' }
          : { views: 'desc' };

    const where = {
      deletedAt: null,
      OR: [
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    };

    const cacheKey = `notes:${skip}:${take}:${order}:${search}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.note.count({ where }),
    ]);
    const result = { notes, total };
    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async findAllDeleted(
    skip = 0,
    take = 10,
    order: 'newest' | 'oldest' | 'popular' = 'newest',
    search = '',
  ) {
    type SortOrder = 'asc' | 'desc';

    const orderBy: { [key: string]: SortOrder } =
      order === 'newest'
        ? { createdAt: 'desc' }
        : order === 'oldest'
          ? { createdAt: 'asc' }
          : { views: 'desc' };

    const where = {
      deletedAt: { not: null },
      OR: [
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    };

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.note.count({ where }),
    ]);

    const cacheKey = `notes:deleted:${skip}:${take}:${order}:${search}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = { notes, total };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async findOne(id: string) {
    const cacheKey = `note:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException('Note not found');
    }
    await this.redisService.set(cacheKey, JSON.stringify(note), 300);
    return note;
  }

  async create(data: CreateNoteDto) {
    const requiredFields = ['title', 'themeId'];
    for (const field of requiredFields) {
      if (
        field in data &&
        (data[field] === undefined ||
          data[field] === null ||
          (typeof data[field] === 'string' && data[field].trim() === ''))
      ) {
        throw new BadRequestException(`Поле "${field}" не может быть пустым`);
      }
    }

    if (data['content'].trim() === '<p><br></p>') {
      throw new BadRequestException('Поле "content" не может быть пустым');
    }

    const note = await this.prisma.note.create({
      data: {
        title: data.title,
        content: data.content,
        themeId: data.themeId,
        views: 0,
        deletedAt: null,
      },
    });

    await this.redisService.delPattern('notes:*');
    return note;
  }
  async delete(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException('Note not found');
    }

    await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.redisService.delPattern(`note:${id}`);
    return { message: `Note ${id} deleted successfully` };
  }

  async update(id: string, data: Partial<CreateNoteDto>) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const existingNote = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote || existingNote.deletedAt) {
      throw new NotFoundException('Note not found');
    }
    const requiredFields = ['title', 'themeId'];
    for (const field of requiredFields) {
      if (
        field in data &&
        (data[field] === undefined ||
          data[field] === null ||
          (typeof data[field] === 'string' && data[field].trim() === ''))
      ) {
        throw new BadRequestException(`Поле "${field}" не может быть пустым`);
      }
    }

    if (data['content'] && data['content'].trim() === '<p><br></p>') {
      throw new BadRequestException('Поле "content" не может быть пустым');
    }
    try {
      const updatedNote = await this.prisma.note.update({
        where: { id },
        data,
      });
      await this.redisService.delPattern(`notes:*`);
      return updatedNote;
    } catch (error) {
      throw new BadRequestException('Ошибка при обновлении заметки');
    }
  }
  async incrementViews(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note || note.deletedAt) {
      throw new NotFoundException('Note not found');
    }

    const updatedNote = await this.prisma.note.update({
      where: { id },
      data: {
        views: { increment: 1 },
      },
    });
    await this.redisService.delPattern(`note:${id}`);
    return updatedNote;
  }

  async restore(id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (!note.deletedAt) {
      throw new BadRequestException('Note is not deleted');
    }

    const restoredNote = await this.prisma.note.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.redisService.delPattern(`note:${id}`);
    return restoredNote;
  }
}
