import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  async saveFile(file: Express.Multer.File): Promise<string> {
    try {
      const ext = path.extname(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(this.uploadDir, filename);

      const buffer = await sharp(file.buffer)
        .resize(800)
        .jpeg({ quality: 80 })
        .png({ quality: 80 })
        .toBuffer();

      await fs.writeFile(filepath, buffer);

      return `/uploads/${filename}`;
    } catch (error) {
      throw new InternalServerErrorException('Ошибка при сохранении файла');
    }
  }
}
