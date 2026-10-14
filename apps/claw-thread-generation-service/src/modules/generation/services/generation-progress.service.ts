import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import type { ThreadGenerationQueue } from '@claw/shared-types';

import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { GenerationStepsRepository } from '../repositories/generation-steps.repository';
import type { GenerationJobProgressRow } from '../types/generation-job-storage.types';
import type { ThreadGenerationProgressCore } from '../types/generation-progress.types';
import { progressRequestSchema } from '../types/generation-progress-source.types';
import { buildProgress } from '../utilities/build-progress.utility';

@Injectable()
export class GenerationProgressService {
  constructor(
    private readonly jobs: GenerationJobsRepository,
    private readonly steps: GenerationStepsRepository,
  ) {}

  /** Owner only. Anyone else, and a missing job, get the same 404. */
  async getProgress(jobId: string, ownerId: string): Promise<ThreadGenerationProgressCore> {
    const job = await this.jobs.findProgressJob(jobId, ownerId);
    if (!job) throw new NotFoundException('Generation job not found');
    const request = progressRequestSchema.safeParse(job.request);
    if (!request.success) throw new InternalServerErrorException('Generation request is invalid');
    const progress = buildProgress(job, request.data, await this.steps.list(job.id));
    return { ...progress, queue: await this.queueOf(job) };
  }

  /** Only a QUEUED job has a place in line; everything else answers null. */
  private async queueOf(job: GenerationJobProgressRow): Promise<ThreadGenerationQueue | null> {
    if (job.status !== 'QUEUED') return null;
    if (job.nextAttemptAt.getTime() > Date.now()) {
      return { state: 'BACKOFF', ahead: 0, retryAt: job.nextAttemptAt.toISOString() };
    }
    return {
      state: 'WAITING_FOR_WORKER',
      ahead: await this.jobs.countQueuedAhead(job),
      retryAt: null,
    };
  }
}
