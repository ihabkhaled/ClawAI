import { Module } from '@nestjs/common';
import { LlamacppEventsModule } from '../../common/events/llamacpp-events.module';
import { CatalogModule } from '../catalog/catalog.module';
import { HardwareModule } from '../hardware/hardware.module';
import { PullJobsController } from './controllers/pull-jobs.controller';
import { PullJobProgressEmitterManager } from './managers/pull-job-progress-emitter.manager';
import { PullJobResumeManager } from './managers/pull-job-resume.manager';
import { PullJobRunnerManager } from './managers/pull-job-runner.manager';
import { PullJobsRepository } from './repositories/pull-jobs.repository';
import { PullJobsService } from './services/pull-jobs.service';

@Module({
  imports: [CatalogModule, HardwareModule, LlamacppEventsModule],
  controllers: [PullJobsController],
  providers: [
    PullJobsService,
    PullJobsRepository,
    PullJobRunnerManager,
    PullJobResumeManager,
    PullJobProgressEmitterManager,
  ],
  exports: [PullJobsService],
})
export class PullJobsModule {}
