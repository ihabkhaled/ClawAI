import { type PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RoutingEducationRepository } from '../repositories/routing-education.repository';
import type {
  RouterModelProfileRecord,
  RouterTopicProfileRecord,
} from '../types/routing-education.types';

const modelProfileRow = (
  overrides: Partial<RouterModelProfileRecord> = {},
): RouterModelProfileRecord => ({
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4',
  taskFamily: 'coding',
  topicKey: 'coding',
  routeCount: 4,
  successRate: 0.8,
  thumbsUpRate: 0.5,
  thumbsDownRate: 0.1,
  judgeVerifiedRate: 0.6,
  judgeRevisedRate: 0.1,
  judgeEscalatedRate: 0.05,
  averageLatencyMs: 1200,
  averageCostEstimate: 0.01,
  fallbackSuccessRate: 0.2,
  hallucinationRiskScore: 0.02,
  calibrationTrustScore: 0.75,
  weightedSuccessScore: 0.8,
  weightedDissatisfactionScore: 0.05,
  sampleSize: 4,
  confidenceInProfile: 0.7,
  scoreVersion: 'calibration-1',
  successRateLowerBound: 0.4,
  successRateUpperBound: 0.95,
  evaluatorVersions: ['judge-v1'],
  ...overrides,
});

const topicProfileRow = (
  overrides: Partial<RouterTopicProfileRecord> = {},
): RouterTopicProfileRecord => ({
  taskFamily: 'coding',
  topicKey: 'coding',
  bestProvider: 'ANTHROPIC',
  bestModel: 'claude-sonnet-4',
  routeCount: 4,
  successRate: 0.8,
  thumbsUpRate: 0.5,
  thumbsDownRate: 0.1,
  judgeVerifiedRate: 0.6,
  judgeEscalatedRate: 0.05,
  fallbackSuccessRate: 0.2,
  weightedSuccessScore: 0.8,
  ambiguityScore: 0.1,
  confidenceInProfile: 0.7,
  scoreVersion: 'calibration-1',
  successRateLowerBound: 0.4,
  successRateUpperBound: 0.95,
  evaluatorVersions: ['judge-v1'],
  ...overrides,
});

const buildRepo = (): {
  repository: RoutingEducationRepository;
  prisma: {
    routingCalibrationSnapshot: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    routerModelProfile: { deleteMany: jest.Mock; createMany: jest.Mock };
    routerTopicProfile: { deleteMany: jest.Mock; createMany: jest.Mock };
    routerWorkspacePrior: { findUnique: jest.Mock; upsert: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
} => {
  const routingCalibrationSnapshot = {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    create: jest
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'snap-1', generatedAt: new Date(), ...data }),
      ),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const routerModelProfile = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  };
  const routerTopicProfile = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  };
  const routerWorkspacePrior = {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest
      .fn()
      .mockImplementation(({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'prior-1', ...create }),
      ),
  };

  const prisma = {
    routingCalibrationSnapshot,
    routerModelProfile,
    routerTopicProfile,
    routerWorkspacePrior,
    // The advisory lock that serialises the replace. Returns a resolved value
    // so it can sit inside the $transaction array like any PrismaPromise.
    $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: '' }]),
    // Mirrors Prisma's array-form $transaction: resolve each already-created
    // PrismaPromise and return the results in order, so commitCalibrationBatch
    // can destructure the created snapshot out of the batch.
    $transaction: jest
      .fn()
      .mockImplementation((operations: Array<Promise<unknown>>) => Promise.all(operations)),
  };

  return {
    repository: new RoutingEducationRepository(prisma as unknown as PrismaService),
    prisma,
  };
};

describe('RoutingEducationRepository.commitCalibrationBatch', () => {
  it('deactivates prior snapshots, creates the new one, and replaces both live tables in one transaction', async () => {
    const { repository, prisma } = buildRepo();

    const snapshot = await repository.commitCalibrationBatch({
      version: 'calibration-2',
      windowDays: 30,
      summary: { decisionsAnalyzed: 4 },
      promptHints: { bestModelsByTaskFamily: [] },
      modelProfiles: [modelProfileRow()],
      topicProfiles: [topicProfileRow()],
      modelProfileRows: [modelProfileRow()],
      topicProfileRows: [topicProfileRow()],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.routingCalibrationSnapshot.updateMany).toHaveBeenCalledWith({
      data: { active: false },
      where: { active: true },
    });
    expect(prisma.routingCalibrationSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 'calibration-2', active: true }),
      }),
    );
    expect(prisma.routerModelProfile.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.routerModelProfile.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ provider: 'ANTHROPIC' })],
      }),
    );
    expect(prisma.routerTopicProfile.deleteMany).toHaveBeenCalledTimes(1);
    expect(snapshot.version).toBe('calibration-2');
  });

  it('takes the advisory lock as the FIRST statement in the transaction', async () => {
    // Regression guard. Without this lock, two concurrent rebuilds interleave:
    // the second transaction's DELETE snapshot predates the first's COMMIT, so
    // it removes only the rows it can see and its INSERT then violates
    // `router_model_profiles_provider_model_task_family_topic_key_key`. The
    // P2002 is an unhandled rejection that kills routing-service outright, and
    // `rebuildCalibrationSnapshot()` runs after EVERY routing outcome, so the
    // exposure is every pair of concurrent generations. Observed twice in a
    // long-thread stress run on 2026-08-30.
    //
    // Order is the whole point: a lock taken after the DELETE would let the
    // race happen before it ever blocks anything.
    const { repository, prisma } = buildRepo();

    await repository.commitCalibrationBatch({
      version: 'calibration-3',
      windowDays: 30,
      summary: { decisionsAnalyzed: 1 },
      promptHints: { bestModelsByTaskFamily: [] },
      modelProfiles: [modelProfileRow()],
      topicProfiles: [topicProfileRow()],
      modelProfileRows: [modelProfileRow()],
      topicProfileRows: [topicProfileRow()],
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const [operations] = prisma.$transaction.mock.calls[0] as [unknown[]];
    expect(operations).toHaveLength(7);
    expect(operations[0]).toBe(prisma.$queryRaw.mock.results[0]?.value);
  });
});

