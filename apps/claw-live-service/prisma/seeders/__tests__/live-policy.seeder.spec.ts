/// <reference types="vitest/globals" />
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const seeder = require('../live-policy.seeder.cjs') as {
  run: (prisma: unknown) => Promise<{ inserted: boolean; reason: string }>;
  DEFAULT_POLICY_CONFIG: Record<string, unknown> & {
    plans: Record<string, { freeSecondsPerMonth: number; paidMicroUsdPerMinute: number }>;
  };
};

describe('live policy seeder', () => {
  it('inserts the active version 1 when the table is empty', async () => {
    const prisma = {
      livePolicyVersion: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    };

    await expect(seeder.run(prisma)).resolves.toMatchObject({ inserted: true });
    expect(prisma.livePolicyVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        version: 1,
        activeKey: 'active',
        note: 'seed v1 (owner decision 2026-11-22)',
        config: seeder.DEFAULT_POLICY_CONFIG,
      }),
    });
  });

  it('never touches an existing policy', async () => {
    const prisma = {
      livePolicyVersion: { count: vi.fn().mockResolvedValue(2), create: vi.fn() },
    };

    await expect(seeder.run(prisma)).resolves.toMatchObject({ inserted: false });
    expect(prisma.livePolicyVersion.create).not.toHaveBeenCalled();
  });

  it('carries the owner numbers: free seconds per plan and 20000 micro-USD a minute', () => {
    const { plans } = seeder.DEFAULT_POLICY_CONFIG;
    expect(Object.keys(plans)).toEqual([
      'free',
      'starter',
      'plus',
      'pro',
      'team',
      'scale',
      'unlimited',
      'admin',
    ]);
    expect(plans['free']?.freeSecondsPerMonth).toBe(1800);
    expect(plans['starter']?.freeSecondsPerMonth).toBe(7200);
    expect(plans['plus']?.freeSecondsPerMonth).toBe(18000);
    expect(plans['unlimited']?.freeSecondsPerMonth).toBe(36000);
    // Staff accounts use the 'admin' plan slug; without it they fell to defaultPlan (0 s).
    expect(plans['admin']?.freeSecondsPerMonth).toBe(36000);
    for (const entry of Object.values(plans)) expect(entry.paidMicroUsdPerMinute).toBe(20000);
    expect(seeder.DEFAULT_POLICY_CONFIG).toMatchObject({
      killSwitch: false,
      visionBilling: 'ACTUAL_COST',
      graceSeconds: 60,
      maxActiveStreams: 20,
      maxSessionsPerUser: 3,
      sessionsPerUserPerHour: 30,
      dailyBudgetMicroUsd: 20000000,
      budgetSoftStopPercent: 80,
      featureEnabled: true,
    });
  });
});
