import { Injectable, Logger, Optional } from '@nestjs/common';

import { PROVIDER_BREAKER_OPEN_MS } from '../constants/provider-credit.constants';
import { PROVIDER_BREAKER_PROBE_TTL_MS } from '../constants/provider-breaker.constants';
import { ProviderBreakerAdmission } from '../enums/provider-breaker-admission.enum';
import { ProviderBreakerReason } from '../enums/provider-breaker-reason.enum';
import { ProviderBreakerSource } from '../enums/provider-breaker-source.enum';
import { ProviderBreakerStore } from '../repositories/provider-breaker.store';
import {
  type ClearProviderBreakerResponse,
  type ProviderBreakerState,
  type SkippedProvidersResponse,
} from '../types/provider-circuit-breaker.types';
import {
  isProbeInFlight,
  toSkippedProviderView,
} from '../utilities/provider-breaker-state.utility';

/**
 * Skips a provider whose ACCOUNT is out of credit (ADR-125 + addendum).
 *
 * Production had OpenAI "no credits remaining" and Anthropic "credit balance
 * is too low" on every turn routed to them: each user paid the latency of a
 * doomed call before AUTO moved on. After one account-level exhaustion the
 * chokepoint refuses that provider for PROVIDER_BREAKER_OPEN_MS without a
 * hold or a call; the candidate walk moves to the next provider at once.
 *
 * Half-open: after the window ONE call probes. Success (or any non-exhaustion
 * outcome) closes it; another exhaustion re-opens it for a full window. A
 * probe that never reports back is abandoned after another window.
 *
 * Shared across replicas (prod runs 4): the state lives in Redis
 * (`ProviderBreakerStore`), so one exhaustion skips the provider on every
 * replica and the half-open probe is ONE call fleet-wide (SET NX PX). When
 * Redis is down or slow the replica falls back to its own in-memory copy —
 * the pre-addendum behaviour: bounded, at most one probe per replica per
 * window, never a hung model call. Without a store (hand-built in specs) it
 * is in-memory only.
 *
 * Only account exhaustion trips it; OpenRouter's per-request "can only afford
 * N" does not, because a cheaper or :free model on the same key still works.
 */
@Injectable()
export class ProviderCircuitBreakerManager {
  private static readonly states = new Map<string, ProviderBreakerState>();
  /** Providers whose fleet-wide probe THIS replica holds. */
  private static readonly probes = new Set<string>();
  private readonly logger = new Logger(ProviderCircuitBreakerManager.name);

  constructor(@Optional() private readonly store?: ProviderBreakerStore) {}

  /** Test-only reset of the process-wide state. */
  static resetAll(): void {
    ProviderCircuitBreakerManager.states.clear();
    ProviderCircuitBreakerManager.probes.clear();
  }

  /** False while the provider's breaker is open; true when closed or probing. */
  async allowsCall(provider: string): Promise<boolean> {
    if (this.store !== undefined) {
      try {
        const admission = await this.store.admit(provider, Date.now());
        return this.applyAdmission(provider, admission);
      } catch (error: unknown) {
        this.warnFallback('allowsCall', provider, error);
      }
    }
    return this.allowsCallLocally(provider);
  }

  /** Records how a call to `provider` ended. */
  async recordOutcome(provider: string, accountExhausted: boolean): Promise<void> {
    if (accountExhausted) {
      await this.trip(provider);
      return;
    }
    const wasProbe = ProviderCircuitBreakerManager.probes.delete(provider);
    const hadLocal = ProviderCircuitBreakerManager.states.delete(provider);
    if (!wasProbe && !hadLocal) {
      // The ordinary answered call: no breaker here, no Redis round trip.
      return;
    }
    this.logger.log(`recordOutcome: ${provider} answered — breaker closed`);
    await this.closeShared(provider, 'recordOutcome');
  }

  /** Every provider currently skipped, for the admin endpoint. */
  async list(): Promise<SkippedProvidersResponse> {
    if (this.store !== undefined) {
      try {
        const entries = await this.store.list();
        return {
          source: ProviderBreakerSource.REDIS,
          providers: entries.map((entry) =>
            toSkippedProviderView(entry.provider, entry, entry.probing),
          ),
        };
      } catch (error: unknown) {
        this.warnFallback('list', 'all', error);
      }
    }
    const now = Date.now();
    return {
      source: ProviderBreakerSource.MEMORY,
      providers: [...ProviderCircuitBreakerManager.states.entries()].map(([provider, state]) =>
        toSkippedProviderView(
          provider,
          state,
          isProbeInFlight(state, now, PROVIDER_BREAKER_PROBE_TTL_MS),
        ),
      ),
    };
  }

  /** Admin "clear": the provider is called again on the next turn, on every replica. */
  async clear(provider: string): Promise<ClearProviderBreakerResponse> {
    ProviderCircuitBreakerManager.probes.delete(provider);
    const hadLocal = ProviderCircuitBreakerManager.states.delete(provider);
    const hadShared = await this.closeShared(provider, 'clear');
    return { provider, cleared: hadLocal || hadShared };
  }

  private applyAdmission(provider: string, admission: ProviderBreakerAdmission): boolean {
    if (admission === ProviderBreakerAdmission.OPEN) {
      return false;
    }
    if (admission === ProviderBreakerAdmission.PROBE) {
      ProviderCircuitBreakerManager.probes.add(provider);
      this.logger.log(`allowsCall: ${provider} half-open — this replica holds the one probe`);
      return true;
    }
    // Redis answered "closed": a copy this replica kept during an outage is stale.
    ProviderCircuitBreakerManager.states.delete(provider);
    return true;
  }

  private allowsCallLocally(provider: string): boolean {
    const state = ProviderCircuitBreakerManager.states.get(provider);
    const now = Date.now();
    if (state === undefined) {
      return true;
    }
    if (now < state.openUntil || isProbeInFlight(state, now, PROVIDER_BREAKER_PROBE_TTL_MS)) {
      return false;
    }
    ProviderCircuitBreakerManager.states.set(provider, { ...state, probeAt: now });
    this.logger.log(`allowsCall: ${provider} half-open — letting one probe through`);
    return true;
  }

  private async trip(provider: string): Promise<void> {
    const now = Date.now();
    const state = {
      openUntil: now + PROVIDER_BREAKER_OPEN_MS,
      reason: ProviderBreakerReason.ACCOUNT_CREDIT_EXHAUSTED,
      trippedAt: now,
    };
    ProviderCircuitBreakerManager.probes.delete(provider);
    ProviderCircuitBreakerManager.states.set(provider, { ...state, probeAt: null });
    this.logger.warn(
      `recordOutcome: ${provider} account out of credit — skipping it for ${String(PROVIDER_BREAKER_OPEN_MS / 60_000)} min`,
    );
    if (this.store === undefined) {
      return;
    }
    try {
      await this.store.trip(provider, state);
    } catch (error: unknown) {
      this.warnFallback('trip', provider, error);
    }
  }

  private async closeShared(provider: string, operation: string): Promise<boolean> {
    if (this.store === undefined) {
      return false;
    }
    try {
      return await this.store.close(provider);
    } catch (error: unknown) {
      this.warnFallback(operation, provider, error);
      return false;
    }
  }

  private warnFallback(operation: string, provider: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : 'unknown error';
    this.logger.warn(
      `${operation}: ${provider} — shared breaker unavailable (${detail}); using this replica's copy`,
    );
  }
}
