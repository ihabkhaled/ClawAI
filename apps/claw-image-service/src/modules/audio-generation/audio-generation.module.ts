import { Module } from '@nestjs/common';

import { ImageGenerationModule } from '../image-generation/image-generation.module';
import { AudioGenerationController } from './controllers/audio-generation.controller';
import { InternalAudioController } from './controllers/internal-audio.controller';
import { AudioExecutionManager } from './managers/audio-execution.manager';
import { AudioStaleJobRecoveryManager } from './managers/audio-stale-job-recovery.manager';
import { AudioGenerationRepository } from './repositories/audio-generation.repository';
import { AudioGenerationService } from './services/audio-generation.service';

/**
 * Speech and music generation. Lives beside the video module and shares its plan gate
 * (`allowImageGeneration`, the media generation unlock) and the same PAYG meter;
 * everything else (jobs, adapters, storage) is its own.
 */
@Module({
  imports: [ImageGenerationModule],
  controllers: [AudioGenerationController, InternalAudioController],
  providers: [
    AudioGenerationService,
    AudioExecutionManager,
    AudioStaleJobRecoveryManager,
    AudioGenerationRepository,
  ],
  exports: [AudioGenerationService],
})
export class AudioGenerationModule {}
