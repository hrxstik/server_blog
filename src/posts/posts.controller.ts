import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  Delete,
  Patch,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './create-post.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('order') order?: 'newest' | 'oldest' | 'popular',
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize) : 10;
    const orderVal = order || 'newest';
    const searchVal = search || '';

    const skipNum = (pageNum - 1) * pageSizeNum;

    return this.postsService.findAll(skipNum, pageSizeNum, orderVal, searchVal);
  }

  @Get('deleted')
  @UseGuards(JwtAuthGuard)
  async findAllDeleted(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('order') order?: 'newest' | 'oldest' | 'popular',
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize) : 10;
    const orderVal = order || 'newest';
    const searchVal = search || '';

    const skipNum = (pageNum - 1) * pageSizeNum;

    return this.postsService.findAllDeleted(
      skipNum,
      pageSizeNum,
      orderVal,
      searchVal,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createPostDto: CreatePostDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.postsService.create({ ...createPostDto, image });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.postsService.delete(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: Partial<CreatePostDto>,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.postsService.update(id, updatePostDto, image);
  }

  @Patch(':id/views')
  async incrementViews(@Param('id') id: string) {
    return this.postsService.incrementViews(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  async restore(@Param('id') id: string) {
    return this.postsService.restore(id);
  }
}
