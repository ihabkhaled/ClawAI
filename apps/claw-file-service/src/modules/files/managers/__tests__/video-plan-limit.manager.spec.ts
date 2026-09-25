// Multimodal batch 7 — Plan.maxVideoSeconds, read through resolvePlanLimit.
// null = unlimited, 0 = disabled, n = ceiling in whole seconds (ADR-122).

import { describe, expect, it, vi } from 'vitest';
import { type EntitlementsAdapter, type UserEntitlements } from '@claw/shared-entitlements';
import { VideoPlanDecision } from '../../../../common/enums';
import { VideoPlanLimitManager } from '../video-plan-limit.manager';

const entitlements = (maxVideoSeconds: number | null, isAdmin = false): UserEntitlements =>
  ({
    userId: 'u1',
    role: isAdmin ? 'ADMIN' : 'USER',
    isAdmin,
    permissions: [],
    plan: { id: 'p', slug: 'free', limits: { maxVideoSeconds } },
  }) as unknown as UserEntitlements;

const managerFor = (reply: () => Promise<UserEntitlements>): VideoPlanLimitManager =>
  new VideoPlanLimitManager({ getEntitlements: vi.fn(reply) } as unknown as EntitlementsAdapter);

describe('VideoPlanLimitManager', () => {
  it.each([
    [59_000, VideoPlanDecision.ALLOWED],
    [60_000, VideoPlanDecision.ALLOWED],
    [60_001, VideoPlanDecision.TOO_LONG],
    [61_000, VideoPlanDecision.TOO_LONG],
  ])('free plan (60 s): %d ms → %s', async (durationMs, decision) => {
    const check = await managerFor(async () => entitlements(60)).check('u1', durationMs);
    expect(check).toEqual({ decision, limitSeconds: 60 });
  });

  it('0 means video is disabled for the plan, whatever the length', async () => {
    const check = await managerFor(async () => entitlements(0)).check('u1', 1_000);
    expect(check.decision).toBe(VideoPlanDecision.DISABLED);
  });

  it('null means unlimited', async () => {
    const check = await managerFor(async () => entitlements(null)).check('u1', 29 * 60 * 1000);
    expect(check).toEqual({ decision: VideoPlanDecision.ALLOWED, limitSeconds: null });
  });

  it('an ADMIN is unlimited even on a 60 s plan', async () => {
    const check = await managerFor(async () => entitlements(60, true)).check('u1', 600_000);
    expect(check.decision).toBe(VideoPlanDecision.ALLOWED);
  });

  it('fails CLOSED when auth-service is unreachable', async () => {
    const check = await managerFor(async () => {
      throw new Error('ECONNREFUSED');
    }).check('u1', 1_000);
    expect(check.decision).toBe(VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE);
  });

  it('fails CLOSED when an older auth-service omits the field', async () => {
    const legacy = {
      ...entitlements(60),
      plan: { id: 'p', slug: 'free', limits: {} },
    } as unknown as UserEntitlements;
    const check = await managerFor(async () => legacy).check('u1', 1_000);
    expect(check.decision).toBe(VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE);
  });

  it('a user with no plan resolves to 0 (disabled), per resolvePlanLimit', async () => {
    const noPlan = { ...entitlements(60), plan: null } as unknown as UserEntitlements;
    const check = await managerFor(async () => noPlan).check('u1', 1_000);
    expect(check.decision).toBe(VideoPlanDecision.DISABLED);
  });
});
