import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PublicationGenerationState } from '../../../generated/prisma';
import {
  OWNER_PAGE_CODE_JOB_CANCELLED,
  OWNER_PAGE_CODE_JOB_MISSING,
  OWNER_PAGE_NO_FAILURE,
  OWNER_PAGE_RECONCILE_CONCURRENCY,
  OWNER_PAGE_RECONCILE_LIMIT,
  OWNER_PAGE_RECONCILE_TIMEOUT_MS,
  OWNER_PAGE_STATE_STALE_MS,
} from '../constants/publication-owner-page.constants';
import type { ListOwnedPublicationsQuery } from '../dto/list-owned-publications-query.dto';
import { PublicationOwnerPageRepository } from '../repositories/publication-owner-page.repository';
import { PublicationsRepository } from '../repositories/publications.repository';
import type {
  GenerationStateUpdate,
  OwnerPageResult,
  UnresolvedGeneration,
} from '../types/owner-publication-page.types';
import { failureUpdate } from '../utilities/owner-page-status.utility';
import { ThreadsGenerationClient } from './threads-generation.client';

/** `GET thread-publications/mine/page`: the owner's paged, searchable, status-filtered list (ADR-205). */
@Injectable()
export class PublicationOwnerListService {
  private readonly logger = new Logger(PublicationOwnerListService.name);

  constructor(
    private readonly pages: PublicationOwnerPageRepository,
    private readonly publications: PublicationsRepository,
    private readonly generation: ThreadsGenerationClient,
  ) {}

  async list(ownerId: string, query: ListOwnedPublicationsQuery): Promise<OwnerPageResult> {
    await this.reconcile(ownerId);
    const { page, pageSize } = query;
    const { ids, total } = await this.pages.findPageIds(
      { ownerId, q: query.q, status: query.status },
      pageSize,
      (page - 1) * pageSize,
    );
    const items = await this.pages.hydrate(ownerId, ids);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Reads the jobs whose state is unknown or may have changed and stores the answer, so the SQL
   * filter sees it. Bounded (rows, concurrency, time) and never fatal: if the generation service
   * is down the rows keep reporting GENERATING and the list still answers.
   */
  private async reconcile(ownerId: string): Promise<void> {
    const staleBefore = new Date(Date.now() - OWNER_PAGE_STATE_STALE_MS);
    let pending: UnresolvedGeneration[];
    try {
      pending = await this.pages.findUnresolved(ownerId, staleBefore, OWNER_PAGE_RECONCILE_LIMIT);
    } catch {
      this.logger.warn('Owner list could not look for unread generation states');
      return;
    }
    for (let start = 0; start < pending.length; start += OWNER_PAGE_RECONCILE_CONCURRENCY) {
      const batch = pending.slice(start, start + OWNER_PAGE_RECONCILE_CONCURRENCY);
      await Promise.all(batch.map((row) => this.reconcileOne(ownerId, row)));
    }
  }

  private async reconcileOne(ownerId: string, row: UnresolvedGeneration): Promise<void> {
    try {
      const update = await this.readState(ownerId, row);
      if (update) await this.pages.recordState(row.id, row.generationJobId, update);
    } catch {
      // The row stays as it was and is read again on the next list; no job text is logged.
      this.logger.warn('Owner list could not read a generation state');
    }
  }

  private async readState(
    ownerId: string,
    row: UnresolvedGeneration,
  ): Promise<GenerationStateUpdate | null> {
    let state;
    try {
      state = await this.withinBudget(
        this.generation.getPrivateState(row.generationJobId, ownerId),
      );
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      return failureUpdate(
        PublicationGenerationState.FAILED,
        OWNER_PAGE_CODE_JOB_MISSING,
        null,
        false,
      );
    }
    switch (state.status) {
      case 'QUEUED':
      case 'RUNNING':
        return { state: PublicationGenerationState.GENERATING, ...OWNER_PAGE_NO_FAILURE };
      case 'WAITING_FOR_REVIEW':
      case 'COMPLETED':
        // The draft is stored when its state is read; do it here, as the publish path does, so
        // READY means the owner can really open and publish it.
        if (state.draft) await this.publications.savePrivateDraft(row.id, state.draft);
        return { state: PublicationGenerationState.DONE, ...OWNER_PAGE_NO_FAILURE };
      case 'CANCELLED':
        return failureUpdate(
          PublicationGenerationState.CANCELLED,
          OWNER_PAGE_CODE_JOB_CANCELLED,
          state.stage,
          true,
        );
      case 'FAILED':
        return this.failedState(ownerId, row, state.safeErrorCode, state.stage);
      default:
        return null;
    }
  }

  /** The failure's own code, step and retryable flag come from the progress snapshot. */
  private async failedState(
    ownerId: string,
    row: UnresolvedGeneration,
    safeErrorCode: string | null,
    stage: string,
  ): Promise<GenerationStateUpdate> {
    try {
      const progress = await this.withinBudget(
        this.generation.getProgress(row.generationJobId, ownerId),
      );
      if (progress.failure) {
        return failureUpdate(
          PublicationGenerationState.FAILED,
          progress.failure.code,
          progress.failure.failedStage,
          progress.failure.retryable,
        );
      }
    } catch {
      // Fall back to what the state read already gave.
    }
    return failureUpdate(PublicationGenerationState.FAILED, safeErrorCode, stage, true);
  }

  private withinBudget<T>(read: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error('generation read timed out'));
      }, OWNER_PAGE_RECONCILE_TIMEOUT_MS);
    });
    return Promise.race([read, timeout]).finally(() => {
      clearTimeout(timer);
    });
  }
}
