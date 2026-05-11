import { AiActionUserRateLimiterManager } from '../ai-action-user-rate-limiter.manager';
import { AppConfig } from '../../../../app/config/app.config';

const baseConfig = {
  AI_ACTION_PER_USER_RATE_PER_MIN: 3,
  AI_ACTION_PER_USER_RATE_PER_HOUR: 5,
};

describe('AiActionUserRateLimiterManager', () => {
  let limiter: AiActionUserRateLimiterManager;

  beforeEach(() => {
    limiter = new AiActionUserRateLimiterManager();
    jest.spyOn(AppConfig, 'get').mockReturnValue(baseConfig as unknown as ReturnType<typeof AppConfig.get>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    limiter.reset();
  });

  it('allows up to per-minute cap, then blocks the next call', () => {
    expect(limiter.tryReserve('u1').allowed).toBe(true);
    expect(limiter.tryReserve('u1').allowed).toBe(true);
    expect(limiter.tryReserve('u1').allowed).toBe(true);
    const blocked = limiter.tryReserve('u1');
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.reason).toBe('PER_MINUTE');
  });

  it('blocks with PER_HOUR when minute cap is high but hour cap is low', () => {
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({
        AI_ACTION_PER_USER_RATE_PER_MIN: 100,
        AI_ACTION_PER_USER_RATE_PER_HOUR: 2,
      } as unknown as ReturnType<typeof AppConfig.get>);
    limiter = new AiActionUserRateLimiterManager();
    expect(limiter.tryReserve('u1').allowed).toBe(true);
    expect(limiter.tryReserve('u1').allowed).toBe(true);
    const blocked = limiter.tryReserve('u1');
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.reason).toBe('PER_HOUR');
  });

  it('isolates buckets per user', () => {
    expect(limiter.tryReserve('alice').allowed).toBe(true);
    expect(limiter.tryReserve('alice').allowed).toBe(true);
    expect(limiter.tryReserve('alice').allowed).toBe(true);
    expect(limiter.tryReserve('alice').allowed).toBe(false);
    // Bob still has the full budget
    expect(limiter.tryReserve('bob').allowed).toBe(true);
  });

  it('lets traffic resume after the minute window slides out', () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.tryReserve('u1').allowed).toBe(true);
    }
    // Still in same window — blocked
    expect(limiter.tryReserve('u1').allowed).toBe(false);
    // Slide past 60 seconds
    jest.spyOn(Date, 'now').mockReturnValue(now + 61 * 1000);
    expect(limiter.tryReserve('u1').allowed).toBe(true);
  });

  it('reset() empties all buckets', () => {
    limiter.tryReserve('u1');
    limiter.tryReserve('u1');
    limiter.tryReserve('u1');
    expect(limiter.tryReserve('u1').allowed).toBe(false);
    limiter.reset();
    expect(limiter.tryReserve('u1').allowed).toBe(true);
  });
});
