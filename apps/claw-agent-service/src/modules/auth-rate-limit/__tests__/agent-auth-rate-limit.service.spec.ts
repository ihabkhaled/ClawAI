import { vi } from 'vitest';

import { PAIR_INIT_RATE_LIMIT_PER_MINUTE } from '../../../common/constants/auth.constants';
import type { FixedWindowHit } from '../../../infrastructure/redis/types/redis-window.types';
import type { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  AGENT_AUTH_RATE_LIMIT_POLICIES,
  AGENT_AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS,
} from '../constants/agent-auth-rate-limit.constants';
import { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitRepository } from '../repositories/agent-auth-rate-limit.repository';
import { AgentAuthRateLimitService } from '../services/agent-auth-rate-limit.service';

function inMemoryRepository(): Pick<AgentAuthRateLimitRepository, 'hit'> {
  const counts = new Map<string, number>();
  return {
    hit: vi.fn(async (key: string, windowSeconds: number): Promise<FixedWindowHit | null> => {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { count, ttlSeconds: windowSeconds };
    }),
  };
}

function build(
  repository: Pick<AgentAuthRateLimitRepository, 'hit'> = inMemoryRepository(),
): AgentAuthRateLimitService {
  return new AgentAuthRateLimitService(repository as AgentAuthRateLimitRepository);
}

const DEVICE = { ip: '203.0.113.7', pairingCode: null };

describe('AgentAuthRateLimitService', () => {
  it('has a non-empty budget for every policy', () => {
    for (const policy of Object.values(AgentAuthRateLimitPolicy)) {
      expect(AGENT_AUTH_RATE_LIMIT_POLICIES.get(policy)?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('applies the existing PAIR_INIT_RATE_LIMIT_PER_MINUTE per IP', async () => {
    const service = build();
    for (let index = 0; index < PAIR_INIT_RATE_LIMIT_PER_MINUTE; index += 1) {
      await expect(service.consume(AgentAuthRateLimitPolicy.PAIR_INIT, DEVICE)).resolves.toEqual({
        allowed: true,
      });
    }
    await expect(service.consume(AgentAuthRateLimitPolicy.PAIR_INIT, DEVICE)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it('keeps another IP in its own window', async () => {
    const service = build();
    for (let index = 0; index <= PAIR_INIT_RATE_LIMIT_PER_MINUTE; index += 1) {
      await service.consume(AgentAuthRateLimitPolicy.PAIR_INIT, DEVICE);
    }
    await expect(
      service.consume(AgentAuthRateLimitPolicy.PAIR_INIT, {
        ip: '198.51.100.1',
        pairingCode: null,
      }),
    ).resolves.toEqual({ allowed: true });
  });

  it('allows one poll per second per pairing code, independently per code', async () => {
    const service = build();
    const first = { ip: DEVICE.ip, pairingCode: 'code-a' };

    await expect(service.consume(AgentAuthRateLimitPolicy.PAIR_POLL, first)).resolves.toEqual({
      allowed: true,
    });
    await expect(service.consume(AgentAuthRateLimitPolicy.PAIR_POLL, first)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
    await expect(
      service.consume(AgentAuthRateLimitPolicy.PAIR_POLL, { ...first, pairingCode: 'code-b' }),
    ).resolves.toEqual({ allowed: true });
  });

  it.each([
    [AgentAuthRateLimitPolicy.DEVICE_CODE_CREATE, 10],
    [AgentAuthRateLimitPolicy.REFRESH, 60],
    [AgentAuthRateLimitPolicy.SSO_CALLBACK, 30],
  ] as const)('limits %s to %i per minute per IP', async (policy, limit) => {
    const service = build();
    for (let index = 0; index < limit; index += 1) {
      await service.consume(policy, DEVICE);
    }
    await expect(service.consume(policy, DEVICE)).resolves.toMatchObject({ allowed: false });
  });

  it('allows everything when Redis is down', async () => {
    const service = build({ hit: vi.fn().mockResolvedValue(null) });

    await expect(service.consume(AgentAuthRateLimitPolicy.REFRESH, DEVICE)).resolves.toEqual({
      allowed: true,
    });
  });
});

describe('AgentAuthRateLimitRepository', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function repository(incrWithTtl: RedisService['incrWithTtl']): AgentAuthRateLimitRepository {
    const redis: Pick<RedisService, 'incrWithTtl'> = { incrWithTtl };
    return new AgentAuthRateLimitRepository(redis as RedisService);
  }

  it('returns the hit from Redis', async () => {
    const incr = vi.fn().mockResolvedValue({ count: 2, ttlSeconds: 50 });

    await expect(repository(incr).hit('k', 60)).resolves.toEqual({ count: 2, ttlSeconds: 50 });
    expect(incr).toHaveBeenCalledWith('k', 60);
  });

  it('fails open on a Redis error', async () => {
    await expect(
      repository(vi.fn().mockRejectedValue(new Error('down'))).hit('k', 60),
    ).resolves.toBeNull();
  });

  it('fails open when Redis does not answer in time', async () => {
    vi.useFakeTimers();
    const pending = repository(vi.fn().mockReturnValue(new Promise(vi.fn()))).hit('k', 60);
    await vi.advanceTimersByTimeAsync(AGENT_AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS + 1);

    await expect(pending).resolves.toBeNull();
  });
});
