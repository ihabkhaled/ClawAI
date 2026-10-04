import { Module } from '@nestjs/common';

import { ModelsModule } from '../models/models.module';
import { ResearchModule } from '../research/research.module';
import { GenerationPipelineManager } from './managers/generation-pipeline.manager';
import { GenerationJobsRepository } from './repositories/generation-jobs.repository';
import { GenerationJobsService } from './services/generation-jobs.service';
import { GenerationJobsInternalController } from './controllers/generation-jobs-internal.controller';
import { SourceSnapshotsModule } from '../source-snapshots/source-snapshots.module';
import { ThreadBudgetClient } from './services/thread-budget.client';

@Module({
  imports: [ModelsModule, ResearchModule, SourceSnapshotsModule],
  controllers: [GenerationJobsInternalController],
  providers: [
    GenerationPipelineManager,
    GenerationJobsRepository,
    GenerationJobsService,
    ThreadBudgetClient,
  ],
  exports: [GenerationPipelineManager, GenerationJobsService],
})
export class GenerationModule {}
