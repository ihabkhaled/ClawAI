import { vi } from 'vitest';

import { PROVIDER_BREAKER_OPEN_MS } from '../../constants/provider-credit.constants';
import { ProviderCircuitBreakerManager } from '../provider-circuit-breaker.manager';

describe('ProviderCircuitBreakerManager (ADR-125)', () => {
  beforeEach(() => {
    ProviderCircuitBreakerManager.resetAll();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is closed until an account exhaustion is recorded', () => {
    const breaker = new ProviderCircuitBreakerManager();
    expect(breaker.allowsCall('OPENAI')).toBe(true);
    breaker.recordOutcome('OPENAI', true);
    expect(breaker.allowsCall('OPENAI')).toBe(false);
    // Per provider: Anthropic is untouched.
    expect(breaker.allowsCall('ANTHROPIC')).toBe(true);
  });

  it('is shared by every instance (one per process, not per request)', () => {
    new ProviderCircuitBreakerManager().recordOutcome('OPENAI', true);
    expect(new ProviderCircuitBreakerManager().allowsCall('OPENAI')).toBe(false);
  });

  it('half-opens after the window: exactly ONE probe, others still skip', () => {
    const breaker = new ProviderCircuitBreakerManager();
    breaker.recordOutcome('OPENAI', true);
    vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
    expect(breaker.allowsCall('OPENAI')).toBe(true);
    expect(breaker.allowsCall('OPENAI')).toBe(false);
  });

  it('a successful probe closes it; a failed probe re-opens for another window', () => {
    const breaker = new ProviderCircuitBreakerManager();
    breaker.recordOutcome('OPENAI', true);
    vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
    expect(breaker.allowsCall('OPENAI')).toBe(true);
    breaker.recordOutcome('OPENAI', true);
    expect(breaker.allowsCall('OPENAI')).toBe(false);

    vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
    expect(breaker.allowsCall('OPENAI')).toBe(true);
    breaker.recordOutcome('OPENAI', false);
    expect(breaker.allowsCall('OPENAI')).toBe(true);
    expect(breaker.allowsCall('OPENAI')).toBe(true);
  });

  it('a stuck probe does not keep the provider closed forever', () => {
    const breaker = new ProviderCircuitBreakerManager();
    breaker.recordOutcome('OPENAI', true);
    vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
    expect(breaker.allowsCall('OPENAI')).toBe(true);
    // The probe never reports back; after another window a new probe is allowed.
    vi.advanceTimersByTime(PROVIDER_BREAKER_OPEN_MS + 1);
    expect(breaker.allowsCall('OPENAI')).toBe(true);
  });

  it('lists open providers for the operator', () => {
    const breaker = new ProviderCircuitBreakerManager();
    breaker.recordOutcome('ANTHROPIC', true);
    expect(breaker.openProviders()).toEqual(['ANTHROPIC']);
  });
});
