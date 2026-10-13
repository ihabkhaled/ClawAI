import { type Prisma, ThreadGenerationStatus } from '../../../../generated/prisma';
import {
  BUDGET_CLOSE_ABANDONED_STATUS,
  BUDGET_CLOSE_MAX_ATTEMPTS,
  budgetCloseDelayMs,
  GENERATION_OWNER_MAX_RUNNING,
  GENERATION_QUEUE_MAX_AGE_MS,
  GENERATION_STALE_BATCH,
} from '../../constants/generation.constants';
import { GenerationJobsRepository } from '../generation-jobs.repository';

const NOW = new Date('2026-10-14T10:00:00.000Z');

function build() {
  const job = {
    findFirst: vi.fn().mockResolvedValue({ ownerId: 'owner-1' }),
    findUnique: vi.fn().mockResolvedValue({ id: 'job-1', attemptCount: 1, evidenceBundle: {} }),
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    count: vi.fn().mockResolvedValue(0),
  };
  const tx = {
    threadGenerationJob: job,
    threadGenerationWorkerSlot: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    threadGenerationAttempt: { create: vi.fn().mockResolvedValue({}) },
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
  const prisma = {
    threadGenerationJob: job,
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(async (operation: (transaction: typeof tx) => unknown) => operation(tx)),
  };
  return { repository: new GenerationJobsRepository(prisma as never), tx, job, prisma };
}

describe('GenerationJobsRepository fair claim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('takes the owner lock before counting that owner running jobs', async () => {
    const { repository, tx, job } = build();
    const order: string[] = [];
    tx.$executeRaw.mockImplementation(async () => {
      order.push('lock');
      return 1;
    });
    job.count.mockImplementation(async () => {
      order.push('count');
      return 0;
    });

    await repository.claim('job-1', 'worker-1');

    expect(order).toEqual(['lock', 'count']);
    expect(job.count).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1', status: ThreadGenerationStatus.RUNNING },
    });
  });

  it('leaves a job queued, untouched, when its owner already runs the maximum', async () => {
    const { repository, tx, job } = build();
    job.count.mockResolvedValue(GENERATION_OWNER_MAX_RUNNING);

    await expect(repository.claim('job-1', 'worker-1')).resolves.toBeNull();

    expect(job.updateMany).not.toHaveBeenCalled();
    expect(tx.threadGenerationWorkerSlot.updateMany).not.toHaveBeenCalled();
    expect(tx.threadGenerationAttempt.create).not.toHaveBeenCalled();
  });

  it('claims while the owner is under the maximum', async () => {
    const { repository, job } = build();
    job.count.mockResolvedValue(GENERATION_OWNER_MAX_RUNNING - 1);

    await expect(repository.claim('job-1', 'worker-1')).resolves.toMatchObject({ id: 'job-1' });
  });

  it('does not lock or count for a job that is not runnable', async () => {
    const { repository, tx, job } = build();
    job.findFirst.mockResolvedValue(null);

    await expect(repository.claim('job-1', 'worker-1')).resolves.toBeNull();

    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(job.count).not.toHaveBeenCalled();
  });

  it('serialises same-owner claims: a claim that lost the race sees the winner and defers', async () => {
    const { repository, tx, job } = build();
    // The lock is a real queue here: the second claim only proceeds after the first commits.
    let holder: Promise<void> = Promise.resolve();
    let running = 0;
    tx.$executeRaw.mockImplementation(() => {
      const previous = holder;
      let release: () => void = () => {};
      holder = new Promise<void>((resolve) => {
        release = resolve;
      });
      releaseByTransaction.push(release);
      return previous.then(() => 1);
    });
    const releaseByTransaction: Array<() => void> = [];
    job.count.mockImplementation(async () => running);
    job.updateMany.mockImplementation(async (args: { data: { status?: string } }) => {
      if (args.data.status === ThreadGenerationStatus.RUNNING) running += 1;
      return { count: 1 };
    });
    // Each transaction releases the lock when its claim call settles (commit).
    const claims = Array.from({ length: 4 }, (_, index) =>
      repository.claim('job-1', `worker-${String(index)}`).finally(() => {
        releaseByTransaction[index]?.();
      }),
    );
    const results = await Promise.all(claims);

    expect(results.filter((claimed) => claimed !== null)).toHaveLength(
      GENERATION_OWNER_MAX_RUNNING,
    );
  });
});

describe('GenerationJobsRepository fair dispatch', () => {
  it('asks for one job per owner per round, skipping owners at the cap, bounded by the limit', async () => {
    const { repository, prisma } = build();
    prisma.$queryRaw.mockResolvedValue([{ id: 'a1' }, { id: 'b1' }]);

    await expect(repository.findDispatchable(10)).resolves.toEqual([{ id: 'a1' }, { id: 'b1' }]);

    const query = prisma.$queryRaw.mock.calls[0]?.[0] as Prisma.Sql;
    expect(query.sql).toContain('PARTITION BY j."owner_id"');
    expect(query.sql).toContain('ORDER BY ranked.owner_rank');
    expect(query.sql).toContain('j."status" = \'QUEUED\'');
    expect(query.sql).toContain('r."status" = \'RUNNING\'');
    expect(query.values).toContain(10);
    expect(query.values).toContain(GENERATION_OWNER_MAX_RUNNING);
  });
});

