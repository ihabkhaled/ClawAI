import { Module } from '@nestjs/common';

import { ImageGenerationModule } from '../image-generation/image-generation.module';
import { InternalVideoController } from './controllers/internal-video.controller';
import { VideoGenerationController } from './controllers/video-generation.controller';
import { VideoExecutionManager } from './managers/video-execution.manager';
import { VideoSourceImageManager } from './managers/video-source-image.manager';
import { VideoStaleJobRecoveryManager } from './managers/video-stale-job-recovery.manager';
import { VideoGenerationRepository } from './repositories/video-generation.repository';
import { VideoGenerationService } from './services/video-generation.service';

/**
 * Text-to-video generation (ADR-137). Lives beside the image module and shares its
 * plan gate (`allowImageGeneration`, the media generation unlock) and the same
 * PAYG meter; everything else (jobs, adapters, storage) is its own.
 */
@Module({
  imports: [ImageGenerationModule],
  controllers: [VideoGenerationController, InternalVideoController],
  providers: [
    VideoGenerationService,
    VideoExecutionManager,
    VideoSourceImageManager,
    VideoStaleJobRecoveryManager,
    VideoGenerationRepository,
  ],
  exports: [VideoGenerationService],
})
export class VideoGenerationModule {}
