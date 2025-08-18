import { Type } from 'class-transformer';
import { IsString, IsArray, IsNumber } from 'class-validator';

export class CreatePostDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @Type(() => Number)
  @IsNumber()
  themeId: number;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
