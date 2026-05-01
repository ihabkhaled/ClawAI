import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  DIGEST_DAILY_LOOKBACK_HOURS,
  DIGEST_DEFAULT_MODEL,
  DIGEST_MAX_OBJECTS_PER_PROVIDER,
  DIGEST_MAX_OBJECTS_PER_WEEKLY_PROVIDER,
  DIGEST_WEEKLY_LOOKBACK_HOURS,
} from '../constants/digest.constants';
import { DigestRepository } from '../repositories/digest.repository';
import type { DigestSection } from '../types/digest.types';
import type { DigestScope, DigestSnapshot, Prisma } from '../../../generated/prisma';

@Injectable()
export class DigestBuilderManager {
  private readonly logger = new Logger(DigestBuilderManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: DigestRepository,
  ) {}

  /**
   * Build a digest snapshot for one user. v1 uses a deterministic aggregation
   * (counts + top titles per provider) and reserves the LLM-rewrite slot for
   * v1.x. The structured payload is the same so the frontend renders identically.
   */
  async build(input: {
    userId: string;
    scope: DigestScope;
    snapshotDate: Date;
  }): Promise<DigestSnapshot> {
    const start = Date.now();
    this.logger.debug(
      `build: userId=${input.userId} scope=${input.scope} date=${input.snapshotDate.toISOString()}`,
    );
    try {
      const sections = await this.buildSections(input.userId, input.scope, input.snapshotDate);
      return await this.repo.upsert({
        userId: input.userId,
        scope: input.scope,
        snapshotDate: input.snapshotDate,
        sections: JSON.parse(JSON.stringify(sections)) as Prisma.InputJsonValue,
        actionItemSuggestionIds: [],
        modelUsed: DIGEST_DEFAULT_MODEL,
        durationMs: Date.now() - start,
        errorMessage: null,
      });
    } catch (error) {
      this.logger.error(
        `build: failed userId=${input.userId} scope=${input.scope} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return this.repo.upsert({
        userId: input.userId,
        scope: input.scope,
        snapshotDate: input.snapshotDate,
        sections: [],
        actionItemSuggestionIds: [],
        modelUsed: DIGEST_DEFAULT_MODEL,
        durationMs: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  private async buildSections(
    userId: string,
    scope: DigestScope,
    snapshotDate: Date,
  ): Promise<DigestSection[]> {
    const lookbackHours = scope === 'WEEKLY' ? DIGEST_WEEKLY_LOOKBACK_HOURS : DIGEST_DAILY_LOOKBACK_HOURS;
    const cap = scope === 'WEEKLY' ? DIGEST_MAX_OBJECTS_PER_WEEKLY_PROVIDER : DIGEST_MAX_OBJECTS_PER_PROVIDER;
    const since = new Date(snapshotDate.getTime() - lookbackHours * 3_600_000);
    const grouped = await this.prisma.workspaceObject.groupBy({
      by: ['provider'],
      where: { userId, externalUpdatedAt: { gte: since, lte: snapshotDate } },
      _count: { id: true },
    });
    const sections: DigestSection[] = [];
    for (const row of grouped) {
      const recent = await this.prisma.workspaceObject.findMany({
        where: { userId, provider: row.provider, externalUpdatedAt: { gte: since, lte: snapshotDate } },
        orderBy: { externalUpdatedAt: 'desc' },
        take: cap,
        select: { id: true, title: true, externalUpdatedAt: true },
      });
      sections.push({
        provider: row.provider,
        summary: `${String(row._count.id)} item${row._count.id === 1 ? '' : 's'} updated in the last ${String(lookbackHours)}h.`,
        highlights: recent.slice(0, 3).map((r) => r.title),
        actionItems: [],
      });
    }
    return sections;
  }
}
