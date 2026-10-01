import { vi } from 'vitest';

import { EntitlementApplierService } from '../entitlement-applier.service';
import { ENTITLEMENT_REVOKING_PATTERNS } from '../../constants/entitlement-inbox.constants';
import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

const DAY = 86_400_000;

function build(trialDurationDays: number | null) {
  const redemptionCreate = vi.fn().mockResolvedValue({});
  const tx = {
    userPlanAssignment: {
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 'a1' }),
    },
    planTrialRedemption: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: redemptionCreate,
    },
    user: { update: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    plan: { findUnique: vi.fn().mockResolvedValue({ id: 'free', trialDurationDays }) },
    userPlanAssignment: { findFirst: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
  } as unknown as PrismaService;
  return { service: new EntitlementApplierService(prisma), redemptionCreate };
}

const revoke = {
  userId: 'u1',
  pattern: ENTITLEMENT_REVOKING_PATTERNS[0],
  planId: null,
  subscriptionId: 's1',
  sourceEventId: 'e1',
  effectiveAtMs: Date.now(),
} as never;

describe('EntitlementApplierService revoke trial length', () => {
  it.each([14, 90, 365])('writes a %i-day trial read from the free plan', async (days) => {
    const { service, redemptionCreate } = build(days);
    await service.apply(revoke);
    const data = redemptionCreate.mock.calls[0]?.[0].data;
    expect(data.expiresAt.getTime() - data.startedAt.getTime()).toBe(days * DAY);
  });

  it('falls back to the 30-day default only when the free plan has no length', async () => {
    const { service, redemptionCreate } = build(null);
    await service.apply(revoke);
    const data = redemptionCreate.mock.calls[0]?.[0].data;
    expect(data.expiresAt.getTime() - data.startedAt.getTime()).toBe(30 * DAY);
  });
});
