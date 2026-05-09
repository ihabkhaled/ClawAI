import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { SUGGESTION_FACTORY_RATE_LIMITER_WINDOW_MS } from '../constants/suggestion-trigger-rules.constants';

/**
 * Stream 13.3 — per-event-type budget cap.
 *
 * In-memory sliding-window counter, keyed by either `eventType` (global cap
 * via `WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR`) or `ruleId` (v1.1 per-rule
 * cap via `SuggestionTriggerRule.perRuleBudgetPerHour`). A counter is
 * per-process — acceptable for v1.x because the factory only runs in one
 * process for now.
 */
@Injectable()
export class SuggestionFactoryRateLimiterManager {
  private readonly logger = new Logger(SuggestionFactoryRateLimiterManager.name);
  private readonly buckets = new Map<string, number[]>();

  tryReserve(eventType: string): boolean {
    const cap = AppConfig.get().WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR;
    return this.tryReserveBucket(`event:${eventType}`, cap);
  }

  /**
   * Stream 13.3 v1.1 — per-rule cap. Called per matched rule when
   * `SuggestionTriggerRule.perRuleBudgetPerHour` is set. Caller should skip
   * this check when the column is null (unbounded).
   */
  tryReserveForRule(ruleId: string, cap: number): boolean {
    return this.tryReserveBucket(`rule:${ruleId}`, cap);
  }

  private tryReserveBucket(key: string, cap: number): boolean {
    const now = Date.now();
    const cutoff = now - SUGGESTION_FACTORY_RATE_LIMITER_WINDOW_MS;
    const existing = this.buckets.get(key) ?? [];
    const fresh = existing.filter((ts) => ts > cutoff);
    if (fresh.length >= cap) {
      this.logger.debug(
        `tryReserve: bucket=${key} cap=${String(cap)} fresh=${String(fresh.length)} → BLOCKED`,
      );
      this.buckets.set(key, fresh);
      return false;
    }
    fresh.push(now);
    this.buckets.set(key, fresh);
    return true;
  }

  reset(): void {
    this.buckets.clear();
  }
}
