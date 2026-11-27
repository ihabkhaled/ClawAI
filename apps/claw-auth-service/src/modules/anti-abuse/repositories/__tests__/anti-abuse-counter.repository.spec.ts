import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { AntiAbuseCounterRepository } from '../anti-abuse-counter.repository';

describe('AntiAbuseCounterRepository', () => {
  let redis: { incrementWindow: Mock; get: Mock; claimCooldown: Mock; del: Mock };
  let repository: AntiAbuseCounterRepository;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    redis = {
      incrementWindow: vi.fn().mockResolvedValue({ count: 2, ttlSeconds: 50 }),
      get: vi.fn().mockResolvedValue('4'),
      claimCooldown: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(undefined),
    };
    repository = new AntiAbuseCounterRepository(redis as unknown as RedisService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('counts a hit on a fixed window', async () => {
    await expect(repository.hit('k', 60)).resolves.toEqual({ count: 2, ttlSeconds: 50 });
    expect(redis.incrementWindow).toHaveBeenCalledWith('k', 60);
  });

  it('reads a count, and 0 for a window that does not exist', async () => {
    await expect(repository.read('k')).resolves.toBe(4);
    redis.get.mockResolvedValue(null);
    await expect(repository.read('k')).resolves.toBe(0);
  });

  it('claims once: true the first time, false when already claimed', async () => {
    await expect(repository.claimOnce('k', 360)).resolves.toBe(true);
    expect(redis.claimCooldown).toHaveBeenCalledWith('k', 360);
    redis.claimCooldown.mockResolvedValue(300);
    await expect(repository.claimOnce('k', 360)).resolves.toBe(false);
  });

  it('fails open with null on a Redis error', async () => {
    redis.incrementWindow.mockRejectedValue(new Error('ECONNREFUSED'));
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    redis.claimCooldown.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(repository.hit('k', 60)).resolves.toBeNull();
    await expect(repository.read('k')).resolves.toBeNull();
    await expect(repository.claimOnce('k', 60)).resolves.toBeNull();
  });

  it('fails open with null when Redis does not answer in 250 ms', async () => {
    vi.useFakeTimers();
    redis.incrementWindow.mockReturnValue(new Promise<never>(() => {}));
    const pending = repository.hit('k', 60);
    await vi.advanceTimersByTimeAsync(250);
    await expect(pending).resolves.toBeNull();
  });

  it('resets a key', async () => {
    await repository.reset('k');
    expect(redis.del).toHaveBeenCalledWith('k');
  });
});
