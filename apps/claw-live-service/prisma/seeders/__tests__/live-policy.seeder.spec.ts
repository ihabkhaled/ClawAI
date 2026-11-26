/// <reference types="vitest/globals" />
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const seeder = require('../live-policy.seeder.cjs') as {
  run: (prisma: unknown) => Promise<{ inserted: boolean; reason: string }>;
  PLATFORMS_ADDED_2026_11_24: string[];
  PLATFORMS_ADDED_2026_11_26: string[];
  DEFAULT_COUNCIL_MODEL_CHAIN: unknown[];
  UPGRADE_NOTE: string;
  COUNCIL_UPGRADE_NOTE: string;
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
        aggregate: vi
          .fn()
          .mockResolvedValueOnce({ _max: { version: 11 } })
          .mockResolvedValueOnce({ _max: { version: 12 } }),
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
      councilModelChain: [
        { connector: 'OLLAMA', model: 'gemma4:31b', style: 'OLLAMA' },
        { connector: 'OLLAMA', model: 'deepseek-v4.1-flash', style: 'OLLAMA' },
      ],
    });

    await expect(seeder.run(prisma)).resolves.toMatchObject({ inserted: false });
    expect(prisma.livePolicyVersion.create).not.toHaveBeenCalled();
    expect(tx.livePolicyVersion.create).not.toHaveBeenCalled();
  });

  type CreatedVersion = {
    data: { version: number; note: string; config: Record<string, unknown> };
  };
  const createdVersions = (create: ReturnType<typeof vi.fn>): CreatedVersion['data'][] =>
    create.mock.calls.map((call) => (call[0] as CreatedVersion).data);

  it('upgrades a 2026-11-22 policy twice in order: platforms + recorded cap, then the council', async () => {
    const { prisma, tx } = existingPolicy({
      killSwitch: false,
      serverPullPlatforms: ['TWITCH', 'FACEBOOK'],
    });

    await expect(seeder.run(prisma)).resolves.toMatchObject({ inserted: true });
    expect(tx.livePolicyVersion.updateMany).toHaveBeenCalledWith({
      where: { activeKey: 'active' },
      data: { activeKey: null },
    });
    const [first, second] = createdVersions(tx.livePolicyVersion.create);
    expect(first?.version).toBe(12);
    expect(first?.note).toBe(seeder.UPGRADE_NOTE);
    expect(first?.config).toMatchObject({ killSwitch: false, recordedVideoMaxSeconds: 10800 });
    expect(first?.config).not.toHaveProperty('councilModelChain');
    expect(first?.config['serverPullPlatforms']).toEqual([
      'TWITCH',
      'FACEBOOK',
      ...seeder.PLATFORMS_ADDED_2026_11_24,
    ]);
    expect(second?.version).toBe(13);
    expect(second?.note).toBe('seed upgrade: council agents (owner decision 2026-11-26)');
    expect(second?.config).toMatchObject({
      ...first?.config,
      councilModelChain: seeder.DEFAULT_COUNCIL_MODEL_CHAIN,
      serverPullPlatforms: [
        'TWITCH',
        'FACEBOOK',
        ...seeder.PLATFORMS_ADDED_2026_11_24,
        ...seeder.PLATFORMS_ADDED_2026_11_26,
      ],
    });
  });

  it('leaves server pull off when the admin turned it off (an empty list)', async () => {
    const { prisma, tx } = existingPolicy({ serverPullPlatforms: [], recordedVideoMaxSeconds: 0 });
    await seeder.run(prisma);
    expect(createdVersions(tx.livePolicyVersion.create)[0]?.config['serverPullPlatforms']).toEqual(
      [],
    );
  });

  it('adds the council and the new platforms to a 2026-11-24 policy, keeping every admin value', async () => {
    const { prisma, tx } = existingPolicy({
      killSwitch: true,
      serverPullPlatforms: ['TWITCH'],
      recordedVideoMaxSeconds: 0,
    });

    await expect(seeder.run(prisma)).resolves.toMatchObject({ inserted: true });
    const created = createdVersions(tx.livePolicyVersion.create);
    expect(created).toHaveLength(1);
    expect(created[0]).toEqual({
      version: 12,
      activeKey: 'active',
      note: seeder.COUNCIL_UPGRADE_NOTE,
      config: {
        killSwitch: true,
        serverPullPlatforms: ['TWITCH', ...seeder.PLATFORMS_ADDED_2026_11_26],
        recordedVideoMaxSeconds: 0,
        councilModelChain: [
          { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' },
        ],
      },
    });
  });

  it('seeds version 1 with the default council of one agent', () => {
    expect(seeder.DEFAULT_POLICY_CONFIG['councilModelChain']).toEqual([
      { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' },
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
