import { Locale } from '@claw/shared-types';

import { GenerationJobRecoveryOutcome } from '../../../../common/enums/generation-job-recovery-outcome.enum';
import { GenerationJobsService } from '../generation-jobs.service';
import { abortReasonToError } from '../../utilities/abort-reason-error.utility';
import { ThreadGenerationCancelledError } from '../../utilities/thread-generation-cancelled.error';

const role = (id: string) => ({
  id,
  provider: 'OPENAI',
  model: 'gpt-5',
  maxOutputTokens: 1024,
  fallbacks: [],
});

const job = {
  id: 'job-1',
  ownerId: 'owner-1',
  budgetId: 'budget-1',
  attemptCount: 1,
  request: {
    ownerId: 'owner-1',
    sourceThreadId: 'thread-1',
    idempotencyKey: 'request-1',
    correlationId: 'correlation-1',
    spendCapMicroUsd: '5000000',
    topic: 'A detailed topic for a publication',
    publicationType: 'article',
    contentLocale: Locale.EN,
    publicIntentVersion: 'threads-public-v1',
    authors: [role('author-1'), role('author-2'), role('author-3')],
    judge: role('judge'),
    critic: role('critic'),
  },
  sourceSnapshot: { messages: [] },
};

/** A pipeline whose model call is in flight until the job's signal aborts it. */
function runningJob(repositoryOverrides: Record<string, unknown> = {}) {
  let handler: ((event: unknown) => Promise<void>) | undefined;
  const seen: { signal?: AbortSignal } = {};
  const repository = {
    claim: vi.fn().mockResolvedValue(job),
    heartbeat: vi.fn().mockResolvedValue(true),
    isCancellationRequested: vi.fn().mockResolvedValue(false),
    retryOrFail: vi.fn().mockResolvedValue(GenerationJobRecoveryOutcome.CANCELLED),
    markBudgetClosed: vi.fn(),
    ...repositoryOverrides,
  };
  const pipeline = {
    generate: vi.fn().mockImplementation(
      (input: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          seen.signal = input.signal;
          input.signal?.addEventListener('abort', () => {
            reject(abortReasonToError(input.signal?.reason));
          });
        }),
    ),
  };
  const budgets = { close: vi.fn() };
  const recorder = { record: vi.fn().mockResolvedValue(undefined) };
  const rabbit = {
    subscribe: vi.fn().mockImplementation((_pattern: unknown, callback: typeof handler) => {
      handler = callback;
      return Promise.resolve();
    }),
  };
  const service = new GenerationJobsService(
    {} as never,
    repository as never,
    rabbit as never,
    pipeline as never,
    budgets as never,
    recorder as never,
  );
  const start = async (): Promise<{ running: Promise<void> }> => {
    await service.subscribe();
    const running =
      handler?.({ jobId: 'job-1', correlationId: 'correlation-1' }) ?? Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    return { running };
  };
  return { repository, budgets, recorder, seen, start };
}

describe('GenerationJobsService cancellation of a running job', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hands the pipeline a signal that is not aborted while nobody cancels', async () => {
    const run = runningJob();
    const { running } = await run.start();

    await vi.advanceTimersByTimeAsync(10_000);

    expect(run.seen.signal?.aborted).toBe(false);
    expect(run.repository.isCancellationRequested).toHaveBeenCalled();
    run.repository.isCancellationRequested.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(2_000);
    await running;
  });

  it('aborts the call in flight within one 2 s poll of a cancel request', async () => {
    const run = runningJob();
    const { running } = await run.start();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(run.seen.signal?.aborted).toBe(false);

    run.repository.isCancellationRequested.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(run.seen.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(run.seen.signal?.aborted).toBe(true);
    expect(run.seen.signal?.reason).toBeInstanceOf(ThreadGenerationCancelledError);
    await running;
  });

  it('settles the cancelled attempt and releases the budget once the call has stopped', async () => {
    const run = runningJob();
    const { running } = await run.start();

    run.repository.isCancellationRequested.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(2_000);
    await running;

    expect(run.repository.retryOrFail).toHaveBeenCalledWith('job-1', 1);
    expect(run.budgets.close).toHaveBeenCalledWith('budget-1', 'RELEASED');
    expect(run.recorder.record).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ outcome: 'FAILED', code: 'CANCELLED' }),
    );
  });

  it('aborts the call in flight when the lease is lost, and leaves the job to its new owner', async () => {
    const run = runningJob({ heartbeat: vi.fn().mockResolvedValue(false) });
    const { running } = await run.start();

    await vi.advanceTimersByTimeAsync(20_000);
    await running;

    expect(run.seen.signal?.aborted).toBe(true);
    expect(run.repository.retryOrFail).not.toHaveBeenCalled();
    expect(run.budgets.close).not.toHaveBeenCalled();
  });

  it('keeps polling after a failed check', async () => {
    const run = runningJob();
    const { running } = await run.start();
    run.repository.isCancellationRequested.mockRejectedValueOnce(new Error('database down'));

    await vi.advanceTimersByTimeAsync(2_000);
    expect(run.seen.signal?.aborted).toBe(false);
    run.repository.isCancellationRequested.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(run.seen.signal?.aborted).toBe(true);
    await running;
  });

  it('stops polling once the job has ended', async () => {
    const run = runningJob();
    const { running } = await run.start();
    run.repository.isCancellationRequested.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(2_000);
    await running;
    const checks = run.repository.isCancellationRequested.mock.calls.length;

    await vi.advanceTimersByTimeAsync(60_000);

    expect(run.repository.isCancellationRequested).toHaveBeenCalledTimes(checks);
    expect(vi.getTimerCount()).toBe(0);
  });
});
