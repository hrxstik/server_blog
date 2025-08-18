import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePostDto } from './create-post.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import isValidObjectId from 'src/utils/isValidObjectId';

@Injectable()
export class PostsService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  async saveFile(file: Express.Multer.File): Promise<string> {
    try {
      const ext = path.extname(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(this.uploadDir, filename);

      await fs.writeFile(filepath, file.buffer);

      return `/uploads/${filename}`;
    } catch (error) {
      throw new InternalServerErrorException('Ошибка при сохранении файла');
    }
  }

  constructor(private prisma: PrismaService) {}

  async findAll(
    skip = 0,
    take = 10,
    order: 'newest' | 'oldest' | 'popular' = 'newest',
    search = '',
  ) {
    type SortOrder = 'asc' | 'desc';
    const searchArray = search
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
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
        { tags: { hasSome: searchArray } },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.post.count({ where }),
    ]);

    const result = { posts, total };

    return result;
  }

  async findAllDeleted(
    skip = 0,
    take = 10,
    order: 'newest' | 'oldest' | 'popular' = 'newest',
    search = '',
  ) {
    type SortOrder = 'asc' | 'desc';
    const searchArray = search
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
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
        { tags: { hasSome: searchArray } },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.post.count({ where }),
    ]);

    const result = { posts, total };

    return result;
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async create(data: CreatePostDto & { image?: Express.Multer.File }) {
    if (!data.image) {
      throw new BadRequestException('Картинка обязательна для загрузки');
    }

    let imagePath = '';

    if (data.image) {
      imagePath = await this.saveFile(data.image);
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

    const post = await this.prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        themeId: data.themeId,
        tags: data.tags,
        image: imagePath,
        views: 0,
        deletedAt: null,
      },
    });

    return post;
  }

  async delete(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: `Post ${id} deleted successfully` };
  }

  async update(
    id: string,
    data: Partial<CreatePostDto>,
    image?: Express.Multer.File,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const existingPost = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost || existingPost.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    let imagePath = existingPost.image;
    if (image) {
      imagePath = await this.saveFile(image);
    }

    if (typeof data.tags === 'string') {
      try {
        data.tags = JSON.parse(data.tags);
      } catch {
        throw new BadRequestException('Некорректный формат тегов');
      }
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

    const updateData: any = {
      title: data.title ?? existingPost.title,
      content: data.content ?? existingPost.content,
      themeId:
        data.themeId !== undefined
          ? Number(data.themeId)
          : existingPost.themeId,
      tags: data.tags ?? existingPost.tags,
      image: imagePath,
    };

    try {
      const updatedPost = await this.prisma.post.update({
        where: { id },
        data: updateData,
      });
      return updatedPost;
    } catch (error) {
      throw new BadRequestException('Ошибка при обновлении поста');
    }
  }

  async incrementViews(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: {
        views: { increment: 1 },
      },
    });

    return updatedPost;
  }

  async restore(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (!post.deletedAt) {
      throw new BadRequestException('Post is not deleted');
    }

    const restoredPost = await this.prisma.post.update({
      where: { id },
      data: { deletedAt: null },
    });

    return restoredPost;
  }
}
