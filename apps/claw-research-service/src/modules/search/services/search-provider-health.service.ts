import { Injectable } from '@nestjs/common';

import {
  SEARCH_BREAKER_COOLDOWN_MS,
  SEARCH_BREAKER_FAILURE_THRESHOLD,
  SEARCH_BREAKER_MAX_TRACKED,
} from '../../../common/constants/search.constants';
import { SearchProviderRunStatus } from '../../../common/enums/search-provider-run-status.enum';
import type { ProviderCounters, ProviderHealthState } from '../types/search-provider-health.types';

/**
 * Per-process circuit breaker and outcome counters for search providers.
 *
 * Closed -> (N consecutive failures) -> open -> (cool-down) -> half-open:
 * exactly ONE probe is let through; its success closes the breaker, its
 * failure re-opens it for another cool-down. While open a provider is skipped,
 * so a dead provider stops costing every search its full timeout.
 *
 * State lives in this process only. With several replicas each learns about a
 * dead provider on its own, which is enough: the breaker is a latency guard,
 * not a source of truth, and nothing here is persisted or shared.
 * The map holds only providers that have failed since their last success and
 * is capped at `SEARCH_BREAKER_MAX_TRACKED`.
 */
@Injectable()
export class SearchProviderHealthService {
  private readonly states = new Map<string, ProviderHealthState>();
  private readonly counters = new Map<string, ProviderCounters>();

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
    this.states.delete(providerId);
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
