import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { GenerationJobStorageResult } from '../../../../common/enums/generation-job-storage-result.enum';
import { GenerationJobsService } from '../generation-jobs.service';

const role = (id: string) => ({
  id,
  provider: 'OPENAI',
  model: 'gpt-5',
  maxOutputTokens: 1024,
  fallbacks: [],
});

const request = {
  ownerId: 'owner-1',
  sourceThreadId: 'thread-1',
  idempotencyKey: 'request-1',
  correlationId: 'correlation-1',
  spendCapMicroUsd: '5000000',
  topic: 'A detailed topic for a publication',
  publicationType: ThreadPublicationType.ARTICLE,
  contentLocale: Locale.EN,
  publicIntentVersion: 'threads-public-v1',
  authors: [role('author-1'), role('author-2'), role('author-3')],
  judge: role('judge'),
  critic: role('critic'),
};

const source = (status: string, overrides: Record<string, unknown> = {}) => ({
  id: 'job-old',
  status,
  request,
  sourceSnapshot: { messages: [] },
  sourceSnapshotHash: 'h'.repeat(64),
  ...overrides,
});

function build(repository: Record<string, unknown>) {
  const snapshots = { getOwnedSnapshot: vi.fn() };
  const budgets = {
    reserve: vi.fn().mockResolvedValue({ id: 'budget-2' }),
    close: budgetClose,
  };
  const rabbit = { publishConfirmed: vi.fn().mockResolvedValue(undefined) };
  const service = new GenerationJobsService(
    snapshots as never,
    repository as never,
    rabbit as never,
    {} as never,
    budgets as never,
    { record: vi.fn() } as never,
  );
  return { service, snapshots, budgets };
}

const budgetClose = vi.fn().mockResolvedValue(undefined);

const retryBody = { ownerId: 'owner-1', idempotencyKey: 'retry-1' };

