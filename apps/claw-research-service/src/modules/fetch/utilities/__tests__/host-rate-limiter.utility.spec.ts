import { HostRateLimiter } from '../host-rate-limiter.utility';
import { FETCH_STRATEGY_MIN_HOST_INTERVAL_MS } from '../../constants/fetch-strategy.constants';

describe('HostRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not delay the first request for a key', async () => {
    const limiter = new HostRateLimiter();
    const settled = vi.fn();
    void limiter.waitForTurn('example.com').then(settled);
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toHaveBeenCalled();
  });

  it('delays a second request to the same key until the interval elapses', async () => {
    const limiter = new HostRateLimiter();
    await limiter.waitForTurn('example.com');

    const settled = vi.fn();
    void limiter.waitForTurn('example.com').then(settled);
    await vi.advanceTimersByTimeAsync(FETCH_STRATEGY_MIN_HOST_INTERVAL_MS - 100);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(settled).toHaveBeenCalled();
  });

  it('serializes two concurrent callers instead of letting both through', async () => {
    const limiter = new HostRateLimiter();
    const first = vi.fn();
    const second = vi.fn();
    void limiter.waitForTurn('example.com').then(first);
    void limiter.waitForTurn('example.com').then(second);
    await vi.advanceTimersByTimeAsync(0);
    expect(first).toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(FETCH_STRATEGY_MIN_HOST_INTERVAL_MS);
    expect(second).toHaveBeenCalled();
  });

  it('honours a longer per-call interval (robots Crawl-delay)', async () => {
    const limiter = new HostRateLimiter();
    await limiter.waitForTurn('example.com', 5_000);

    const settled = vi.fn();
    void limiter.waitForTurn('example.com', 5_000).then(settled);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_100);
    expect(settled).toHaveBeenCalled();
  });

  it('does not delay two different keys', async () => {
    const limiter = new HostRateLimiter();
    await limiter.waitForTurn('a.example.com');

    const settled = vi.fn();
    void limiter.waitForTurn('b.example.com').then(settled);
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toHaveBeenCalled();
  });

  it('prunes expired keys once the map is large', async () => {
    const limiter = new HostRateLimiter(10);
    for (let index = 0; index < 1_001; index += 1) {
      await limiter.waitForTurn(`host-${String(index)}`);
    }
    await vi.advanceTimersByTimeAsync(50);
    const settled = vi.fn();
    void limiter.waitForTurn('host-0').then(settled);
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toHaveBeenCalled();
  });
});
