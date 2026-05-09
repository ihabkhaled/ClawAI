import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { WEBHOOK_RATE_LIMITER_WINDOW_MS } from '../constants/webhook-receiver.constants';

/**
 * Stream 11.4 — per-connector webhook rate limit.
 *
 * In-memory sliding-window counter keyed by `connectorId` (or `provider` for
 * deliveries that arrive without a connectorId). Cap is configurable via
 * `WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE` (default 60/min). When the cap
 * is hit, the receiver returns RATE_LIMITED and persists the rejection so it
 * shows up in the admin replay UI.
 */
@Injectable()
export class WebhookRateLimiterManager {
  private readonly logger = new Logger(WebhookRateLimiterManager.name);
  private readonly buckets = new Map<string, number[]>();

  tryReserve(key: string): boolean {
    const cap = AppConfig.get().WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE;
    const now = Date.now();
    const cutoff = now - WEBHOOK_RATE_LIMITER_WINDOW_MS;
    const existing = this.buckets.get(key) ?? [];
    const fresh = existing.filter((ts) => ts > cutoff);
    if (fresh.length >= cap) {
      this.logger.debug(
        `tryReserve: key=${key} cap=${String(cap)} fresh=${String(fresh.length)} → BLOCKED`,
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
