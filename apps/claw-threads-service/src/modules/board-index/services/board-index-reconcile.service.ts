import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import {
  BOARD_RECONCILE_BATCH_SIZE,
  BOARD_RECONCILE_INTERVAL_MS,
  BOARD_RECONCILE_START_CURSOR,
  BOARD_STALE_DOC_AGE_MS,
} from '../constants/board-index.constants';
import { BoardIndexRepository } from '../repositories/board-index.repository';
import type {
  BoardIndexStore,
  BoardIndexSyncer,
  BoardReconcileCursor,
  BoardReconcileResult,
} from '../types/board-index.types';
import { BoardIndexService } from './board-index.service';

/**
 * Safety net for the push-style sync: every minute it indexes visible publications changed since the
 * last run, refreshes the oldest stale rows (so counters never drift) and removes rows whose
 * publication stopped being visible. Idempotent, bounded to one batch per step per tick.
 */
@Injectable()
export class BoardIndexReconcileService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BoardIndexReconcileService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  private cursor: BoardReconcileCursor = BOARD_RECONCILE_START_CURSOR;

  constructor(
    @Inject(BoardIndexRepository) private readonly repository: BoardIndexStore,
    @Inject(BoardIndexService) private readonly index: BoardIndexSyncer,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.runOnce(), BOARD_RECONCILE_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One bounded pass; never throws and never overlaps itself. */
  async runOnce(): Promise<BoardReconcileResult> {
    const result: BoardReconcileResult = { upserted: 0, removed: 0 };
    if (this.running) return result;
    this.running = true;
    try {
      const changed = await this.repository.findChangedSince(
        this.cursor,
        BOARD_RECONCILE_BATCH_SIZE,
      );
      for (const publication of changed) {
        if (await this.index.syncPublication(publication.id)) result.upserted += 1;
        this.cursor = { updatedAt: publication.updatedAt, id: publication.id };
      }
      const stale = await this.repository.findStaleDocIds(
        new Date(Date.now() - BOARD_STALE_DOC_AGE_MS),
        BOARD_RECONCILE_BATCH_SIZE,
      );
      for (const id of stale) {
        if (await this.index.syncPublication(id)) result.upserted += 1;
        else result.removed += 1;
      }
      const invisible = await this.repository.findInvisibleDocIds(BOARD_RECONCILE_BATCH_SIZE);
      for (const id of invisible) {
        await this.index.removePublication(id);
        result.removed += 1;
      }
      if (result.upserted + result.removed > 0) {
        this.logger.log(
          `Board index reconciled: ${String(result.upserted)} upserted, ${String(result.removed)} removed`,
        );
      }
    } catch {
      this.logger.warn('Board index reconcile failed; it will run again');
    } finally {
      this.running = false;
    }
    return result;
  }

  /** One-off backfill: restarts from the beginning and runs passes until no new publication is found. */
  async backfill(): Promise<BoardReconcileResult> {
    const total: BoardReconcileResult = { upserted: 0, removed: 0 };
    this.cursor = BOARD_RECONCILE_START_CURSOR;
    for (;;) {
      const before = this.cursor;
      const pass = await this.runOnce();
      total.upserted += pass.upserted;
      total.removed += pass.removed;
      if (this.cursor === before) return total;
    }
  }
}
