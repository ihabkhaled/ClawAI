import { GenerationJobsRepository } from '../generation-jobs.repository';
import { ThreadGenerationStatus } from '../../../../generated/prisma';

function buildRepository(overrides: Record<string, unknown> = {}) {
  const tx = {
    threadGenerationJob: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue({ id: 'job-1', attemptCount: 1 }),
      findFirst: vi.fn().mockResolvedValue({ cancelRequestedAt: null }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    threadGenerationWorkerSlot: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    threadGenerationAttempt: {
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  };
  const prisma = {
    ...tx,
    $transaction: vi.fn(async (operation: (transaction: typeof tx) => unknown) => operation(tx)),
  };
  return { repository: new GenerationJobsRepository(prisma as never), tx };
}

describe('GenerationJobsRepository recovery', () => {
  it('claims a durable slot and records an incremented attempt', async () => {
    const { repository, tx } = buildRepository();

    const job = await repository.claim('job-1', 'worker-1');

    expect(job).toEqual({ id: 'job-1', attemptCount: 1 });
    expect(tx.threadGenerationJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'job-1',
          status: ThreadGenerationStatus.QUEUED,
          attemptCount: { lt: 3 },
        }),
      }),
    );
    expect(tx.threadGenerationWorkerSlot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slotId: 'threads-worker-1' }),
        data: expect.objectContaining({ jobId: 'job-1', workerId: 'worker-1' }),
      }),
    );
    expect(tx.threadGenerationAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { jobId: 'job-1', attempt: 1, workerId: 'worker-1' } }),
    );
  });

  it('returns a claimed job to the queue without consuming an attempt when all slots are busy', async () => {
    const { repository, tx } = buildRepository({
      threadGenerationWorkerSlot: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    });

    expect(await repository.claim('job-1', 'worker-1')).toBeNull();
    expect(tx.threadGenerationWorkerSlot.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.threadGenerationJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ThreadGenerationStatus.QUEUED,
          attemptCount: { decrement: 1 },
          leaseOwner: null,
        }),
      }),
    );
    expect(tx.threadGenerationAttempt.create).not.toHaveBeenCalled();
  });

  it('schedules a bounded retry and releases its worker slot without closing the budget', async () => {
    const { repository, tx } = buildRepository();

    expect(await repository.retryOrFail('job-1', 1)).toBe('RETRY');
    expect(tx.threadGenerationJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ThreadGenerationStatus.QUEUED,
          safeErrorCode: 'GENERATION_ATTEMPT_RETRY',
          nextAttemptAt: expect.any(Date),
          leaseOwner: null,
        }),
      }),
    );
    expect(tx.threadGenerationAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ outcome: 'RETRY' }) }),
    );
    expect(tx.threadGenerationWorkerSlot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobId: 'job-1' } }),
    );
  });

  it('fails the job after the third attempt instead of scheduling unbounded retries', async () => {
    const { repository, tx } = buildRepository();

    expect(await repository.retryOrFail('job-1', 3)).toBe('FAILED');
    expect(tx.threadGenerationJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ThreadGenerationStatus.FAILED,
          safeErrorCode: 'GENERATION_FAILED',
          completedAt: expect.any(Date),
        }),
      }),
    );
    expect(tx.threadGenerationAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ outcome: 'FAILED' }) }),
    );
  });

  it('recovers an expired worker lease to a delayed queue retry', async () => {
    const { repository, tx } = buildRepository();
    tx.threadGenerationJob.findMany.mockResolvedValue([
      { id: 'job-1', budgetId: 'budget-1', attemptCount: 1, cancelRequestedAt: null },
    ]);

    expect(await repository.recoverExpiredLeases()).toEqual([
      { jobId: 'job-1', budgetId: 'budget-1', outcome: 'RETRY' },
    ]);
    expect(tx.threadGenerationJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'job-1',
          status: ThreadGenerationStatus.RUNNING,
          leaseExpiresAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
        data: expect.objectContaining({
          status: ThreadGenerationStatus.QUEUED,
          safeErrorCode: 'GENERATION_WORKER_LOST',
          nextAttemptAt: expect.any(Date),
        }),
      }),
    );
    expect(tx.threadGenerationWorkerSlot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobId: 'job-1' } }),
    );
  });

  it('does not reclaim or release a lease refreshed while the recovery scan was reading', async () => {
    const { repository, tx } = buildRepository();
    tx.threadGenerationJob.findMany.mockResolvedValue([
      { id: 'job-1', budgetId: 'budget-1', attemptCount: 1, cancelRequestedAt: null },
    ]);
    tx.threadGenerationJob.updateMany.mockResolvedValue({ count: 0 });

    expect(await repository.recoverExpiredLeases()).toEqual([]);
    expect(tx.threadGenerationAttempt.updateMany).not.toHaveBeenCalled();
    expect(tx.threadGenerationWorkerSlot.updateMany).not.toHaveBeenCalled();
  });
});
