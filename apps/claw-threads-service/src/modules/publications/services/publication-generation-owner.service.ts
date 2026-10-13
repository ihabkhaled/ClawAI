import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ThreadGenerationProgress } from '@claw/shared-types';
import { PublicationStatus } from '../../../generated/prisma';

import {
  ACTIVE_GENERATION_JOB_STATUSES,
  OWNER_DELETABLE_PUBLICATION_STATUSES,
  PUBLICATION_NOT_FOUND_MESSAGE,
  RETRYABLE_GENERATION_JOB_STATUSES,
} from '../constants/publication-generation-owner.constants';
import type { RetryThreadGenerationDto } from '../dto/retry-thread-generation.dto';
import { PublicationsRepository } from '../repositories/publications.repository';
import type {
  DeleteGenerationResult,
  OwnedGeneration,
  RetryGenerationResult,
} from '../types/generation.types';
import { ThreadsGenerationClient } from './threads-generation.client';

/** Owner-only progress, retry and delete of a Thread generation. Everyone else gets a 404. */
@Injectable()
export class PublicationGenerationOwnerService {
  constructor(
    private readonly publications: PublicationsRepository,
    private readonly generation: ThreadsGenerationClient,
  ) {}

  async getProgress(publicationId: string, ownerId: string): Promise<ThreadGenerationProgress> {
    const owned = await this.requireOwned(publicationId, ownerId);
    try {
      const progress = await this.generation.getProgress(owned.generationJobId, ownerId);
      return { publicationId, ...progress };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(PUBLICATION_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  }

  async retry(
    publicationId: string,
    ownerId: string,
    input: RetryThreadGenerationDto,
  ): Promise<RetryGenerationResult> {
    const owned = await this.requireOwned(publicationId, ownerId);
    if (owned.status !== PublicationStatus.DRAFT) {
      throw new ConflictException('Only a draft generation can be retried');
    }
    const state = await this.generation.getPrivateState(owned.generationJobId, ownerId);
    if (!RETRYABLE_GENERATION_JOB_STATUSES.includes(state.status)) {
      throw new ConflictException('Generation must be failed or cancelled before a retry');
    }
    const job = await this.generation.retry(owned.generationJobId, ownerId, input);
    const attached = await this.publications.attachRetryJob(
      publicationId,
      ownerId,
      owned.generationJobId,
      job.jobId,
    );
    if (!attached) {
      const current = await this.publications.findOwnedGeneration(publicationId, ownerId);
      if (current?.generationJobId === job.jobId) {
        return { publicationId, jobId: job.jobId, status: job.status };
      }
      await this.cancelOrphanedJob(job.jobId);
      throw new ConflictException('Generation retry could not be attached');
    }
    return { publicationId, jobId: job.jobId, status: job.status };
  }

  async delete(publicationId: string, ownerId: string): Promise<DeleteGenerationResult> {
    const owned = await this.requireOwned(publicationId, ownerId);
    if (!OWNER_DELETABLE_PUBLICATION_STATUSES.includes(owned.status)) {
      throw new ConflictException('Unpublish the publication before deleting it');
    }
    await this.removeUpstreamJob(owned.generationJobId, ownerId);
    if (!(await this.publications.deleteOwnedUnpublished(publicationId, ownerId))) {
      throw new ConflictException('Publication changed during deletion');
    }
    return { deleted: true };
  }

  /** Removes the upstream job; a job that is already gone must not make the row undeletable. */
  private async removeUpstreamJob(jobId: string, ownerId: string): Promise<void> {
    try {
      const state = await this.generation.getPrivateState(jobId, ownerId);
      if (ACTIVE_GENERATION_JOB_STATUSES.includes(state.status)) {
        throw new ConflictException('Cancel the running generation before deleting it');
      }
      await this.generation.deleteJob(jobId, ownerId);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
    }
  }

  /** Best effort: a retry job that lost the attach race must not keep running unowned. */
  private async cancelOrphanedJob(jobId: string): Promise<void> {
    try {
      await this.generation.cancel(jobId);
    } catch {
      // The 409 below is the answer; a failed cancel must not mask it.
    }
  }

  private async requireOwned(publicationId: string, ownerId: string): Promise<OwnedGeneration> {
    const publication = await this.publications.findOwnedGeneration(publicationId, ownerId);
    if (!publication?.generationJobId) throw new NotFoundException(PUBLICATION_NOT_FOUND_MESSAGE);
    return {
      id: publication.id,
      generationJobId: publication.generationJobId,
      status: publication.status,
    };
  }
}
