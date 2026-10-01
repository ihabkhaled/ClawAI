import { vi } from 'vitest';
import type Redis from 'ioredis';

import { RedisService } from '../redis.service';

function build(count: number): {
  service: RedisService;
  incr: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
} {
  const incr = vi.fn().mockResolvedValue(count);
  const expire = vi.fn().mockResolvedValue(1);
  return { service: new RedisService({ incr, expire } as unknown as Redis), incr, expire };
}

describe('RedisService.incrementWindow', () => {
  it('starts the window on the first hit', async () => {
    const { service, expire } = build(1);
    await expect(service.incrementWindow('k', 3600)).resolves.toBe(1);
    expect(expire).toHaveBeenCalledWith('k', 3600);
  });

  it('does not extend the window on later hits', async () => {
    const { service, expire } = build(4);
    await expect(service.incrementWindow('k', 3600)).resolves.toBe(4);
    expect(expire).not.toHaveBeenCalled();
  });
});
