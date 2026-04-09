import { Module } from '@nestjs/common';
import { ImageGenerationController } from './controllers/image-generation.controller';
import { InternalImageController } from './controllers/internal-image.controller';
import { ImageGenerationService } from './services/image-generation.service';
import { ImageExecutionManager } from './managers/image-execution.manager';
import { ImageGenerationRepository } from './repositories/image-generation.repository';

@Module({
  controllers: [ImageGenerationController, InternalImageController],
  providers: [ImageGenerationService, ImageExecutionManager, ImageGenerationRepository],
  exports: [ImageGenerationService],
})
export class ImageGenerationModule {}
