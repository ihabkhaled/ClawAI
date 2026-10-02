import { vi } from 'vitest';

import type { FixedWindowHit } from '../../../../infrastructure/redis/types/redis-window.types';
import { AUTH_RATE_LIMIT_POLICIES } from '../../constants/auth-rate-limit.constants';
import { AuthRateLimitPolicy } from '../../enums/auth-rate-limit-policy.enum';
import type { AuthRateLimitRepository } from '../../repositories/auth-rate-limit.repository';
import { AuthRateLimitService } from '../auth-rate-limit.service';

/**
 * An in-memory stand-in for Redis so under / at / over can be walked hit by
 * hit, with windows isolated by key exactly as the real counters are.
 */
function build(): {
  service: AuthRateLimitService;
  hit: ReturnType<typeof vi.fn>;
  counts: Map<string, number>;
} {
  const counts = new Map<string, number>();
  const hit = vi.fn(async (key: string, windowSeconds: number): Promise<FixedWindowHit | null> => {
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return { count, ttlSeconds: windowSeconds - 60 };
  });
  const repository: Pick<AuthRateLimitRepository, 'hit'> = { hit };
  return { service: new AuthRateLimitService(repository as AuthRateLimitRepository), hit, counts };
}

const ATTACKER = { ip: '203.0.113.7', email: 'victim@example.com' };

async function attempts(
  service: AuthRateLimitService,
  policy: AuthRateLimitPolicy,
  subject: { ip: string; email: string | null },
  times: number,
): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await service.consume(policy, subject);
  }
}

