import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('api/uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('images')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }
    const imageUrl = await this.uploadService.saveFile(file);
    return { url: imageUrl };
  }
}
