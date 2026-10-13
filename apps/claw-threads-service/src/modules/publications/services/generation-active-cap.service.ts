import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';

import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import { codedErrorBody } from '../../../common/utilities/coded-error-body.utility';
import {
  ACTIVE_GENERATION_SCAN_LIMIT,
  MAX_ACTIVE_GENERATIONS_PER_OWNER,
} from '../constants/generation-concurrency.constants';
import { ACTIVE_GENERATION_JOB_STATUSES } from '../constants/publication-generation-owner.constants';
import { PublicationsRepository } from '../repositories/publications.repository';
import { ThreadsGenerationClient } from './threads-generation.client';

/** Refuses a new generation when the owner already has the maximum queued or running (ADR-176). */
@Injectable()
export class GenerationActiveCapService {
  constructor(
    private readonly publications: PublicationsRepository,
    private readonly generation: ThreadsGenerationClient,
  ) {}

  async assertBelowCap(ownerId: string): Promise<void> {
    const drafts = await this.publications.findDraftJobs(ownerId, ACTIVE_GENERATION_SCAN_LIMIT);
    // Only a draft can be running, so fewer drafts than the cap can never reach it.
    if (drafts.length < MAX_ACTIVE_GENERATIONS_PER_OWNER) return;
    const states = await Promise.all(drafts.map(({ jobId }) => this.statusOf(jobId, ownerId)));
    const active = states.filter(
      (status) => status !== null && ACTIVE_GENERATION_JOB_STATUSES.includes(status),
    ).length;
    if (active < MAX_ACTIVE_GENERATIONS_PER_OWNER) return;
    throw new HttpException(
      codedErrorBody(
        `You already have ${String(active)} Thread generations running. Wait for one to finish, or cancel one, then start again.`,
        ThreadGenerationErrorCode.TOO_MANY_ACTIVE,
        HttpStatus.TOO_MANY_REQUESTS,
        { limit: MAX_ACTIVE_GENERATIONS_PER_OWNER, active },
      ),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /** A job the generation service no longer has is not running. Any other failure is not guessed at. */
  private async statusOf(jobId: string, ownerId: string): Promise<string | null> {
    try {
      return (await this.generation.getPrivateState(jobId, ownerId)).status;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }
}
