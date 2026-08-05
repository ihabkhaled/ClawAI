import { Permission, UserRole } from '@claw/shared-types';

import { RuntimeAdmissionService } from '../runtime-admission.service';
import {
  RUNTIME_ADMISSION_RESERVE_LUA,
  RUNTIME_ADMISSION_UNLIMITED,
} from '../../constants/runtime-admission.constants';
import { type EntitlementsService } from '../entitlements.service';
import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { type UserEntitlements } from '../../types/entitlements.types';

// Regression cover for a production lockout.
//
// Admins were admitted by passing `limit = 0` and `estimate = 0` to the reserve
// script, which only ever passed because `0 + 0 > 0` is false. The daily quota
// key is SHARED with ordinary chat usage, so the moment an admin sent a normal
// message the counter went non-zero and every later Runtime start evaluated
// `248 + 0 > 0` — a hard 429 "Runtime token quota is exhausted" for the rest of
// the 24h TTL, with no way to clear it from the product.
//
// The repository rule this broke is explicit: "`null` means unlimited, `0`
// means disabled. They are not interchangeable." 0 was being used to mean
// unlimited, and the script correctly read it as disabled.

const ARGV_DAILY_LIMIT_INDEX = 6;

// These tests assert on what reached the reserve script, not on what `reserve`
// returned, so the throw from parsing the stub ack is expected and discarded.
function swallow(): void {
  // intentionally empty
}

function entitlement(overrides: Partial<UserEntitlements>): UserEntitlements {
  return {
    userId: 'u1',
    role: UserRole.USER,
    isAdmin: false,
    // A non-admin only reaches the reserve script once it clears the permission
    // and model gates, so the baseline fixture has to grant both.
    permissions: [Permission.AGENT_USE, Permission.CHAT_USE],
    plan: null,
    modelAccessMode: 'ALLOW_ALL',
    allowedModels: [],
    allowedProviders: [],
    quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
    ...overrides,
  } as UserEntitlements;
}

describe('RuntimeAdmissionService — admin quota lockout', () => {
  let evalMock: jest.Mock;
  let service: RuntimeAdmissionService;
  let entitlementsMock: { getForUser: jest.Mock };

  const input = {
    userId: 'u1',
    requestId: 'req-00000001',
    provider: 'OLLAMA',
    model: 'kimi-k2.7-code',
    estimatedTokens: 4_400,
  };

  beforeEach(() => {
    evalMock = jest.fn().mockResolvedValue(['OK', JSON.stringify({})]);
    entitlementsMock = { getForUser: jest.fn() };
    service = new RuntimeAdmissionService(
      entitlementsMock as unknown as EntitlementsService,
      { getClient: () => ({ eval: evalMock }) } as unknown as RedisService,
    );
  });

  // `reserve` is allowed to throw past the script (the stub ack deliberately
  // fails schema parsing), but it must have REACHED the script — otherwise a
  // permission gate rejected first and the assertion below would silently read
  // `undefined` instead of failing on the thing it claims to test.
  const limitArg = (): string => {
    expect(evalMock).toHaveBeenCalledTimes(1);
    return String(evalMock.mock.calls[0][ARGV_DAILY_LIMIT_INDEX]);
  };

  it('sends the unlimited sentinel for an admin, not 0', async () => {
    // The whole defect in one assertion: 0 is "disabled", and the script is
    // right to deny it. An admin has to be marked unlimited instead.
    entitlementsMock.getForUser.mockResolvedValue(
      entitlement({
        isAdmin: true,
        role: UserRole.ADMIN,
        quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: true, adminBypass: true },
      }),
    );

    await service.reserve(input).catch(swallow);

    const limit = limitArg();
    expect(limit).not.toBe('0');
    expect(Number(limit)).toBeLessThan(0);
    expect(limit).toBe(String(RUNTIME_ADMISSION_UNLIMITED));
  });

  it('still sends a non-admin their real plan limit', async () => {
    // Widening the admin path must not widen anybody else's.
    entitlementsMock.getForUser.mockResolvedValue(
      entitlement({
        quota: {
          dailyLimit: 50_000,
          used: 248,
          remaining: 49_752,
          unlimited: false,
          adminBypass: false,
        },
      }),
    );

    await service.reserve(input).catch(swallow);

    expect(limitArg()).toBe('50000');
  });

  it('keeps a disabled plan at 0 so it is still denied', async () => {
    // A plan with no allowance must not be laundered into "unlimited" by the
    // same change that fixed admins — 0 has to keep reaching the script as 0.
    entitlementsMock.getForUser.mockResolvedValue(
      entitlement({
        quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
      }),
    );

    await service.reserve(input).catch(swallow);

    expect(limitArg()).toBe('0');
  });
});

describe('RUNTIME_ADMISSION_RESERVE_LUA — the guard that reads the sentinel', () => {
  it('skips the ceiling check when the limit is negative', () => {
    // Passing a negative limit only helps if the script actually branches on
    // it. Without this guard `current + estimate > -1` is true for every real
    // request and the sentinel would deny EVERYTHING instead of nothing.
    expect(RUNTIME_ADMISSION_RESERVE_LUA).toContain('limit >= 0 and current + estimate > limit');
  });

  it('uses a negative sentinel, so the guard and the sentinel agree', () => {
    expect(RUNTIME_ADMISSION_UNLIMITED).toBeLessThan(0);
  });
});
