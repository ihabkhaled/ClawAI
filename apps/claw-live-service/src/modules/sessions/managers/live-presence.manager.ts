import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { LIVE_REDIS_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import {
  LIVE_ACCRUAL_CAS_ATTEMPTS,
  LIVE_ACCRUAL_CAS_SCRIPT,
  LIVE_ACCRUAL_KEY_PREFIX,
  LIVE_ACCRUAL_TTL_MS,
  LIVE_HOURLY_KEY_PREFIX,
  LIVE_HOURLY_TTL_SECONDS,
  LIVE_PRESENCE_KEY_PREFIX,
  LIVE_PRESENCE_TTL_SECONDS,
} from '../constants/live-session.constants';
import { computeAccrual } from '../utilities/live-accrual.utility';

/** Redis state of viewing: presence ZSETs, the (user, run) accrual mark, the hourly start counter. */
@Injectable()
export class LivePresenceManager {
  constructor(@Inject(LIVE_REDIS_CLIENT) private readonly redis: Redis) {}

  async touch(runId: string, sessionId: string, now: number): Promise<void> {
    const key = `${LIVE_PRESENCE_KEY_PREFIX}${runId}`;
    await this.redis.zadd(key, now, sessionId);
    await this.redis.expire(key, LIVE_PRESENCE_TTL_SECONDS);
  }

  async remove(runId: string, sessionId: string): Promise<void> {
    await this.redis.zrem(`${LIVE_PRESENCE_KEY_PREFIX}${runId}`, sessionId);
  }

  /** Counts one session start in the current clock hour; returns the count including it. */
  async countHourlyStart(userId: string, now: number): Promise<number> {
    const hour = Math.floor(now / 3_600_000);
    const key = `${LIVE_HOURLY_KEY_PREFIX}${userId}:${String(hour)}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, LIVE_HOURLY_TTL_SECONDS);
    return count;
  }

  /**
   * Seconds this heartbeat accrues for (user, run), deduplicated across devices
   * with a compare-and-set on the shared mark. A lost race re-reads and
   * recomputes, so two devices can never both claim the same wall time.
   */
  async accrue(
    userId: string,
    runId: string,
    lastHeartbeatAt: number | null,
    now: number,
  ): Promise<number> {
    const key = `${LIVE_ACCRUAL_KEY_PREFIX}${userId}:${runId}`;
    for (let attempt = 0; attempt < LIVE_ACCRUAL_CAS_ATTEMPTS; attempt += 1) {
      const raw = await this.redis.get(key);
      const parsed = raw === null ? null : Number(raw);
      const accruedUntil = parsed !== null && Number.isFinite(parsed) ? parsed : null;
      const result = computeAccrual({ now, lastHeartbeatAt, accruedUntil });
      if (result.nextAccruedUntil === null || result.seconds === 0) return 0;
      const swapped = await this.redis.eval(
        LIVE_ACCRUAL_CAS_SCRIPT,
        1,
        key,
        raw ?? '',
        String(result.nextAccruedUntil),
        LIVE_ACCRUAL_TTL_MS,
      );
      if (swapped === 1) return result.seconds;
    }
    return 0;
  }
}
