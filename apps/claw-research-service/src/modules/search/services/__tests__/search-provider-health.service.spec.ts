import { vi } from 'vitest';
import {
  SEARCH_BREAKER_COOLDOWN_MS,
  SEARCH_BREAKER_FAILURE_THRESHOLD,
  SEARCH_BREAKER_MAX_TRACKED,
} from '../../../../common/constants/search.constants';
import { SearchProviderHealthService } from '../search-provider-health.service';

describe('SearchProviderHealthService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const trip = (health: SearchProviderHealthService, id: string): void => {
    for (let i = 0; i < SEARCH_BREAKER_FAILURE_THRESHOLD; i += 1) {
      health.recordFailure(id);
    }
  };

  it('stays closed below the failure threshold', () => {
    const health = new SearchProviderHealthService();
    health.recordFailure('p');
    expect(health.allow('p')).toBe(true);
  });

  it('opens after N consecutive failures and skips the provider', () => {
    const health = new SearchProviderHealthService();
    trip(health, 'p');
    expect(health.allow('p')).toBe(false);
    expect(health.isOpen('p')).toBe(true);
  });

  it('a success in between resets the count', () => {
    const health = new SearchProviderHealthService();
    health.recordFailure('p');
    health.recordFailure('p');
    health.recordSuccess('p');
    health.recordFailure('p');
    expect(health.allow('p')).toBe(true);
  });

  it('half-open: after the cool-down exactly one probe is allowed, success closes', () => {
    const health = new SearchProviderHealthService();
    trip(health, 'p');
    vi.advanceTimersByTime(SEARCH_BREAKER_COOLDOWN_MS + 1);
    expect(health.allow('p')).toBe(true);
    expect(health.allow('p')).toBe(false);
    health.recordSuccess('p');
    expect(health.allow('p')).toBe(true);
    expect(health.isOpen('p')).toBe(false);
  });

  it('half-open: a failed probe re-opens for another full cool-down', () => {
    const health = new SearchProviderHealthService();
    trip(health, 'p');
    vi.advanceTimersByTime(SEARCH_BREAKER_COOLDOWN_MS + 1);
    expect(health.allow('p')).toBe(true);
    health.recordFailure('p');
    expect(health.allow('p')).toBe(false);
    vi.advanceTimersByTime(SEARCH_BREAKER_COOLDOWN_MS + 1);
    expect(health.allow('p')).toBe(true);
  });

  it('tracks a bounded number of providers', () => {
    const health = new SearchProviderHealthService();
    for (let i = 0; i < SEARCH_BREAKER_MAX_TRACKED + 25; i += 1) {
      trip(health, `p${String(i)}`);
    }
    expect(health.isOpen('p0')).toBe(false);
    expect(health.isOpen(`p${String(SEARCH_BREAKER_MAX_TRACKED + 24)}`)).toBe(true);
  });
});