describe('RoutingEducationRepository.restoreCalibrationSnapshot', () => {
  it('reactivates the target version and replaces both live tables', async () => {
    const { repository, prisma } = buildRepo();

    await repository.restoreCalibrationSnapshot({
      version: 'calibration-1',
      modelProfileRows: [modelProfileRow()],
      topicProfileRows: [topicProfileRow()],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // The rollback path replaces the same tables the same way, so it is exposed
    // to the same race and takes the same lock first.
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.routingCalibrationSnapshot.updateMany).toHaveBeenNthCalledWith(1, {
      data: { active: false },
      where: { active: true },
    });
    expect(prisma.routingCalibrationSnapshot.updateMany).toHaveBeenNthCalledWith(2, {
      data: { active: true },
      where: { version: 'calibration-1' },
    });
    expect(prisma.routerModelProfile.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [expect.objectContaining({ provider: 'ANTHROPIC' })] }),
    );
  });
});

describe('RoutingEducationRepository snapshot lookups', () => {
  it('getCalibrationSnapshotByVersion queries by version, most recent first', async () => {
    const { repository, prisma } = buildRepo();
    prisma.routingCalibrationSnapshot.findFirst.mockResolvedValue({ version: 'calibration-1' });

    const result = await repository.getCalibrationSnapshotByVersion('calibration-1');

    expect(prisma.routingCalibrationSnapshot.findFirst).toHaveBeenCalledWith({
      where: { version: 'calibration-1' },
      orderBy: { generatedAt: 'desc' },
    });
    expect(result).toEqual({ version: 'calibration-1' });
  });

  it('getPreviousCalibrationSnapshot returns the second-most-recent row', async () => {
    const { repository, prisma } = buildRepo();
    prisma.routingCalibrationSnapshot.findMany.mockResolvedValue([
      { version: 'calibration-2' },
      { version: 'calibration-1' },
    ]);

    const result = await repository.getPreviousCalibrationSnapshot();

    expect(prisma.routingCalibrationSnapshot.findMany).toHaveBeenCalledWith({
      orderBy: { generatedAt: 'desc' },
      take: 2,
    });
    expect(result).toEqual({ version: 'calibration-1' });
  });

  it('getPreviousCalibrationSnapshot returns null when there is only one snapshot', async () => {
    const { repository, prisma } = buildRepo();
    prisma.routingCalibrationSnapshot.findMany.mockResolvedValue([{ version: 'calibration-1' }]);

    const result = await repository.getPreviousCalibrationSnapshot();

    expect(result).toBeNull();
  });
});

// V6 learning evolution (ADR-070)
describe('RoutingEducationRepository workspace priors', () => {
  it('findWorkspacePrior queries by the exact composite key, scoped to one workspace', async () => {
    const { repository, prisma } = buildRepo();

    await repository.findWorkspacePrior('ws-1', 'ANTHROPIC', 'claude-sonnet-4', 'coding');

    expect(prisma.routerWorkspacePrior.findUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_provider_model_taskFamily: {
          workspaceId: 'ws-1',
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          taskFamily: 'coding',
        },
      },
    });
  });

  it('upsertWorkspacePrior creates on first observation and updates on the same composite key thereafter', async () => {
    const { repository, prisma } = buildRepo();

    await repository.upsertWorkspacePrior({
      workspaceId: 'ws-1',
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
      taskFamily: 'coding',
      routeCount: 1,
      successRate: 1,
      confidenceInPrior: 0.1,
      scoreVersion: null,
    });

    expect(prisma.routerWorkspacePrior.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId_provider_model_taskFamily: {
            workspaceId: 'ws-1',
            provider: 'ANTHROPIC',
            model: 'claude-sonnet-4',
            taskFamily: 'coding',
          },
        },
        create: expect.objectContaining({ workspaceId: 'ws-1', routeCount: 1 }),
        update: expect.objectContaining({ routeCount: 1 }),
      }),
    );
  });
});
