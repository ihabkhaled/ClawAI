import { Injectable, Logger } from '@nestjs/common';

import {
  THREAD_MEMORY_MAX_SOURCES,
  THREAD_MEMORY_WINDOW_MS,
} from '../../../common/constants/research-engine.constants';
import { describeFetchFailure } from '../../../common/utilities/describe-fetch-failure.utility';
import { ResearchSourceRepository } from '../repositories/research-source.repository';
import { toResearchSourceRows } from '../utilities/research-source-rows.utility';
import type { ResearchSource } from '../../../generated/prisma';
import type { PersistSourcesInput } from '../types/research-engine.types';

/**
 * The evidence store (research engine B1): one `research_sources` row per
 * bundle item of every completed run, and this thread's recent rows back as
 * thread memory. Neither side can fail a run: a write is fire-and-forget and
 * a failed read is an empty memory, both logged.
 */
@Injectable()
export class ResearchEvidenceStoreService {
  private readonly logger = new Logger(ResearchEvidenceStoreService.name);

  constructor(private readonly sources: ResearchSourceRepository) {}

  /** Starts the write and returns at once; the run never waits for it. */
  persistInBackground(input: PersistSourcesInput): void {
    void this.persist(input);
  }

  /** Never rejects. Resolves with the rows written (0 on failure or nothing to write). */
  async persist(input: PersistSourcesInput): Promise<number> {
    const rows = toResearchSourceRows(input);
    if (rows.length === 0) {
      return 0;
    }
    try {
      return await this.sources.createMany(rows);
    } catch (error) {
      this.logger.warn(
        `research.sources.persist_failed run=${input.runId} rows=${String(rows.length)}: ${describeFetchFailure(error)}`,
      );
      return 0;
    }
  }

  /** This user's sources for this thread in the last 24 h (cap 50), newest first. Never rejects. */
  async loadThreadSources(userId: string, threadId: string, now: Date): Promise<ResearchSource[]> {
    try {
      return await this.sources.findRecentByThread(
        userId,
        threadId,
        new Date(now.getTime() - THREAD_MEMORY_WINDOW_MS),
        THREAD_MEMORY_MAX_SOURCES,
      );
    } catch (error) {
      this.logger.warn(`research.thread_memory.load_failed: ${describeFetchFailure(error)}`);
      return [];
    }
  }
}
