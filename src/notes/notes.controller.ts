import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './create-note.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('api/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

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

    return this.notesService.findAll(skipNum, pageSizeNum, orderVal, searchVal);
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

    return this.notesService.findAllDeleted(
      skipNum,
      pageSizeNum,
      orderVal,
      searchVal,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notesService.findOne(id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(@Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(createNoteDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.notesService.delete(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateNoteDto: Partial<CreateNoteDto>,
  ) {
    return this.notesService.update(id, updateNoteDto);
  }

  @Patch(':id/views')
  async incrementViews(@Param('id') id: string) {
    return this.notesService.incrementViews(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  async restore(@Param('id') id: string) {
    return this.notesService.restore(id);
  }
}
