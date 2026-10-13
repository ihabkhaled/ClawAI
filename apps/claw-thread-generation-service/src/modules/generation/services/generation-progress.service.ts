import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { GenerationStepsRepository } from '../repositories/generation-steps.repository';
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
    return buildProgress(job, request.data, await this.steps.list(job.id));
  }
}
