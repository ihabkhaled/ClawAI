import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  SUGGESTION_PENDING_TTL_DAYS,
  SUGGESTION_LOOKBACK_DAYS,
} from '../constants/suggestion.constants';
import type { SuggestionGroupCount } from '../types/suggestion.types';
import type {
  AgentSuggestion,
  AgentSuggestionStatus,
  Prisma,
} from '../../../generated/prisma';

/**
 * V2 Stream 05 — repository for AgentSuggestion + scanning helper for
 * raw activity counts. Pure data access; AgentSuggestionManager owns
 * the business logic.
 */
@Injectable()
export class AgentSuggestionRepository {
  private readonly logger = new Logger(AgentSuggestionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertPending(
    userId: string,
    kind: string,
    data: Omit<Prisma.AgentSuggestionUncheckedCreateInput, 'userId' | 'kind' | 'status'>,
  ): Promise<AgentSuggestion> {
    this.logger.debug(`upsertPending: userId=${userId} kind=${kind}`);
    return this.prisma.agentSuggestion.upsert({
      where: {
        userId_kind_status: { userId, kind, status: 'PENDING' },
      },
      create: { ...data, userId, kind, status: 'PENDING' },
      update: {
        summary: data.summary,
        occurrencesLast7d: data.occurrencesLast7d,
        sourceActivityIds: data.sourceActivityIds,
        suggestedRecipeDsl: data.suggestedRecipeDsl,
      },
    });
  }

  async listForUser(
    userId: string,
    status: AgentSuggestionStatus | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ data: AgentSuggestion[]; total: number }> {
    const where: Prisma.AgentSuggestionWhereInput = {
      userId,
      ...(status === undefined ? {} : { status }),
    };
    const [data, total] = await Promise.all([
      this.prisma.agentSuggestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.agentSuggestion.count({ where }),
    ]);
    return { data, total };
  }

  async findByIdForUser(id: string, userId: string): Promise<AgentSuggestion | null> {
    return this.prisma.agentSuggestion.findFirst({ where: { id, userId } });
  }

  async setStatus(
    id: string,
    userId: string,
    status: AgentSuggestionStatus,
  ): Promise<AgentSuggestion> {
    this.logger.info(`setStatus: id=${id} userId=${userId} status=${status}`);
    return this.prisma.agentSuggestion.update({
      where: { id },
      data: { status, reviewedAt: new Date(), reviewedByUserId: userId },
    });
  }

  /**
   * Sweep PENDING rows older than SUGGESTION_PENDING_TTL_DAYS → EXPIRED.
   * Returns the number of rows updated.
   */
  async sweepExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - SUGGESTION_PENDING_TTL_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.prisma.agentSuggestion.updateMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      data: { status: 'EXPIRED', reviewedAt: new Date() },
    });
    this.logger.info(`sweepExpired: ${String(result.count)} PENDING → EXPIRED`);
    return result.count;
  }

  /**
   * Group activity_memory_entries by (userId, kind) over the rolling
   * SUGGESTION_LOOKBACK_DAYS window. Raw SQL — Prisma's groupBy can't
   * project a Json[] of sample ids cheaply.
   */
  async scanActivityGroups(): Promise<SuggestionGroupCount[]> {
    const cutoff = new Date(Date.now() - SUGGESTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    // ARRAY_AGG with LIMIT-style — Postgres lets us slice via a subquery.
    // We bound the sample to 50 ids per group server-side.
    const rows = (await this.prisma.$queryRaw`
      SELECT
        "userId",
        "kind",
        COUNT(*)::int AS occurrences,
        (ARRAY_AGG("id" ORDER BY "occurredAt" DESC))[1:50] AS sample_ids,
        (ARRAY_AGG("summary" ORDER BY "occurredAt" DESC))[1] AS latest_summary
      FROM "activity_memory_entries"
      WHERE "occurredAt" >= ${cutoff}
      GROUP BY "userId", "kind"
      HAVING COUNT(*) >= 1
    `) as Array<{
      userId: string;
      kind: string;
      occurrences: number;
      sample_ids: string[];
      latest_summary: string;
    }>;
    return rows.map((r) => ({
      userId: r.userId,
      kind: r.kind,
      occurrences: r.occurrences,
      sampleIds: r.sample_ids,
      latestSummary: r.latest_summary,
    }));
  }
}
