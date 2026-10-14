import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
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
import { scopedIdempotencyKey } from '../utilities/generation-idempotency.utility';
import { GenerationActiveCapService } from './generation-active-cap.service';
import { GenerationPreflightService } from './generation-preflight.service';
import { GenerationStartGate } from './generation-start-gate.service';
import { HealingPoolService } from './healing-pool.service';
import { ThreadsGenerationClient } from './threads-generation.client';

/** Owner-only progress, retry and delete of a Thread generation. Everyone else gets a 404. */
@Injectable()
export class PublicationGenerationOwnerService {
  constructor(
    private readonly publications: PublicationsRepository,
    private readonly generation: ThreadsGenerationClient,
    private readonly preflight: GenerationPreflightService,
    private readonly activeCap: GenerationActiveCapService,
    private readonly gate: GenerationStartGate,
    @Optional() private readonly healingPool?: HealingPoolService,
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

  /**
   * A retry is a new paid generation, so it passes the same checks as a start (models known, on
   * the plan with fallbacks, spend cap, permission, active cap) on the models it will really use,
   * and runs one at a time per owner. The idempotency key is scoped to the owner.
   */
  retry(
    publicationId: string,
    ownerId: string,
    input: RetryThreadGenerationDto,
  ): Promise<RetryGenerationResult> {
    return this.gate.run(ownerId, () => this.retrySerialised(publicationId, ownerId, input));
  }

  private async retrySerialised(
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
    const stored = await this.generation.getProgress(owned.generationJobId, ownerId);
    await this.preflight.assertCanRetry(ownerId, stored.selections, input);
    await this.activeCap.assertBelowCap(ownerId);
    const job = await this.queueRetry(owned.generationJobId, ownerId, input);
    return this.attachRetry(publicationId, ownerId, owned.generationJobId, job);
  }

  private async queueRetry(
    previousJobId: string,
    ownerId: string,
    input: RetryThreadGenerationDto,
  ): Promise<{ jobId: string; status: string }> {
    try {
      const healing = await this.healingPool?.forOwner(ownerId);
      return await this.generation.retry(
        previousJobId,
        ownerId,
        { ...input, idempotencyKey: scopedIdempotencyKey(ownerId, input.idempotencyKey) },
        healing,
      );
    } catch (error: unknown) {
      throw (await this.preflight.explainBudgetDenial(ownerId, error)) ?? error;
    }
  }

  private async attachRetry(
    publicationId: string,
    ownerId: string,
    previousJobId: string,
    job: { jobId: string; status: string },
  ): Promise<RetryGenerationResult> {
    const endAttach = this.gate.beginAttach(job.jobId);
    try {
      const attached = await this.publications.attachRetryJob(
        publicationId,
        ownerId,
        previousJobId,
        job.jobId,
      );
      if (!attached) {
        const current = await this.publications.findOwnedGeneration(publicationId, ownerId);
        if (current?.generationJobId !== job.jobId) {
          await this.cancelOrphanedJob(job.jobId);
          throw new ConflictException('Generation retry could not be attached');
        }
      }
      return { publicationId, jobId: job.jobId, status: job.status };
    } catch (error: unknown) {
      if (!(error instanceof ConflictException)) await this.cancelOrphanedJob(job.jobId);
      throw error;
    } finally {
      endAttach();
    }
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
      if (await this.publications.findByGenerationJobId(jobId)) return;
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