describe('GenerationJobsService owner retry', () => {
  it('creates a new job from the pinned snapshot with the overrides', async () => {
    const repository = {
      findRetrySource: vi.fn().mockResolvedValue(source('FAILED')),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findRetryChild: vi.fn().mockResolvedValue(null),
      createQueued: vi.fn().mockResolvedValue({
        result: GenerationJobStorageResult.SUCCESS,
        job: { id: 'job-new', status: 'RUNNING', correlationId: 'retry:retry-1' },
      }),
    };
    const { service, snapshots, budgets } = build(repository);

    await expect(
      service.retry('job-old', {
        ...retryBody,
        topic: 'A changed topic for the retry',
        spendCapUsd: 3,
      }),
    ).resolves.toEqual({ jobId: 'job-new', status: 'RUNNING' });

    expect(snapshots.getOwnedSnapshot).not.toHaveBeenCalled();
    expect(budgets.reserve).toHaveBeenCalledWith('owner-1', 'retry-1', 3_000_000);
    expect(repository.createQueued).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'retry-1',
        correlationId: 'retry:retry-1',
        topic: 'A changed topic for the retry',
        spendCapMicroUsd: '3000000',
      }),
      { messages: [] },
      'h'.repeat(64),
      'budget-2',
      'job-old',
    );
  });

  it('allows a cancelled job and returns the existing job for a repeated key', async () => {
    const repository = {
      findRetrySource: vi.fn().mockResolvedValue(source('CANCELLED')),
      findByIdempotencyKey: vi.fn().mockResolvedValue({
        result: GenerationJobStorageResult.SUCCESS,
        job: { id: 'job-new', status: 'RUNNING', correlationId: 'c' },
      }),
    };
    const { service, budgets } = build(repository);
    await expect(service.retry('job-old', retryBody)).resolves.toEqual({
      jobId: 'job-new',
      status: 'RUNNING',
    });
    expect(budgets.reserve).not.toHaveBeenCalled();
  });

  it('returns the existing retry child without reserving budget when one already exists', async () => {
    const repository = {
      findRetrySource: vi.fn().mockResolvedValue(source('FAILED')),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findRetryChild: vi.fn().mockResolvedValue({ id: 'job-child', status: 'QUEUED' }),
      createQueued: vi.fn(),
    };
    const { service, budgets } = build(repository);
    await expect(service.retry('job-old', retryBody)).resolves.toEqual({
      jobId: 'job-child',
      status: 'QUEUED',
    });
    expect(repository.findRetrySource).toHaveBeenCalledWith('job-old', 'owner-1');
    expect(repository.findRetryChild).toHaveBeenCalledWith('job-old');
    expect(budgets.reserve).not.toHaveBeenCalled();
    expect(repository.createQueued).not.toHaveBeenCalled();
  });

  it('releases the reserved budget when a concurrent retry wins the unique link', async () => {
    budgetClose.mockClear();
    const repository = {
      findRetrySource: vi.fn().mockResolvedValue(source('FAILED')),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findRetryChild: vi.fn().mockResolvedValue(null),
      createQueued: vi
        .fn()
        .mockResolvedValue({ result: GenerationJobStorageResult.RETRY_CONFLICT }),
    };
    const { service, budgets } = build(repository);
    await expect(service.retry('job-old', retryBody)).rejects.toThrow('already retried');
    expect(budgets.reserve).toHaveBeenCalledTimes(1);
    expect(budgetClose).toHaveBeenCalledWith('budget-2', 'RELEASED');
  });

  it('rejects a reused key whose input changed', async () => {
    const repository = {
      findRetrySource: vi.fn().mockResolvedValue(source('FAILED')),
      findByIdempotencyKey: vi.fn().mockResolvedValue({
        result: GenerationJobStorageResult.CONFLICT,
      }),
    };
    await expect(build(repository).service.retry('job-old', retryBody)).rejects.toThrow(
      'different generation',
    );
  });

  it('answers 404 for a missing job or another owner', async () => {
    const repository = { findRetrySource: vi.fn().mockResolvedValue(null) };
    await expect(build(repository).service.retry('job-old', retryBody)).rejects.toThrow(
      'Generation job not found',
    );
    expect(repository.findRetrySource).toHaveBeenCalledWith('job-old', 'owner-1');
  });

  it.each(['QUEUED', 'RUNNING', 'WAITING_FOR_REVIEW', 'COMPLETED'])(
    'rejects a %s job with 409',
    async (status) => {
      const repository = { findRetrySource: vi.fn().mockResolvedValue(source(status)) };
      await expect(build(repository).service.retry('job-old', retryBody)).rejects.toThrow(
        'Only a failed or cancelled generation can be retried',
      );
    },
  );

  it('rejects a job whose stored request is not a plain generation', async () => {
    const repository = {
      findRetrySource: vi
        .fn()
        .mockResolvedValue(source('FAILED', { request: { kind: 'revision-review' } })),
    };
    await expect(build(repository).service.retry('job-old', retryBody)).rejects.toThrow(
      'cannot be retried',
    );
  });

  it('rejects an unreadable pinned snapshot', async () => {
    const repository = {
      findRetrySource: vi.fn().mockResolvedValue(source('FAILED', { sourceSnapshot: 'text' })),
    };
    await expect(build(repository).service.retry('job-old', retryBody)).rejects.toThrow(
      'Saved source snapshot is invalid',
    );
  });
});

