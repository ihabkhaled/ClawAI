import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { PullJobsRepository } from '../repositories/pull-jobs.repository';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';
import { OllamaManager } from './ollama.manager';

@Injectable()
export class PullJobResumeManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(PullJobResumeManager.name);

  constructor(
    private readonly pullJobsRepo: PullJobsRepository,
    private readonly catalogRepo: ModelCatalogRepository,
    private readonly ollamaManager: OllamaManager,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('onApplicationBootstrap: scanning for resumable pull jobs');
    try {
      const jobs = await this.pullJobsRepo.findAllResumable();
      if (jobs.length === 0) {
        this.logger.log('onApplicationBootstrap: no resumable jobs found');
        return;
      }
      this.logger.log(`onApplicationBootstrap: found ${jobs.length} resumable job(s)`);
      for (const job of jobs) {
        if (this.ollamaManager.isPullJobRunning(job.id)) {
          this.logger.warn(`onApplicationBootstrap: ${job.id} already running, skipping`);
          continue;
        }
        const catalogEntry = await this.catalogRepo.findByOllamaName(job.modelName);
        if (!catalogEntry) {
          this.logger.warn(
            `onApplicationBootstrap: ${job.id} model "${job.modelName}" not found in catalog — failing job`,
          );
          await this.pullJobsRepo.update(job.id, {
            status: 'FAILED',
            errorMessage: 'Catalog entry vanished — cannot resume',
            completedAt: new Date(),
          });
          continue;
        }
        this.logger.log(
          `onApplicationBootstrap: resuming ${job.id} model=${job.modelName} status=${job.status}`,
        );
        void this.ollamaManager
          .resumeCatalogPull(catalogEntry, job.id, job.modelName)
          .catch((error: Error) => {
            this.logger.error(`resume: ${job.id} crashed — ${error.message}`);
          });
      }
    } catch (error) {
      this.logger.error(`onApplicationBootstrap: scan failed — ${(error as Error).message}`);
    }
  }
}