describe('AuthRateLimitService', () => {
  it('has a non-empty budget for every policy', () => {
    for (const policy of Object.values(AuthRateLimitPolicy)) {
      expect(AUTH_RATE_LIMIT_POLICIES.get(policy)?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('allows login up to 10 attempts per IP+address and refuses the 11th', async () => {
    const { service } = build();
    await attempts(service, AuthRateLimitPolicy.LOGIN, ATTACKER, 9);

    await expect(service.consume(AuthRateLimitPolicy.LOGIN, ATTACKER)).resolves.toEqual({
      allowed: true,
    });
    await expect(service.consume(AuthRateLimitPolicy.LOGIN, ATTACKER)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 840,
    });
  });

  it('still lets a different address sign in from the same IP after one is limited', async () => {
    const { service } = build();
    await attempts(service, AuthRateLimitPolicy.LOGIN, ATTACKER, 11);

    await expect(
      service.consume(AuthRateLimitPolicy.LOGIN, { ...ATTACKER, email: 'admin@claw.local' }),
    ).resolves.toEqual({ allowed: true });
  });

  it('refuses the 31st login from one IP across many addresses', async () => {
    const { service } = build();
    for (let index = 0; index < 30; index += 1) {
      await expect(
        service.consume(AuthRateLimitPolicy.LOGIN, { ip: ATTACKER.ip, email: `u${index}@x.io` }),
      ).resolves.toEqual({ allowed: true });
    }
    await expect(
      service.consume(AuthRateLimitPolicy.LOGIN, { ip: ATTACKER.ip, email: 'fresh@x.io' }),
    ).resolves.toMatchObject({ allowed: false });
  });

  it('limits register to 3 per address per hour, across IPs', async () => {
    const { service } = build();
    for (const ip of ['198.51.100.1', '198.51.100.2', '198.51.100.3']) {
      await expect(
        service.consume(AuthRateLimitPolicy.REGISTER, { ip, email: 'new@x.io' }),
      ).resolves.toEqual({ allowed: true });
    }
    await expect(
      service.consume(AuthRateLimitPolicy.REGISTER, { ip: '198.51.100.4', email: 'new@x.io' }),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 3540 });
  });

  it('limits register to 5 per IP per hour, across addresses', async () => {
    const { service } = build();
    for (let index = 0; index < 5; index += 1) {
      await service.consume(AuthRateLimitPolicy.REGISTER, {
        ip: ATTACKER.ip,
        email: `r${index}@x.io`,
      });
    }
    await expect(
      service.consume(AuthRateLimitPolicy.REGISTER, { ip: ATTACKER.ip, email: 'r9@x.io' }),
    ).resolves.toMatchObject({ allowed: false });
  });

  it('keeps each route in its own budget', async () => {
    const { service } = build();
    await attempts(service, AuthRateLimitPolicy.PASSWORD_RESET_CONFIRM, ATTACKER, 11);

    await expect(service.consume(AuthRateLimitPolicy.LOGIN, ATTACKER)).resolves.toEqual({
      allowed: true,
    });
  });

  it('counts an IP-only route without an address', async () => {
    const { service, hit } = build();
    await service.consume(AuthRateLimitPolicy.REFRESH, { ip: ATTACKER.ip, email: null });

    expect(hit).toHaveBeenCalledTimes(1);
    expect(hit.mock.calls[0]?.[1]).toBe(60);
  });

  it('skips the address windows when the body has no address', async () => {
    const { service, hit } = build();
    await service.consume(AuthRateLimitPolicy.LOGIN, { ip: ATTACKER.ip, email: null });

    expect(hit).toHaveBeenCalledTimes(1);
  });

  it('reports at least one second when the window is about to reset', async () => {
    const repository: Pick<AuthRateLimitRepository, 'hit'> = {
      hit: vi.fn().mockResolvedValue({ count: 99, ttlSeconds: 0 }),
    };
    const service = new AuthRateLimitService(repository as AuthRateLimitRepository);

    await expect(
      service.consume(AuthRateLimitPolicy.REFRESH, { ip: ATTACKER.ip, email: null }),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it('allows the request when Redis is down (every hit null)', async () => {
    const repository: Pick<AuthRateLimitRepository, 'hit'> = {
      hit: vi.fn().mockResolvedValue(null),
    };
    const service = new AuthRateLimitService(repository as AuthRateLimitRepository);

    for (const policy of [
      AuthRateLimitPolicy.LOGIN,
      AuthRateLimitPolicy.REFRESH,
      AuthRateLimitPolicy.REGISTER,
    ]) {
      await expect(service.consume(policy, ATTACKER)).resolves.toEqual({ allowed: true });
    }
  });
});

/** In-memory Redis with the three operations the limiter uses. */
function buildWithSettle(): { service: AuthRateLimitService; counts: Map<string, number> } {
  const counts = new Map<string, number>();
  const repository: Pick<AuthRateLimitRepository, 'hit' | 'reset' | 'refund'> = {
    hit: vi.fn(async (key: string, windowSeconds: number) => {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { count, ttlSeconds: windowSeconds };
    }),
    reset: vi.fn(async (key: string) => {
      counts.delete(key);
    }),
    refund: vi.fn(async (key: string) => {
      counts.set(key, Math.max(0, (counts.get(key) ?? 0) - 1));
    }),
  };
  return { service: new AuthRateLimitService(repository as AuthRateLimitRepository), counts };
}

async function successfulLogin(
  service: AuthRateLimitService,
  subject: { ip: string; email: string | null },
): Promise<boolean> {
  const decision = await service.consume(AuthRateLimitPolicy.LOGIN, subject);
  if (decision.allowed) {
    await service.settle(AuthRateLimitPolicy.LOGIN, subject);
  }
  return decision.allowed;
}

describe('AuthRateLimitService.settle (success gives budget back)', () => {
  const SDK_USER = { ip: '198.51.100.4', email: 'sdk@example.com' };

  it('refunds only on login', () => {
    const { service } = buildWithSettle();
    expect(service.refundsOnSuccess(AuthRateLimitPolicy.LOGIN)).toBe(true);
    expect(service.refundsOnSuccess(AuthRateLimitPolicy.REGISTER)).toBe(false);
    expect(service.refundsOnSuccess(AuthRateLimitPolicy.REFRESH)).toBe(false);
  });

  it('never refuses an SDK that signs in correctly 50 times in one window', async () => {
    const { service, counts } = buildWithSettle();
    const results: boolean[] = [];
    for (let index = 0; index < 50; index += 1) {
      results.push(await successfulLogin(service, SDK_USER));
    }
    expect(results.every(Boolean)).toBe(true);
    expect([...counts.values()].every((count) => count === 0)).toBe(true);
  });

  it('never refuses 40 different people signing in correctly behind one office NAT', async () => {
    const { service } = buildWithSettle();
    for (let index = 0; index < 40; index += 1) {
      await expect(
        successfulLogin(service, { ip: '203.0.113.50', email: `person${index}@office.example` }),
      ).resolves.toBe(true);
    }
  });

  it('still refuses the 11th WRONG password for one account (failures are never refunded)', async () => {
    const { service } = buildWithSettle();
    await attempts(service, AuthRateLimitPolicy.LOGIN, ATTACKER, 10);
    await expect(service.consume(AuthRateLimitPolicy.LOGIN, ATTACKER)).resolves.toMatchObject({
      allowed: false,
    });
  });

  it('a success clears that account window but keeps other failures from the IP counted', async () => {
    const { service, counts } = buildWithSettle();
    await attempts(service, AuthRateLimitPolicy.LOGIN, { ip: ATTACKER.ip, email: 'other@x.io' }, 5);
    await successfulLogin(service, ATTACKER);
    const values = [...counts.values()].sort();
    // other@x.io keeps 5; the attacker IP keeps the 5 failures; the success left nothing.
    expect(values).toEqual([5, 5]);
  });

  it('skips the address windows when the subject has no address', async () => {
    const { service, counts } = buildWithSettle();
    await successfulLogin(service, { ip: ATTACKER.ip, email: null });
    expect([...counts.values()]).toEqual([0]);
  });
});