describe('GenerationJobsService owner delete', () => {
  const closed = new Date('2026-10-13T10:00:00.000Z');
  const row = (id: string, status: string, budgetClosedAt: Date | null, parent: string | null) => ({
    id,
    status,
    budgetClosedAt,
    retriedFromJobId: parent,
  });
  type Row = ReturnType<typeof row>;
  const lookup = (rows: Record<string, Row>) =>
    vi.fn().mockImplementation((id: string) => Promise.resolve(rows[id] ?? null));

  it('deletes a finished job with a closed budget', async () => {
    const repository = {
      findDeletable: vi.fn().mockResolvedValue(row('job-1', 'FAILED', closed, null)),
      deleteTerminalChain: vi.fn().mockResolvedValue(true),
    };
    await expect(build(repository).service.deleteJob('job-1', 'owner-1')).resolves.toEqual({
      jobId: 'job-1',
      deleted: true,
    });
    expect(repository.deleteTerminalChain).toHaveBeenCalledWith(['job-1'], 'owner-1');
  });

  it('deletes the whole retry chain in one call', async () => {
    const repository = {
      findDeletable: lookup({
        c: row('c', 'WAITING_FOR_REVIEW', closed, 'b'),
        b: row('b', 'FAILED', closed, 'a'),
        a: row('a', 'CANCELLED', closed, null),
      }),
      deleteTerminalChain: vi.fn().mockResolvedValue(true),
    };
    await build(repository).service.deleteJob('c', 'owner-1');
    expect(repository.deleteTerminalChain).toHaveBeenCalledWith(['c', 'b', 'a'], 'owner-1');
  });

  it('stops walking at a cycle', async () => {
    const repository = {
      findDeletable: lookup({
        b: row('b', 'FAILED', closed, 'a'),
        a: row('a', 'FAILED', closed, 'b'),
      }),
      deleteTerminalChain: vi.fn().mockResolvedValue(true),
    };
    await build(repository).service.deleteJob('b', 'owner-1');
    expect(repository.deleteTerminalChain).toHaveBeenCalledWith(['b', 'a'], 'owner-1');
  });

  it('stops walking at an ancestor that is gone', async () => {
    const repository = {
      findDeletable: lookup({ b: row('b', 'FAILED', closed, 'gone') }),
      deleteTerminalChain: vi.fn().mockResolvedValue(true),
    };
    await build(repository).service.deleteJob('b', 'owner-1');
    expect(repository.deleteTerminalChain).toHaveBeenCalledWith(['b'], 'owner-1');
  });

  it('answers 404 for a missing job or another owner', async () => {
    const repository = { findDeletable: vi.fn().mockResolvedValue(null) };
    await expect(build(repository).service.deleteJob('job-1', 'other')).rejects.toThrow(
      'Generation job not found',
    );
  });

  it.each(['QUEUED', 'RUNNING'])('rejects a %s job with 409', async (status) => {
    const repository = {
      findDeletable: vi.fn().mockResolvedValue(row('job-1', status, null, null)),
      deleteTerminalChain: vi.fn(),
    };
    await expect(build(repository).service.deleteJob('job-1', 'owner-1')).rejects.toThrow(
      'must be cancelled',
    );
    expect(repository.deleteTerminalChain).not.toHaveBeenCalled();
  });

  it('rejects when an ancestor is still running or its budget is open', async () => {
    const rows: Record<string, Row> = {
      b: row('b', 'FAILED', closed, 'a'),
      a: row('a', 'FAILED', null, null),
    };
    const repository = { findDeletable: lookup(rows), deleteTerminalChain: vi.fn() };
    await expect(build(repository).service.deleteJob('b', 'owner-1')).rejects.toThrow(
      'budget is still closing',
    );
    rows['a'] = row('a', 'RUNNING', null, null);
    await expect(build(repository).service.deleteJob('b', 'owner-1')).rejects.toThrow(
      'must be cancelled',
    );
    expect(repository.deleteTerminalChain).not.toHaveBeenCalled();
  });

  it('waits for the budget close instead of dropping the row early', async () => {
    const repository = {
      findDeletable: vi.fn().mockResolvedValue(row('job-1', 'FAILED', null, null)),
      deleteTerminalChain: vi.fn(),
    };
    await expect(build(repository).service.deleteJob('job-1', 'owner-1')).rejects.toThrow(
      'budget is still closing',
    );
    expect(repository.deleteTerminalChain).not.toHaveBeenCalled();
  });

  it('reports a 409 when the chain changed during the delete', async () => {
    const repository = {
      findDeletable: vi.fn().mockResolvedValue(row('job-1', 'FAILED', closed, null)),
      deleteTerminalChain: vi.fn().mockResolvedValue(false),
    };
    await expect(build(repository).service.deleteJob('job-1', 'owner-1')).rejects.toThrow(
      'changed while it was being deleted',
    );
  });
});

