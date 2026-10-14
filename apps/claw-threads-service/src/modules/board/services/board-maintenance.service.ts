import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { BOARD_MAINTENANCE_INTERVAL_MS } from '../constants/board.constants';
import { BoardMaintenanceRepository } from '../repositories/board-maintenance.repository';
import type { BoardMaintenanceCounts } from '../types/board.types';

/**
 * Keeps the Board's derived read structures fresh: the "did you mean" word dictionary and the stored
 * trending score. Runs shortly after boot and every couple of minutes; never throws, never overlaps itself,
 * and replicas take turns through an advisory lock in the repository.
 */
@Injectable()
export class BoardMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BoardMaintenanceService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(private readonly repository: BoardMaintenanceRepository) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.runOnce(), BOARD_MAINTENANCE_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass. Returns null when another pass, or another replica, already holds the turn. */
  async runOnce(): Promise<BoardMaintenanceCounts | null> {
    if (this.running) return null;
    this.running = true;
    try {
      const counts = await this.repository.refresh();
      if (counts && counts.wordsUpserted + counts.wordsRemoved + counts.trendingUpdated > 0) {
        this.logger.log(
          `Board maintenance: ${String(counts.wordsUpserted)} words upserted, ${String(counts.wordsRemoved)} removed, ${String(counts.trendingUpdated)} trending scores updated`,
        );
      }
      return counts;
    } catch {
      this.logger.warn('Board maintenance failed; it will run again');
      return null;
    } finally {
      this.running = false;
    }
  }
}
