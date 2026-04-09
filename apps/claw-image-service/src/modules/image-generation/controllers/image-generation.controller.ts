import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ImageGenerationService } from '../services/image-generation.service';
import { listImagesQuerySchema, type ListImagesQueryDto } from '../dto/generate-image.dto';

@Controller('images')
export class ImageGenerationController {
  constructor(private readonly imageService: ImageGenerationService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listImagesQuerySchema)) query: ListImagesQueryDto,
  ): Promise<unknown> {
    return this.imageService.listByUser(user.id, query);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.imageService.getById(id, user.id);
  }
}
