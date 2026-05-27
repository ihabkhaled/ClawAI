import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { PullJobsRepository } from '../repositories/pull-jobs.repository';
import { PullJobRunnerManager } from './pull-job-runner.manager';

@Injectable()
export class PullJobResumeManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(PullJobResumeManager.name);

  constructor(
    private readonly jobsRepo: PullJobsRepository,
    private readonly runner: PullJobRunnerManager,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('onApplicationBootstrap: scanning for resumable pull jobs');
    try {
      const jobs = await this.jobsRepo.findAllResumable();
      if (jobs.length === 0) {
        this.logger.log('onApplicationBootstrap: no resumable jobs found');
        return;
      }
      this.logger.log(`onApplicationBootstrap: found ${jobs.length} resumable job(s)`);
      for (const job of jobs) {
        if (this.runner.isRunning(job.id)) {
          this.logger.warn(`onApplicationBootstrap: ${job.id} already running, skipping`);
          continue;
        }
        this.logger.log(
          `onApplicationBootstrap: resuming ${job.id} status=${job.status} phase=${job.phase} downloaded=${job.downloadedBytes}/${job.totalBytes}`,
        );
        // Kick off without awaiting so all jobs resume in parallel.
        // The runner has its own per-job concurrency guard.
        void this.runner.run(job.id, true).catch((error: Error) => {
          this.logger.error(`resume: ${job.id} runner crashed — ${error.message}`);
        });
      }
    } catch (error) {
      this.logger.error(`onApplicationBootstrap: scan failed — ${(error as Error).message}`);
    }
  }
}
