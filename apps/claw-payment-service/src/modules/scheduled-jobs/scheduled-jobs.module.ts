import { Module } from '@nestjs/common';

import { ScheduledJobRunnerService } from './services/scheduled-job-runner.service';

@Module({
  providers: [ScheduledJobRunnerService],
  exports: [ScheduledJobRunnerService],
})
export class ScheduledJobsModule {}
