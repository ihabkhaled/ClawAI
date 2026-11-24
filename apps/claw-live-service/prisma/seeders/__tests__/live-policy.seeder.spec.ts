/// <reference types="vitest/globals" />
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const seeder = require('../live-policy.seeder.cjs') as {
  run: (prisma: unknown) => Promise<{ inserted: boolean; reason: string }>;
  PLATFORMS_ADDED_2026_11_24: string[];
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

  const existingPolicy = (config: Record<string, unknown>) => {
    const tx = {
      livePolicyVersion: {
        aggregate: vi.fn().mockResolvedValue({ _max: { version: 11 } }),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
    };
    const prisma = {
      livePolicyVersion: {
        count: vi.fn().mockResolvedValue(11),
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({ version: 11, config }),
      },
      $transaction: vi.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
    return { prisma, tx };
  };

  it('never touches a current policy (an administrator choice stays)', async () => {
    const { prisma, tx } = existingPolicy({
      serverPullPlatforms: ['TWITCH'],
      recordedVideoMaxSeconds: 0,
    });

    await expect(seeder.run(prisma)).resolves.toMatchObject({ inserted: false });
    expect(prisma.livePolicyVersion.create).not.toHaveBeenCalled();
    expect(tx.livePolicyVersion.create).not.toHaveBeenCalled();
  });

  it('upgrades an older active policy once: the 24 new platforms and the 3-hour recorded cap', async () => {
    const { prisma, tx } = existingPolicy({
      killSwitch: false,
      serverPullPlatforms: ['TWITCH', 'FACEBOOK'],
    });

    await expect(seeder.run(prisma)).resolves.toMatchObject({ inserted: true });
    expect(tx.livePolicyVersion.updateMany).toHaveBeenCalledWith({
      where: { activeKey: 'active' },
      data: { activeKey: null },
    });
    const { data } = tx.livePolicyVersion.create.mock.calls[0]?.[0] as {
      data: { version: number; config: Record<string, unknown> };
    };
    expect(data.version).toBe(12);
    expect(data.config).toMatchObject({ killSwitch: false, recordedVideoMaxSeconds: 10800 });
    expect(data.config['serverPullPlatforms']).toEqual([
      'TWITCH',
      'FACEBOOK',
      ...seeder.PLATFORMS_ADDED_2026_11_24,
    ]);
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
