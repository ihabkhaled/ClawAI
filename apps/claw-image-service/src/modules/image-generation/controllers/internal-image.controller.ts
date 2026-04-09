import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ImageGenerationService } from '../services/image-generation.service';
import { generateImageSchema, type GenerateImageDto } from '../dto/generate-image.dto';
import { type GenerateImageResult } from '../types/image-generation.types';

@Controller('internal/images')
export class InternalImageController {
  constructor(private readonly imageService: ImageGenerationService) {}

  @Public()
  @Post('generate')
  async generate(
    @Body(new ZodValidationPipe(generateImageSchema)) dto: GenerateImageDto,
  ): Promise<GenerateImageResult> {
    return this.imageService.generate(dto);
  }
}