describe('GenerationJobsRepository bounded budget close', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('only sweeps closures whose back-off has passed', async () => {
    const { repository, job } = build();

    await repository.findPendingBudgetClosures(10);

    expect(job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          budgetClosedAt: null,
          OR: [{ budgetCloseNextAt: null }, { budgetCloseNextAt: { lte: NOW } }],
        }),
      }),
    );
  });

  it.each([
    [0, 1, 15_000],
    [1, 2, 30_000],
    [2, 3, 60_000],
    [6, 7, 960_000],
  ])('after %i failures, failure %i backs off %i ms', async (before, attempts, delay) => {
    const { repository, job } = build();
    job.findFirst.mockResolvedValue({ budgetCloseAttempts: before });

    await expect(repository.recordBudgetCloseFailure('job-1')).resolves.toEqual({
      attempts,
      abandoned: false,
    });

    expect(job.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', budgetClosedAt: null, budgetCloseAttempts: before },
      data: {
        budgetCloseAttempts: attempts,
        budgetCloseNextAt: new Date(NOW.getTime() + delay),
      },
    });
    expect(budgetCloseDelayMs(attempts)).toBe(delay);
  });

  it('gives up at the limit: the job is marked closed with an abandoned status', async () => {
    const { repository, job } = build();
    job.findFirst.mockResolvedValue({ budgetCloseAttempts: BUDGET_CLOSE_MAX_ATTEMPTS - 1 });

    await expect(repository.recordBudgetCloseFailure('job-1')).resolves.toEqual({
      attempts: BUDGET_CLOSE_MAX_ATTEMPTS,
      abandoned: true,
    });

    expect(job.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'job-1', budgetClosedAt: null }),
      data: {
        budgetCloseAttempts: BUDGET_CLOSE_MAX_ATTEMPTS,
        budgetCloseStatus: BUDGET_CLOSE_ABANDONED_STATUS,
        budgetClosedAt: NOW,
        budgetCloseNextAt: null,
      },
    });
  });

  it('counts nothing for a job that is already closed, or when another replica counted first', async () => {
    const { repository, job } = build();
    job.findFirst.mockResolvedValueOnce(null);
    await expect(repository.recordBudgetCloseFailure('job-1')).resolves.toBeNull();

    job.findFirst.mockResolvedValueOnce({ budgetCloseAttempts: 2 });
    job.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(repository.recordBudgetCloseFailure('job-1')).resolves.toBeNull();
  });

  it('caps the back-off at 30 minutes', () => {
    expect(budgetCloseDelayMs(20)).toBe(30 * 60_000);
    expect(budgetCloseDelayMs(0)).toBe(15_000);
  });
});

describe('GenerationJobsRepository stale jobs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fails jobs queued past the limit, guarded by status and age, in a bounded batch', async () => {
    const { repository, job } = build();
    const cutoff = new Date(NOW.getTime() - GENERATION_QUEUE_MAX_AGE_MS);
    job.findMany.mockResolvedValue([
      { id: 'old-1', budgetId: 'budget-1' },
      { id: 'old-2', budgetId: 'budget-2' },
    ]);
    job.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await expect(repository.expireStaleQueuedJobs()).resolves.toEqual([
      { jobId: 'old-1', budgetId: 'budget-1' },
    ]);

    expect(job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: ThreadGenerationStatus.QUEUED, nextAttemptAt: { lte: cutoff } },
        take: GENERATION_STALE_BATCH,
      }),
    );
    expect(job.updateMany).toHaveBeenCalledWith({
      where: { status: ThreadGenerationStatus.QUEUED, nextAttemptAt: { lte: cutoff }, id: 'old-1' },
      data: expect.objectContaining({
        status: ThreadGenerationStatus.FAILED,
        failureSummary: 'QUEUE_EXPIRED',
        completedAt: NOW,
      }),
    });
  });

  it('is idempotent: a second pass over nothing changes nothing', async () => {
    const { repository, job } = build();

    await expect(repository.expireStaleQueuedJobs()).resolves.toEqual([]);

    expect(job.updateMany).not.toHaveBeenCalled();
  });

  it('recovers a RUNNING job with no lease once it was untouched for a lease plus the grace', async () => {
    const { repository, job, tx } = build();
    job.findMany.mockResolvedValue([
      { id: 'job-1', budgetId: 'budget-1', attemptCount: 3, cancelRequestedAt: null },
    ]);
    (tx as Record<string, unknown>)['threadGenerationAttempt'] = {
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    (tx.threadGenerationWorkerSlot as Record<string, unknown>)['updateMany'] = vi
      .fn()
      .mockResolvedValue({ count: 1 });

    const recovered = await repository.recoverExpiredLeases();

    expect(recovered).toEqual([{ jobId: 'job-1', budgetId: 'budget-1', outcome: 'FAILED' }]);
    const untouchedSince = new Date(NOW.getTime() - 90_000 - 5 * 60_000);
    expect(job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ThreadGenerationStatus.RUNNING,
          OR: [
            { leaseExpiresAt: { lte: NOW } },
            { leaseExpiresAt: null, updatedAt: { lte: untouchedSince } },
          ],
        },
      }),
    );
    expect(job.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ThreadGenerationStatus.FAILED,
          failureSummary: 'LEASE_EXPIRED',
        }),
      }),
    );
  });
});
