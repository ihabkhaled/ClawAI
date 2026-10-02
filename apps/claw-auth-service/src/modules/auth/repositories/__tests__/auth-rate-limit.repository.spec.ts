import { vi } from 'vitest';

import type { RedisService } from '../../../../infrastructure/redis/redis.service';
import { AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS } from '../../constants/auth-rate-limit.constants';
import { AuthRateLimitRepository } from '../auth-rate-limit.repository';

function build(
  incrementWindow: RedisService['incrementWindow'],
  del: RedisService['del'] = vi.fn().mockResolvedValue(undefined),
  refundWindow: RedisService['refundWindow'] = vi.fn().mockResolvedValue(0),
): AuthRateLimitRepository {
  const redis: Pick<RedisService, 'incrementWindow' | 'del' | 'refundWindow'> = {
    incrementWindow,
    del,
    refundWindow,
  };
  return new AuthRateLimitRepository(redis as RedisService);
}

describe('AuthRateLimitRepository', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the window hit from Redis', async () => {
    const incrementWindow = vi.fn().mockResolvedValue({ count: 3, ttlSeconds: 840 });
    const repository = build(incrementWindow);

    await expect(repository.hit('auth:rl:login:ip:abc', 900)).resolves.toEqual({
      count: 3,
      ttlSeconds: 840,
    });
    expect(incrementWindow).toHaveBeenCalledWith('auth:rl:login:ip:abc', 900);
  });

  it('fails open with null when Redis errors', async () => {
    const repository = build(vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(repository.hit('k', 60)).resolves.toBeNull();
  });

  it('fails open with null when Redis never answers', async () => {
    vi.useFakeTimers();
    const repository = build(vi.fn().mockReturnValue(new Promise(vi.fn())));

    const pending = repository.hit('k', 60);
    await vi.advanceTimersByTimeAsync(AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS + 1);

    await expect(pending).resolves.toBeNull();
  });

  it('reset deletes the window key', async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    await build(vi.fn(), del).reset('auth:rl:login:ip-email:abc');
    expect(del).toHaveBeenCalledWith('auth:rl:login:ip-email:abc');
  });

  it('refund gives one hit back', async () => {
    const refundWindow = vi.fn().mockResolvedValue(4);
    await build(vi.fn(), undefined, refundWindow).refund('auth:rl:login:ip:abc');
    expect(refundWindow).toHaveBeenCalledWith('auth:rl:login:ip:abc');
  });

  it('reset and refund swallow a Redis failure, so a success is never turned into an error', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const repository = build(vi.fn(), failing, failing);
    await expect(repository.reset('k')).resolves.toBeUndefined();
    await expect(repository.refund('k')).resolves.toBeUndefined();
  });

  it('refund gives up when Redis never answers', async () => {
    vi.useFakeTimers();
    const repository = build(vi.fn(), undefined, vi.fn().mockReturnValue(new Promise(vi.fn())));
    const pending = repository.refund('k');
    await vi.advanceTimersByTimeAsync(AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS + 1);
    await expect(pending).resolves.toBeUndefined();
  });
});
