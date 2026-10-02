import { vi } from 'vitest';
import type Redis from 'ioredis';

import {
  REDIS_FIXED_WINDOW_SCRIPT,
  REDIS_REFUND_WINDOW_SCRIPT,
} from '../constants/redis-window.constants';
import { RedisService } from '../redis.service';

function build(reply: unknown): { service: RedisService; evalMock: ReturnType<typeof vi.fn> } {
  const evalMock = vi.fn().mockResolvedValue(reply);
  const client: Pick<Redis, 'eval'> = { eval: evalMock };
  return { service: new RedisService(client as Redis), evalMock };
}

describe('RedisService.incrementWindow', () => {
  it('runs the atomic fixed-window script and returns count and ttl', async () => {
    const { service, evalMock } = build([4, 812]);

    await expect(service.incrementWindow('auth:rl:x', 900)).resolves.toEqual({
      count: 4,
      ttlSeconds: 812,
    });
    expect(evalMock).toHaveBeenCalledWith(REDIS_FIXED_WINDOW_SCRIPT, 1, 'auth:rl:x', '900');
  });

  it('reports the full window when the ttl is not positive', async () => {
    const { service } = build([1, -1]);

    await expect(service.incrementWindow('k', 60)).resolves.toEqual({ count: 1, ttlSeconds: 60 });
  });

  it('treats a malformed reply as the first hit of a fresh window', async () => {
    const { service } = build('OK');

    await expect(service.incrementWindow('k', 60)).resolves.toEqual({ count: 1, ttlSeconds: 60 });
  });

  it('sets the expiry inside the script so a counter never outlives its window', () => {
    expect(REDIS_FIXED_WINDOW_SCRIPT).toContain("redis.call('INCR', KEYS[1])");
    expect(REDIS_FIXED_WINDOW_SCRIPT).toContain("redis.call('EXPIRE', KEYS[1], ARGV[1])");
  });
});

describe('RedisService.refundWindow', () => {
  it('runs the never-below-zero refund script and returns the new count', async () => {
    const { service, evalMock } = build(3);

    await expect(service.refundWindow('auth:rl:x')).resolves.toBe(3);
    expect(evalMock).toHaveBeenCalledWith(REDIS_REFUND_WINDOW_SCRIPT, 1, 'auth:rl:x');
  });

  it('reads a malformed reply as zero', async () => {
    const { service } = build('OK');

    await expect(service.refundWindow('k')).resolves.toBe(0);
  });

  it('only decrements a counter that is above zero, so no key is created without a TTL', () => {
    expect(REDIS_REFUND_WINDOW_SCRIPT).toContain('if count > 0 then');
    expect(REDIS_REFUND_WINDOW_SCRIPT).toContain("redis.call('DECR', KEYS[1])");
  });
});