describe('GenerationJobsService lease recovery steps', () => {
  it.each([
    ['RETRY', 'RETRY', 'LEASE_EXPIRED'],
    ['FAILED', 'FAILED', 'LEASE_EXPIRED'],
    ['CANCELLED', 'FAILED', 'CANCELLED'],
  ])('records why a %s recovery happened', async (recovery, outcome, code) => {
    const repository = {
      recoverExpiredLeases: vi
        .fn()
        .mockResolvedValue([{ jobId: 'job-1', budgetId: 'budget-1', outcome: recovery }]),
      markBudgetClosed: vi.fn(),
      expireStaleQueuedJobs: vi.fn().mockResolvedValue([]),
      findPendingBudgetClosures: vi.fn().mockResolvedValue([]),
      findUnreportedFailures: vi.fn().mockResolvedValue([]),
      findDispatchable: vi.fn().mockResolvedValue([]),
    };
    const recorder = { record: vi.fn() };
    const service = new GenerationJobsService(
      {} as never,
      repository as never,
      { subscribe: vi.fn() } as never,
      {} as never,
      { close: vi.fn() } as never,
      recorder as never,
    );
    await service.onModuleInit();
    service.onModuleDestroy();
    expect(recorder.record).toHaveBeenCalledWith('job-1', {
      stage: 'GENERATION',
      outcome,
      roleKind: 'SYSTEM',
      code,
    });
  });
});

describe('GenerationJobsService step recording', () => {
  async function run(error: Error | null, outcome: string) {
    let handler: ((event: unknown) => Promise<void>) | undefined;
    const job = {
      id: 'job-1',
      ownerId: 'owner-1',
      budgetId: 'budget-1',
      attemptCount: 1,
      request,
      sourceSnapshot: { messages: [] },
    };
    const repository = {
      claim: vi.fn().mockResolvedValue(job),
      heartbeat: vi.fn().mockResolvedValue(true),
      isCancellationRequested: vi.fn().mockResolvedValue(false),
      retryOrFail: vi.fn().mockResolvedValue(outcome),
      saveResult: vi.fn().mockResolvedValue(true),
      completeAttempt: vi.fn(),
      markBudgetClosed: vi.fn(),
    };
    const rabbit = {
      subscribe: vi.fn().mockImplementation(async (_pattern, callback) => {
        handler = callback;
      }),
      publishConfirmed: vi.fn(),
    };
    const pipeline = {
      generate: error
        ? vi.fn().mockRejectedValue(error)
        : vi.fn().mockResolvedValue({ markdown: '# done', rounds: 2 }),
    };
    const recorder = { record: vi.fn() };
    const service = new GenerationJobsService(
      {} as never,
      repository as never,
      rabbit as never,
      pipeline as never,
      { close: vi.fn() } as never,
      recorder as never,
    );
    await service.subscribe();
    await handler?.({ jobId: 'job-1', correlationId: 'correlation-1' });
    return recorder;
  }

  it('records the upstream code and status on a final failure', async () => {
    const recorder = await run(
      new Error('Chat model request failed (402: PAYG_CREDIT_EXHAUSTED)'),
      'FAILED',
    );
    expect(recorder.record).toHaveBeenCalledWith('job-1', {
      stage: 'GENERATION',
      outcome: 'FAILED',
      roleKind: 'SYSTEM',
      code: 'PAYG_CREDIT_EXHAUSTED',
      httpStatus: 402,
    });
  });

  it('records a scheduled retry', async () => {
    const recorder = await run(new Error('Chat model request failed (500)'), 'RETRY');
    expect(recorder.record).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ outcome: 'RETRY', code: 'PROVIDER_ERROR', httpStatus: 500 }),
    );
  });

  it('records nothing extra when the retry bookkeeping found no running job', async () => {
    const recorder = await run(new Error('boom'), 'MISSING');
    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('records the ready step on success', async () => {
    const recorder = await run(null, 'unused');
    expect(recorder.record).toHaveBeenCalledWith('job-1', {
      stage: 'READY_FOR_REVIEW',
      round: 2,
      outcome: 'SUCCEEDED',
      roleKind: 'SYSTEM',
    });
  });
});
