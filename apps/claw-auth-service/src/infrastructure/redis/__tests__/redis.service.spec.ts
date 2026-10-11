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

describe('RedisService.deleteByPrefix', () => {
  it('scans with an escaped literal pattern, deletes matches and stops at cursor 0', async () => {
    const scan = vi
      .fn()
      .mockResolvedValueOnce(['7', ['a', 'b']])
      .mockResolvedValueOnce(['0', ['c']]);
    const del = vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const service = new RedisService({ scan, del } as unknown as Redis);

    await expect(service.deleteByPrefix('p:gpt[4]*', 10, 100)).resolves.toBe(3);
    expect(scan).toHaveBeenNthCalledWith(1, '0', 'MATCH', String.raw`p:gpt\[4\]\**`, 'COUNT', 100);
    expect(del).toHaveBeenCalledWith('a', 'b');
  });

  it('is bounded by maxIterations', async () => {
    const scan = vi.fn().mockResolvedValue(['9', []]);
    const service = new RedisService({ scan, del: vi.fn() } as unknown as Redis);

    await service.deleteByPrefix('p:', 3, 10);

    expect(scan).toHaveBeenCalledTimes(3);
  });

  it('deleteByPrefixChecked reports complete only when the cursor returns to 0', async () => {
    const done = new RedisService({
      scan: vi.fn().mockResolvedValue(['0', []]),
      del: vi.fn(),
    } as unknown as Redis);
    await expect(done.deleteByPrefixChecked('p:', 3, 10)).resolves.toEqual({
      removed: 0,
      complete: true,
    });

    const cut = new RedisService({
      scan: vi.fn().mockResolvedValue(['9', []]),
      del: vi.fn(),
    } as unknown as Redis);
    await expect(cut.deleteByPrefixChecked('p:', 3, 10)).resolves.toEqual({
      removed: 0,
      complete: false,
    });
  });
});
