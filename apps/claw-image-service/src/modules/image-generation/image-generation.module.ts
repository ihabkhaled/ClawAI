import { Module } from '@nestjs/common';
import { ImageGenerationController } from './controllers/image-generation.controller';
import { InternalImageController } from './controllers/internal-image.controller';
import { ImageGenerationService } from './services/image-generation.service';
import { ImageGenerationEventsService } from './services/image-generation-events.service';
import { ImageExecutionManager } from './managers/image-execution.manager';
import { ImagePlanGateManager } from './managers/image-plan-gate.manager';
import { ImageGenerationRepository } from './repositories/image-generation.repository';
import { ComfyUIProgressAdapter } from '../runtime-progress/adapters/comfyui-progress.adapter';
import { StableDiffusionWebuiProgressAdapter } from '../runtime-progress/adapters/stable-diffusion-webui-progress.adapter';

@Module({
  controllers: [ImageGenerationController, InternalImageController],
  providers: [
    ImageGenerationService,
    ImageGenerationEventsService,
    ImageExecutionManager,
    ImagePlanGateManager,
    ImageGenerationRepository,
    ComfyUIProgressAdapter,
    StableDiffusionWebuiProgressAdapter,
  ],
  exports: [ImageGenerationService],
})
export class ImageGenerationModule {}
