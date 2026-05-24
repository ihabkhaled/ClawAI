import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import {
  SUGGESTION_MIN_OCCURRENCES,
  SUGGESTION_SCAN_CRON,
} from '../constants/suggestion.constants';
import { AgentSuggestionRepository } from '../repositories/agent-suggestion.repository';
import type { Prisma } from '../../../generated/prisma';

/**
 * V2 Stream 05 — AgentSuggestionManager.
 *
 * Cron-driven scan that groups recent activity_memory_entries by
 * (userId, kind), upserts an AgentSuggestion row when the per-group
 * count crosses SUGGESTION_MIN_OCCURRENCES, and sweeps stale PENDING
 * suggestions to EXPIRED.
 *
 * Designed to be safe under multi-replica deploys: upsert keys on
 * (userId, kind, status='PENDING'), so two replicas racing produce the
 * same row.
 */
@Injectable()
export class AgentSuggestionManager {
  private readonly logger = new Logger(AgentSuggestionManager.name);

  constructor(private readonly repo: AgentSuggestionRepository) {}

  @Cron(SUGGESTION_SCAN_CRON, { name: 'agent-suggestion-scan' })
  async scanAndEmit(): Promise<void> {
    this.logger.debug('scanAndEmit: starting');
    try {
      const groups = await this.repo.scanActivityGroups();
      const eligible = groups.filter((g) => g.occurrences >= SUGGESTION_MIN_OCCURRENCES);
      this.logger.info(
        `scanAndEmit: groups=${String(groups.length)} eligible=${String(eligible.length)}`,
      );
      for (const group of eligible) {
        try {
          await this.repo.upsertPending(group.userId, group.kind, {
            summary: this.makeSummary(group.kind, group.latestSummary, group.occurrences),
            occurrencesLast7d: group.occurrences,
            sourceActivityIds: group.sampleIds as unknown as Prisma.InputJsonValue,
            suggestedRecipeDsl: null,
          });
        } catch (err) {
          this.logger.error(
            `scanAndEmit: upsert failed for userId=${group.userId} kind=${group.kind} — ${(err as Error).message}`,
          );
        }
      }
      const swept = await this.repo.sweepExpired();
      if (swept > 0) {
        this.logger.info(`scanAndEmit: ${String(swept)} stale PENDING expired`);
      }
    } catch (err) {
      this.logger.error(`scanAndEmit: failed — ${(err as Error).message}`);
    }
  }

  private makeSummary(kind: string, latestSummary: string, count: number): string {
    const trimmed = latestSummary.length > 120 ? `${latestSummary.slice(0, 117)}...` : latestSummary;
    return `You've performed "${kind}" ${String(count)} times this week (last: ${trimmed}). Want to bundle this into a recipe?`;
  }
}
