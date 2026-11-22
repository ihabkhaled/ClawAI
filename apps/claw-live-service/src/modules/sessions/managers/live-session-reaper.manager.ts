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
import {
  LIVE_LOCK_RELEASE_SCRIPT,
  LIVE_PRESENCE_STALE_MS,
  LIVE_REAPER_BATCH,
  LIVE_REAPER_INTERVAL_MS,
  LIVE_REAPER_LOCK_KEY,
  LIVE_REAPER_LOCK_TTL_MS,
} from '../constants/live-session.constants';
import { LiveSessionRepository } from '../repositories/live-session.repository';
import { LiveSessionDetachManager } from './live-session-detach.manager';

/**
 * Network-loss detach (architecture doc section 3): every 5 s, one replica
 * (Redis lock with an owner token) detaches sessions whose last heartbeat is
 * older than 30 s — settling their partial block and telling the coordinator.
 * The DB `lastHeartbeatAt` mirrors the presence ZSET score and is what the
 * sweep queries, so it needs no scan over every run's ZSET.
 */
@Injectable()
export class LiveSessionReaperManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveSessionReaperManager.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly sessions: LiveSessionRepository,
    private readonly detacher: LiveSessionDetachManager,
    @Inject(LIVE_REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, LIVE_REAPER_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  /** One sweep; overlapping ticks and other replicas are excluded. Returns sessions detached. */
  async tick(now = Date.now()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    const token = randomUUID();
    try {
      const locked = await this.redis.set(
        LIVE_REAPER_LOCK_KEY,
        token,
        'PX',
        LIVE_REAPER_LOCK_TTL_MS,
        'NX',
      );
      if (locked !== 'OK') return 0;
      try {
        return await this.sweep(now);
      } finally {
        await this.redis.eval(LIVE_LOCK_RELEASE_SCRIPT, 1, LIVE_REAPER_LOCK_KEY, token);
      }
    } catch (error: unknown) {
      this.logger.warn(
        `reaper tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    } finally {
      this.running = false;
    }
  }

  private async sweep(now: number): Promise<number> {
    const stale = await this.sessions.findStale(
      new Date(now - LIVE_PRESENCE_STALE_MS),
      LIVE_REAPER_BATCH,
    );
    let detached = 0;
    for (const session of stale) {
      try {
        if (await this.detacher.detach(session, 'NETWORK_LOSS')) detached += 1;
      } catch (error: unknown) {
        this.logger.warn(
          `reaper detach failed sessionId=${session.id} error=${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return detached;
  }
}
