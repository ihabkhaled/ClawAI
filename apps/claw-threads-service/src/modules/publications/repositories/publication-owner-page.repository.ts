import { Injectable } from '@nestjs/common';

import { Prisma, PublicationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { OWNER_LIST_REVISION_WINDOW } from '../constants/publication-owner-list.constants';
import { PUBLISHABLE_REVISION_WHERE } from '../constants/publication-publish.constants';
import { UNTITLED_PUBLICATION_TITLE } from '../constants/publication-title.constants';
import type {
  GenerationStateUpdate,
  OwnerPageFilter,
  OwnerPageItem,
  UnresolvedGeneration,
} from '../types/owner-publication-page.types';
import {
  canOwnerDelete,
  canOwnerPublish,
  deriveOwnerPageFailure,
  deriveOwnerPageStatus,
} from '../utilities/owner-page-status.utility';
import {
  buildOwnerPageCountQuery,
  buildOwnerPageIdsQuery,
} from '../utilities/owner-page-sql.utility';
import { pickOwnerListTitle } from '../utilities/owner-list-title.utility';
import {
  isPlaceholderTitle,
  resolvePublicationTitle,
} from '../utilities/publication-readable-title.utility';

/** Reads for `GET thread-publications/mine/page` (ADR-205). Every query is scoped to the owner. */
@Injectable()
export class PublicationOwnerPageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The ids of one page and the total, from two SQL queries over the same filter. */
  async findPageIds(
    filter: OwnerPageFilter,
    limit: number,
    offset: number,
  ): Promise<{ ids: string[]; total: number }> {
    const [rows, counts] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string }>>(buildOwnerPageIdsQuery(filter, limit, offset)),
      this.prisma.$queryRaw<Array<{ total: number }>>(buildOwnerPageCountQuery(filter)),
    ]);
    return { ids: rows.map((row) => row.id), total: counts[0]?.total ?? 0 };
  }

  /**
   * The rows of a page, in the order of `ids`, with title, state and the publish/delete answers.
   * Three queries for the whole page (rows with a revision window, publishable revisions,
   * placeholder titles), never one per row.
   */
  async hydrate(ownerId: string, ids: readonly string[]): Promise<OwnerPageItem[]> {
    if (ids.length === 0) return [];
    const [rows, publishable] = await Promise.all([
      this.prisma.threadPublication.findMany({
        where: { id: { in: [...ids] }, ownerId },
        select: {
          id: true,
          status: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          generationJobId: true,
          generationState: true,
          generationFailureCode: true,
          generationFailureStep: true,
          generationFailureRetryable: true,
          revisions: {
            orderBy: { revision: 'desc' },
            take: OWNER_LIST_REVISION_WINDOW,
            select: { title: true, reviewStatus: true, safetyStatus: true, indexEligible: true },
          },
        },
      }),
      this.prisma.threadPublicationRevision.findMany({
        where: { publicationId: { in: [...ids] }, ...PUBLISHABLE_REVISION_WHERE },
        distinct: ['publicationId'],
        select: { publicationId: true },
      }),
    ]);
    const hasPublishable = new Set(publishable.map((row) => row.publicationId));
    const derived = await this.derivedTitles(
      rows.flatMap((row) => {
        const { title } = pickOwnerListTitle(row.revisions);
        return title !== null && isPlaceholderTitle(title) ? [row.id] : [];
      }),
    );
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      const shown = pickOwnerListTitle(row.revisions).title;
      return [
        {
          id: row.id,
          title: derived.get(row.id) ?? shown,
          // Only a live article has a public link; a draft's slug is not an address anyone can open.
          slug: row.status === PublicationStatus.PUBLISHED ? row.slug : null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          status: deriveOwnerPageStatus(row),
          publishedAt: row.publishedAt,
          failure: deriveOwnerPageFailure({
            status: row.status,
            generationState: row.generationState,
            generationFailureCode: row.generationFailureCode,
            generationFailureStep: row.generationFailureStep,
            generationFailureRetryable: row.generationFailureRetryable,
          }),
          canPublish: canOwnerPublish(row.status, hasPublishable.has(row.id)),
          canDelete: canOwnerDelete(row, row.generationJobId !== null),
          publicationStatus: row.status,
        },
      ];
    });
  }

  /** Rows still showing the placeholder title get the title derived from their article. */
  private async derivedTitles(ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.threadPublicationRevision.findMany({
      where: { publicationId: { in: [...ids] }, title: UNTITLED_PUBLICATION_TITLE },
      orderBy: { revision: 'desc' },
      distinct: ['publicationId'],
      select: { publicationId: true, title: true, content: true },
    });
    return new Map(
      rows.map((row) => [row.publicationId, resolvePublicationTitle(row.title, row.content)]),
    );
  }

  /**
   * The owner's DRAFTs whose job state is unknown, or still GENERATING and last read before
   * `staleBefore`. Bounded by `limit`; oldest check first so every row is reached.
   */
  findUnresolved(
    ownerId: string,
    staleBefore: Date,
    limit: number,
  ): Promise<UnresolvedGeneration[]> {
    return this.prisma.$queryRaw<UnresolvedGeneration[]>(Prisma.sql`
      SELECT p."id" AS "id", p."generation_job_id" AS "generationJobId"
      FROM "thread_publications" p
      WHERE p."owner_id" = ${ownerId}
        AND p."status" = 'DRAFT'
        AND p."generation_job_id" IS NOT NULL
        AND (
          p."generation_state" IS NULL
          OR (
            p."generation_state" = 'GENERATING'
            AND (p."generation_state_checked_at" IS NULL OR p."generation_state_checked_at" < ${staleBefore})
          )
        )
      ORDER BY p."generation_state_checked_at" ASC NULLS FIRST, p."created_at" DESC
      LIMIT ${limit}`);
  }

  /**
   * Stores what the job really is. Guarded by the job id, so a retry that re-pointed the
   * publication meanwhile is not overwritten by the read of the old job. Raw SQL on purpose: this
   * is bookkeeping and must not move `updated_at`, which the owner sees.
   */
  async recordState(
    publicationId: string,
    jobId: string,
    update: GenerationStateUpdate,
  ): Promise<boolean> {
    const changed = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "thread_publications"
      SET "generation_state" = ${update.state}::"PublicationGenerationState",
          "generation_failure_code" = ${update.failureCode},
          "generation_failure_step" = ${update.failureStep},
          "generation_failure_retryable" = ${update.failureRetryable},
          "generation_state_checked_at" = NOW()
      WHERE "id" = ${publicationId}
        AND "generation_job_id" = ${jobId}
        AND "status" = 'DRAFT'`);
    return changed === 1;
  }
}
