import { Injectable, Logger, Optional } from '@nestjs/common';

import {
  SEARCH_BREAKER_COOLDOWN_MS,
  SEARCH_BREAKER_FAILURE_THRESHOLD,
  SEARCH_BREAKER_KEY_PREFIX,
  SEARCH_BREAKER_MAX_TRACKED,
  SEARCH_REDIS_TIMEOUT_MS,
} from '../../../common/constants/search.constants';
import { SearchProviderRunStatus } from '../../../common/enums/search-provider-run-status.enum';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { ProviderCounters, ProviderHealthState } from '../types/search-provider-health.types';

/**
 * Per-process circuit breaker and outcome counters for search providers.
 *
 * Closed -> (N consecutive failures) -> open -> (cool-down) -> half-open:
 * exactly ONE probe is let through; its success closes the breaker, its
 * failure re-opens it for another cool-down. While open a provider is skipped,
 * so a dead provider stops costing every search its full timeout.
 *
 * Memory is the fast path and the source of every decision. Since research
 * engine B1 (2026-11-28) an OPEN breaker is also written to Redis
 * (`research:breaker:<providerId>` = openedAt, TTL = the cool-down) and cleared
 * on the success that closes it, so a restarted process does not re-learn a
 * dead provider by paying its timeout again: `hydrate` reads the key once per
 * provider per process, before that provider's first AUTO search. Redis being
 * down or slow never blocks a search (bounded, swallowed, memory only).
 * The map holds only providers that have failed since their last success and
 * is capped at `SEARCH_BREAKER_MAX_TRACKED`.
 */
@Injectable()
export class SearchProviderHealthService {
  private readonly logger = new Logger(SearchProviderHealthService.name);
  private readonly states = new Map<string, ProviderHealthState>();
  private readonly counters = new Map<string, ProviderCounters>();
  private readonly hydrated = new Set<string>();

  constructor(@Optional() private readonly redis?: RedisService) {}

  /** Learns breakers opened before this process started. Once per provider; never throws. */
  async hydrate(providerIds: readonly string[]): Promise<void> {
    const pending = providerIds.filter((id) => !this.hydrated.has(id) && !this.states.has(id));
    if (this.redis === undefined || pending.length === 0) {
      return;
    }
    for (const id of pending) {
      this.hydrated.add(id);
    }
    await Promise.all(pending.map((id) => this.hydrateOne(id)));
  }

  private async hydrateOne(providerId: string): Promise<void> {
    try {
      const raw = await this.redis?.getBounded(
        `${SEARCH_BREAKER_KEY_PREFIX}${providerId}`,
        SEARCH_REDIS_TIMEOUT_MS,
      );
      const openedAt = Number(raw ?? Number.NaN);
      const stillOpen =
        Number.isFinite(openedAt) && Date.now() - openedAt < SEARCH_BREAKER_COOLDOWN_MS;
      if (stillOpen && !this.states.has(providerId)) {
        this.states.set(providerId, {
          consecutiveFailures: SEARCH_BREAKER_FAILURE_THRESHOLD,
          openedAt,
          probing: false,
        });
      }
    } catch (error) {
      this.logger.debug(
        `search.breaker.hydrate_failed provider=${providerId} ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** Fire-and-forget mirror of an open/closed breaker; a Redis failure changes nothing. */
  private share(providerId: string, openedAt: number | null): void {
    const key = `${SEARCH_BREAKER_KEY_PREFIX}${providerId}`;
    const write =
      openedAt === null
        ? this.redis?.delBounded(key, SEARCH_REDIS_TIMEOUT_MS)
        : this.redis?.setBounded(
            key,
            String(openedAt),
            Math.ceil(SEARCH_BREAKER_COOLDOWN_MS / 1000),
            SEARCH_REDIS_TIMEOUT_MS,
          );
    write?.catch(() => {});
  }

  /** True when the provider may be called now. Claims the half-open probe. */
  allow(providerId: string): boolean {
    const state = this.states.get(providerId);
    if (state === undefined || state.consecutiveFailures < SEARCH_BREAKER_FAILURE_THRESHOLD) {
      return true;
    }
    if (Date.now() - state.openedAt < SEARCH_BREAKER_COOLDOWN_MS) {
      return false;
    }
    if (state.probing) {
      return false;
    }
    state.probing = true;
    return true;
  }

  /** Non-claiming view for the "never skip everyone" guard. */
  isOpen(providerId: string): boolean {
    const state = this.states.get(providerId);
    return (
      state !== undefined &&
      state.consecutiveFailures >= SEARCH_BREAKER_FAILURE_THRESHOLD &&
      (Date.now() - state.openedAt < SEARCH_BREAKER_COOLDOWN_MS || state.probing)
    );
  }

  recordSuccess(providerId: string): void {
    const state = this.states.get(providerId);
    this.states.delete(providerId);
    if (state !== undefined && state.consecutiveFailures >= SEARCH_BREAKER_FAILURE_THRESHOLD) {
      this.share(providerId, null);
    }
  }

  recordFailure(providerId: string): void {
    const state = this.states.get(providerId) ?? {
      consecutiveFailures: 0,
      openedAt: 0,
      probing: false,
    };
    state.consecutiveFailures += 1;
    state.probing = false;
    if (state.consecutiveFailures >= SEARCH_BREAKER_FAILURE_THRESHOLD) {
      state.openedAt = Date.now();
      this.share(providerId, state.openedAt);
    }
    this.states.delete(providerId);
    this.states.set(providerId, state);
    while (this.states.size > SEARCH_BREAKER_MAX_TRACKED) {
      const oldest = this.states.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.states.delete(oldest);
    }
  }

  count(providerName: string, status: SearchProviderRunStatus): void {
    const current = this.counters.get(providerName) ?? { ok: 0, failed: 0, timeout: 0, skipped: 0 };
    switch (status) {
      case SearchProviderRunStatus.OK:
        current.ok += 1;
        break;
      case SearchProviderRunStatus.FAILED:
        current.failed += 1;
        break;
      case SearchProviderRunStatus.TIMEOUT:
        current.timeout += 1;
        break;
      case SearchProviderRunStatus.SKIPPED:
        current.skipped += 1;
        break;
    }
    this.counters.set(providerName, current);
  }

  snapshotCounters(): Record<string, ProviderCounters> {
    return Object.fromEntries(this.counters);
  }
}
