import { Module } from '@nestjs/common';

import { ModelsModule } from '../models/models.module';
import { ResearchModule } from '../research/research.module';
import { GenerationPipelineManager } from './managers/generation-pipeline.manager';
import { GenerationJobsRepository } from './repositories/generation-jobs.repository';
import { GenerationStepsRepository } from './repositories/generation-steps.repository';
import { GenerationJobsService } from './services/generation-jobs.service';
import { GenerationProgressService } from './services/generation-progress.service';
import { StepRecorder } from './services/step-recorder.service';
import { GenerationJobsInternalController } from './controllers/generation-jobs-internal.controller';
import { SourceSnapshotsModule } from '../source-snapshots/source-snapshots.module';
import { ThreadBudgetClient } from './services/thread-budget.client';
import { GenerationSpendSyncService } from './services/generation-spend-sync.service';

@Module({
  imports: [ModelsModule, ResearchModule, SourceSnapshotsModule],
  controllers: [GenerationJobsInternalController],
  providers: [
    GenerationPipelineManager,
    GenerationJobsRepository,
    GenerationStepsRepository,
    GenerationJobsService,
    GenerationProgressService,
    StepRecorder,
    ThreadBudgetClient,
    GenerationSpendSyncService,
  ],
  exports: [GenerationPipelineManager, GenerationJobsService],
})
export class GenerationModule {}
