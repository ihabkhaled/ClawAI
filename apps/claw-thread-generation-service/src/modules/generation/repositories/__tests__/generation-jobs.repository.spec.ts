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
  it('returns the pinned job for the same owner request without comparing a fresh snapshot', async () => {
    const { repository, tx } = buildRepository();
    const input = { ownerId: 'owner-1', idempotencyKey: 'request-1', topic: 'original' };
    tx.threadGenerationJob.findUnique.mockResolvedValue({
      id: 'job-1',
      ownerId: 'owner-1',
      request: input,
      status: ThreadGenerationStatus.RUNNING,
    });

    await expect(repository.findByIdempotencyKey(input as never)).resolves.toMatchObject({
      result: 'SUCCESS',
      job: { id: 'job-1', status: ThreadGenerationStatus.RUNNING },
    });
    expect(tx.threadGenerationJob.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: 'request-1' },
      select: { id: true, ownerId: true, request: true, status: true, correlationId: true },
    });
  });

  it('rejects another owner or a changed request using an existing idempotency key', async () => {
    const { repository, tx } = buildRepository();
    tx.threadGenerationJob.findUnique.mockResolvedValue({
      id: 'job-1',
      ownerId: 'owner-2',
      request: { ownerId: 'owner-2', idempotencyKey: 'request-1', topic: 'other' },
    });

    await expect(
      repository.findByIdempotencyKey({
        ownerId: 'owner-1',
        idempotencyKey: 'request-1',
        topic: 'other',
      } as never),
    ).resolves.toEqual({ result: 'CONFLICT' });
  });

  it('persists review jobs with the parent snapshot and saved evidence bundle', async () => {
    const parent = {
      id: 'parent-job',
      ownerId: 'owner-1',
      sourceThreadId: 'thread-1',
      sourceSnapshot: { messages: [{ role: 'USER', content: 'Original source' }] },
      sourceSnapshotHash: 'a'.repeat(64),
      evidenceBundle: { items: [{ id: 'source-1', url: 'https://example.test/source' }] },
      evidenceBundleHash: 'b'.repeat(64),
      evidenceVersion: 1,
      publicIntentVersion: 'threads-public-v1',
      publicIntentAt: new Date('2026-10-05T12:00:00.000Z'),
      request: {
        ownerId: 'owner-1',
        sourceThreadId: 'thread-1',
        idempotencyKey: 'generation-key',
        correlationId: 'generation-correlation',
        spendCapMicroUsd: '5000000',
        topic: 'A sufficiently detailed topic',
        publicationType: 'article',
        publicIntentVersion: 'threads-public-v1',
        authors: [
          {
            id: 'author-1',
            provider: 'OPENAI',
            model: 'gpt-5',
            maxOutputTokens: 1024,
            fallbacks: [],
          },
          {
            id: 'author-2',
            provider: 'ANTHROPIC',
            model: 'claude',
            maxOutputTokens: 1024,
            fallbacks: [],
          },
          {
            id: 'author-3',
            provider: 'GEMINI',
            model: 'gemini',
            maxOutputTokens: 1024,
            fallbacks: [],
          },
        ],
        judge: {
          id: 'judge',
          provider: 'MISTRAL',
          model: 'mistral',
          maxOutputTokens: 1024,
          fallbacks: [],
        },
        critic: {
          id: 'critic',
          provider: 'DEEPSEEK',
          model: 'deepseek',
          maxOutputTokens: 1024,
          fallbacks: [],
        },
      },
    };
    const jobDelegate = {
      findFirst: vi.fn().mockResolvedValue(parent),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockResolvedValue({ id: 'review-job', status: ThreadGenerationStatus.QUEUED }),
    };
    const repository = new GenerationJobsRepository({ threadGenerationJob: jobDelegate } as never);
    const input = {
      ownerId: 'owner-1',
      parentJobId: 'parent-job',
      idempotencyKey: 'edit-key',
      correlationId: 'edit-correlation',
      spendCapMicroUsd: '2500000',
      draft: {
        markdown: '# Edited draft',
        citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
      },
    };

    await expect(
      repository.createRevisionReviewQueued(input, 'review-budget'),
    ).resolves.toMatchObject({
      result: 'SUCCESS',
      job: { id: 'review-job', status: ThreadGenerationStatus.QUEUED },
    });
    expect(jobDelegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceThreadId: 'thread-1',
        sourceSnapshot: parent.sourceSnapshot,
        sourceSnapshotHash: parent.sourceSnapshotHash,
        evidenceBundle: parent.evidenceBundle,
        evidenceBundleHash: parent.evidenceBundleHash,
        budgetId: 'review-budget',
        spendCapMicroUsd: 2500000n,
        request: expect.objectContaining({
          kind: 'revision-review',
          parentJobId: 'parent-job',
          authors: parent.request.authors,
          judge: parent.request.judge,
          critic: parent.request.critic,
        }),
      }),
    });
  });

  it('treats changed owner edit requests as idempotency conflicts', async () => {
    const request = {
      kind: 'revision-review',
      ownerId: 'owner-1',
      parentJobId: 'parent-job',
      idempotencyKey: 'edit-key',
      correlationId: 'edit-correlation',
      spendCapMicroUsd: '2500000',
      draft: {
        markdown: '# First',
        citations: [{ evidenceId: 'e-1', url: 'https://example.test/e' }],
      },
    };
    const { repository, tx } = buildRepository();
    tx.threadGenerationJob.findUnique.mockResolvedValue({
      id: 'review-job',
      ownerId: 'owner-1',
      request: { ...request, topic: 'saved topic', authors: [], judge: {}, critic: {} },
      status: ThreadGenerationStatus.QUEUED,
      correlationId: 'edit-correlation',
    });

    await expect(
      repository.findRevisionReviewByIdempotencyKey({
        ...request,
        spendCapMicroUsd: '3000000',
      } as never),
    ).resolves.toEqual({ result: 'CONFLICT' });
  });

  it('loads only the requesting owner’s safe job state and completed draft', async () => {
    const { repository, tx } = buildRepository();

    await repository.findOwnerState('job-1', 'owner-1');

    expect(tx.threadGenerationJob.findFirst).toHaveBeenCalledWith({
      where: { id: 'job-1', ownerId: 'owner-1' },
      select: expect.objectContaining({
        safeErrorCode: true,
        revisions: expect.any(Object),
      }),
    });
  });

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
