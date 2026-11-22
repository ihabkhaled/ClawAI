import { randomUUID } from 'node:crypto';

import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type Redis from 'ioredis';

import { LIVE_REDIS_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import { LIVE_LOCK_RELEASE_SCRIPT } from '../../sessions/constants/live-session.constants';
import {
  ORPHAN_SWEEP_BATCH,
  ORPHAN_SWEEP_INTERVAL_MS,
  ORPHAN_SWEEP_LOCK_KEY,
  ORPHAN_SWEEP_LOCK_TTL_MS,
} from '../constants/deletion.constants';
import { DeletionService } from './deletion.service';

/** Periodically tombstones finished runs that nothing references (one replica at a time). */
@Injectable()
export class OrphanRunSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrphanRunSweeperService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly deletion: DeletionService,
    @Inject(LIVE_REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, ORPHAN_SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    const token = randomUUID();
    try {
      const locked = await this.redis.set(
        ORPHAN_SWEEP_LOCK_KEY,
        token,
        'PX',
        ORPHAN_SWEEP_LOCK_TTL_MS,
        'NX',
      );
      if (locked !== 'OK') return 0;
      try {
        const swept = await this.deletion.sweepOrphanRuns(ORPHAN_SWEEP_BATCH);
        if (swept > 0) this.logger.log(`orphan sweep tombstoned ${String(swept)} run(s)`);
        return swept;
      } finally {
        await this.redis.eval(LIVE_LOCK_RELEASE_SCRIPT, 1, ORPHAN_SWEEP_LOCK_KEY, token);
      }
    } catch (error: unknown) {
      this.logger.warn(
        `orphan sweep failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    } finally {
      this.running = false;
    }
  }
}
