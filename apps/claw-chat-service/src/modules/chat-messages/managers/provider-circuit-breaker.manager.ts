import { Injectable, Logger } from '@nestjs/common';

import { PROVIDER_BREAKER_OPEN_MS } from '../constants/provider-credit.constants';
import { type ProviderBreakerState } from '../types/provider-circuit-breaker.types';

/**
 * Skips a provider whose ACCOUNT is out of credit (ADR-125).
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
 * In-process, per replica (4 in prod): at most one probe per replica per
 * window — bounded, and nothing to fail when Redis is slow. Only account
 * exhaustion trips it; OpenRouter's per-request "can only afford N" does not,
 * because a cheaper or :free model on the same key still works.
 */
@Injectable()
export class ProviderCircuitBreakerManager {
  private static readonly states = new Map<string, ProviderBreakerState>();
  private readonly logger = new Logger(ProviderCircuitBreakerManager.name);

  /** Test-only reset of the process-wide state. */
  static resetAll(): void {
    ProviderCircuitBreakerManager.states.clear();
  }

  /** False while the provider's breaker is open; true when closed or probing. */
  allowsCall(provider: string): boolean {
    const state = ProviderCircuitBreakerManager.states.get(provider);
    const now = Date.now();
    if (state === undefined) {
      return true;
    }
    if (now < state.openUntil) {
      return false;
    }
    if (state.probeAt !== null && now < state.probeAt + PROVIDER_BREAKER_OPEN_MS) {
      return false;
    }
    ProviderCircuitBreakerManager.states.set(provider, { ...state, probeAt: now });
    this.logger.log(`allowsCall: ${provider} half-open — letting one probe through`);
    return true;
  }

  /** Records how a call to `provider` ended. */
  recordOutcome(provider: string, accountExhausted: boolean): void {
    const states = ProviderCircuitBreakerManager.states;
    if (accountExhausted) {
      states.set(provider, { openUntil: Date.now() + PROVIDER_BREAKER_OPEN_MS, probeAt: null });
      this.logger.warn(
        `recordOutcome: ${provider} account out of credit — skipping it for ${String(PROVIDER_BREAKER_OPEN_MS / 60_000)} min`,
      );
      return;
    }
    if (states.delete(provider)) {
      this.logger.log(`recordOutcome: ${provider} answered — breaker closed`);
    }
  }

  /** Providers currently skipped (open or probing), for logs and operators. */
  openProviders(): string[] {
    return [...ProviderCircuitBreakerManager.states.keys()];
  }
}
