import { vi } from 'vitest';
import type Redis from 'ioredis';

import { REDIS_FIXED_WINDOW_SCRIPT } from '../constants/redis-window.constants';
import { RedisService } from '../redis.service';

function build(reply: unknown): { service: RedisService; evalMock: ReturnType<typeof vi.fn> } {
  const evalMock = vi.fn().mockResolvedValue(reply);
  const client: Pick<Redis, 'eval'> = { eval: evalMock };
  return { service: new RedisService(client as Redis), evalMock };
}

describe('RedisService.incrWithTtl', () => {
  it('runs the atomic fixed-window script and returns count and ttl', async () => {
    const { service, evalMock } = build([3, 42]);

    await expect(service.incrWithTtl('agent:auth:rl:x', 60)).resolves.toEqual({
      count: 3,
      ttlSeconds: 42,
    });
    expect(evalMock).toHaveBeenCalledWith(REDIS_FIXED_WINDOW_SCRIPT, 1, 'agent:auth:rl:x', '60');
  });

  it('reports the full window for a non-positive ttl or a malformed reply', async () => {
    await expect(build([1, -1]).service.incrWithTtl('k', 60)).resolves.toEqual({
      count: 1,
      ttlSeconds: 60,
    });
    await expect(build(null).service.incrWithTtl('k', 60)).resolves.toEqual({
      count: 1,
      ttlSeconds: 60,
    });
  });
});
