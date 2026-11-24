import { Module } from '@nestjs/common';

import { SourcesModule } from '../sources/sources.module';
import { LiveModelClient } from './adapters/live-model.adapter';
import { LiveResearchClient } from './adapters/research.adapter';
import { TranscriptionAdapter } from './adapters/transcription.adapter';
import { RunLifecycleManager } from './managers/run-lifecycle.manager';
import { SummaryManager } from './managers/summary.manager';
import { TranscriptManager } from './managers/transcript.manager';
import { TranslationManager } from './managers/translation.manager';
import { VisionManager } from './managers/vision.manager';
import { ProcessingRunRepository } from './repositories/processing-run.repository';
import { FencedRunWriter } from './services/fenced-run-writer.service';
import { RunCoordinatorService } from './services/run-coordinator.service';
import { RunEventEmitter } from './services/run-event-emitter.service';
import { RunReconcilerService } from './services/run-reconciler.service';
import { RunWorkerFactory } from './services/run-worker-factory.service';

/**
 * The shared processing pipeline (sections 2–4): run coordination, the lease reconciler
 * and the per-run workers. Needs LIVE_EVENT_PUBLISHER from the realtime module and the
 * global PrismaService, LivePolicyService and RabbitMQService.
 */
@Module({
  imports: [SourcesModule],
  providers: [
    ProcessingRunRepository,
    FencedRunWriter,
    RunEventEmitter,
    RunCoordinatorService,
    RunReconcilerService,
    RunWorkerFactory,
    RunLifecycleManager,
    TranscriptManager,
    SummaryManager,
    TranslationManager,
    VisionManager,
    LiveModelClient,
    TranscriptionAdapter,
    LiveResearchClient,
  ],
  exports: [RunCoordinatorService],
})
export class ProcessingModule {}
