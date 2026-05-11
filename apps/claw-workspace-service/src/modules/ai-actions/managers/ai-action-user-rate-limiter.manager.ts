import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';

/**
 * v3 round 2 (2026-05-12) — Prompt 12 polish: per-user burst protection
 * on the AI-action approval queue entry.
 *
 * Two sliding-window counters per user:
 *   - minute window: catches runaway-bot or stuck-loop bursts
 *   - hour window:   catches sustained mis-use that slips past per-minute
 *
 * Existing `AutomationPreference.perDayBudget` already enforces a per-user
 * per-action-kind daily ceiling, but it's a daily check — a stuck loop can
 * blow through 1000 actions in 60s without hitting that. This limiter is
 * the burst floor underneath the daily budget.
 *
 * In-memory + per-process for v1; acceptable because workspace-service runs
 * single-replica. Multi-replica → Redis. Buckets self-prune to bounded memory.
 *
 * Caller contract: call `tryReserve(userId)` BEFORE doing any DB write
 * or model call. Returns `{ allowed: false, reason: 'PER_MINUTE'|'PER_HOUR' }`
 * when the user is over either cap.
 */
@Injectable()
export class AiActionUserRateLimiterManager {
  private readonly logger = new Logger(AiActionUserRateLimiterManager.name);
  private readonly minuteBuckets = new Map<string, number[]>();
  private readonly hourBuckets = new Map<string, number[]>();

  // Lazy janitor: every N reservations, drop empty buckets so a workspace
  // with N idle users doesn't accumulate empty arrays forever.
  private opCount = 0;
  private static readonly JANITOR_EVERY_OPS = 500;

  tryReserve(userId: string): { allowed: true } | { allowed: false; reason: string } {
    const cfg = AppConfig.get();
    const perMinCap = cfg.AI_ACTION_PER_USER_RATE_PER_MIN;
    const perHourCap = cfg.AI_ACTION_PER_USER_RATE_PER_HOUR;
    const now = Date.now();
    const minuteWindow = now - 60 * 1000;
    const hourWindow = now - 60 * 60 * 1000;

    const minuteFresh = (this.minuteBuckets.get(userId) ?? []).filter((ts) => ts > minuteWindow);
    if (minuteFresh.length >= perMinCap) {
      this.minuteBuckets.set(userId, minuteFresh);
      this.logger.debug(
        `tryReserve: user=${userId} per-min ${String(minuteFresh.length)} >= ${String(perMinCap)} → BLOCKED`,
      );
      return { allowed: false, reason: 'PER_MINUTE' };
    }

    const hourFresh = (this.hourBuckets.get(userId) ?? []).filter((ts) => ts > hourWindow);
    if (hourFresh.length >= perHourCap) {
      this.hourBuckets.set(userId, hourFresh);
      this.logger.debug(
        `tryReserve: user=${userId} per-hour ${String(hourFresh.length)} >= ${String(perHourCap)} → BLOCKED`,
      );
      return { allowed: false, reason: 'PER_HOUR' };
    }

    minuteFresh.push(now);
    hourFresh.push(now);
    this.minuteBuckets.set(userId, minuteFresh);
    this.hourBuckets.set(userId, hourFresh);
    this.opCount += 1;
    if (this.opCount >= AiActionUserRateLimiterManager.JANITOR_EVERY_OPS) {
      this.prune(now);
      this.opCount = 0;
    }
    return { allowed: true };
  }

  // Test seam — drop everything (useful in unit tests).
  reset(): void {
    this.minuteBuckets.clear();
    this.hourBuckets.clear();
    this.opCount = 0;
  }

  private prune(now: number): void {
    const hourWindow = now - 60 * 60 * 1000;
    for (const [k, arr] of this.minuteBuckets) {
      const fresh = arr.filter((ts) => ts > now - 60 * 1000);
      if (fresh.length === 0) this.minuteBuckets.delete(k);
      else this.minuteBuckets.set(k, fresh);
    }
    for (const [k, arr] of this.hourBuckets) {
      const fresh = arr.filter((ts) => ts > hourWindow);
      if (fresh.length === 0) this.hourBuckets.delete(k);
      else this.hourBuckets.set(k, fresh);
    }
  }
}
