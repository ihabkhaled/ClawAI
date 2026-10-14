import { ServiceUnavailableException } from '@nestjs/common';

import { GenerationJobRecoveryOutcome } from '../../../../common/enums/generation-job-recovery-outcome.enum';
import { GenerationJobsService } from '../generation-jobs.service';
import { CandidatesExhaustedError } from '../../utilities/candidates-exhausted.error';

function build(repositoryOverrides: Record<string, unknown> = {}) {
  const repository = {
    recoverExpiredLeases: vi.fn().mockResolvedValue([]),
    expireStaleQueuedJobs: vi.fn().mockResolvedValue([]),
    findPendingBudgetClosures: vi.fn().mockResolvedValue([]),
    findUnreportedFailures: vi.fn().mockResolvedValue([]),
    findDispatchable: vi.fn().mockResolvedValue([]),
    markBudgetClosed: vi.fn().mockResolvedValue(undefined),
    recordBudgetCloseFailure: vi.fn().mockResolvedValue(null),
    retryOrFail: vi.fn().mockResolvedValue(GenerationJobRecoveryOutcome.FAILED),
    ...repositoryOverrides,
  };
  const budgets = { close: vi.fn().mockResolvedValue(undefined) };
  const recorder = { record: vi.fn().mockResolvedValue(undefined) };
  const service = new GenerationJobsService(
    {} as never,
    repository as never,
    { publishConfirmed: vi.fn() } as never,
    {} as never,
    budgets as never,
    recorder as never,
  );
  return { service, repository, budgets, recorder };
}

describe('GenerationJobsService stale job recovery', () => {
  it('fails an expired queued job with a coded step and releases its budget', async () => {
    const { service, repository, budgets, recorder } = build({
      expireStaleQueuedJobs: vi.fn().mockResolvedValue([{ jobId: 'old-1', budgetId: 'budget-1' }]),
    });

    await service['reconcileQueue']();

    expect(budgets.close).toHaveBeenCalledWith('budget-1', 'PLATFORM_FAILED');
    expect(repository.markBudgetClosed).toHaveBeenCalledWith('old-1', 'PLATFORM_FAILED');
    expect(recorder.record).toHaveBeenCalledWith('old-1', {
      stage: 'GENERATION',
      outcome: 'FAILED',
      roleKind: 'SYSTEM',
      code: 'QUEUE_EXPIRED',
    });
  });

  it('is idempotent: a pass that finds nothing stale closes and records nothing', async () => {
    const { service, budgets, recorder } = build();

    await service['reconcileQueue']();
    await service['reconcileQueue']();

    expect(budgets.close).not.toHaveBeenCalled();
    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('keeps the budget open when releasing it fails, so the sweep retries it later', async () => {
    const { service, repository, budgets } = build({
      expireStaleQueuedJobs: vi.fn().mockResolvedValue([{ jobId: 'old-1', budgetId: 'budget-1' }]),
      recordBudgetCloseFailure: vi.fn().mockResolvedValue({ attempts: 1, abandoned: false }),
    });
    budgets.close.mockRejectedValue(new Error('auth down'));

    await service['reconcileQueue']();

    expect(repository.markBudgetClosed).not.toHaveBeenCalled();
    expect(repository.recordBudgetCloseFailure).toHaveBeenCalledWith('old-1');
  });

  it('keeps going after a lease recovery and an expired job in the same pass', async () => {
    const { service, budgets, recorder } = build({
      recoverExpiredLeases: vi.fn().mockResolvedValue([
        {
          jobId: 'lost-1',
          budgetId: 'budget-lost',
          outcome: GenerationJobRecoveryOutcome.FAILED,
        },
      ]),
      expireStaleQueuedJobs: vi
        .fn()
        .mockResolvedValue([{ jobId: 'old-1', budgetId: 'budget-old' }]),
    });

    await service['reconcileQueue']();

    expect(budgets.close).toHaveBeenCalledWith('budget-lost', 'PLATFORM_FAILED');
    expect(budgets.close).toHaveBeenCalledWith('budget-old', 'PLATFORM_FAILED');
    expect(recorder.record).toHaveBeenCalledWith(
      'lost-1',
      expect.objectContaining({ code: 'LEASE_EXPIRED' }),
    );
  });

  it('asks the dispatch query for the fair batch size', async () => {
    const { service, repository } = build();

    await service['reconcileQueue']();

    expect(repository.findDispatchable).toHaveBeenCalledWith(10);
  });
});

describe('GenerationJobsService terminal failure after every candidate failed', () => {
  const job = { id: 'job-1', budgetId: 'budget-1', attemptCount: 3 };
  const exhausted = new CandidatesExhaustedError(
    [
      { provider: 'GEMINI', model: 'g', code: 'OUTPUT_INVALID', httpStatus: null },
      { provider: 'OLLAMA', model: 'o', code: 'OUTPUT_INVALID', httpStatus: null },
      { provider: 'OPENROUTER', model: 'r', code: 'PROVIDER_ERROR', httpStatus: 400 },
    ],
    new Error('Chat model request failed (400)'),
  );

  it('records the primary cause as the terminal code and the per-candidate summary as the excerpt', async () => {
    const { service, repository, recorder } = build();

    await service['handleFailedAttempt'](
      job as never,
      new ServiceUnavailableException('An author role failed', { cause: exhausted }),
    );

    expect(recorder.record).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        stage: 'GENERATION',
        outcome: 'FAILED',
        code: 'OUTPUT_INVALID',
        httpStatus: null,
        rawExcerpt: expect.stringContaining('Main cause: OUTPUT_INVALID (2 of 3)'),
      }),
    );
    const summary = repository.retryOrFail.mock.calls[0]?.[2] as string;
    expect(summary).toContain('OPENROUTER/r: PROVIDER_ERROR (HTTP 400)');
    expect(summary.length).toBeLessThanOrEqual(400);
  });

  it('adds no excerpt for an ordinary failure', async () => {
    const { service, recorder } = build();

    await service['handleFailedAttempt'](
      job as never,
      new Error('Chat model request failed (503)'),
    );

    expect(recorder.record).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ code: 'PROVIDER_ERROR', httpStatus: 503, rawExcerpt: undefined }),
    );
  });

  it('keeps the same terminal code when the attempt is retried instead of failed', async () => {
    const { service, recorder } = build({
      retryOrFail: vi.fn().mockResolvedValue(GenerationJobRecoveryOutcome.RETRY),
    });

    await service['handleFailedAttempt'](job as never, exhausted);

    expect(recorder.record).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ outcome: 'RETRY', code: 'OUTPUT_INVALID' }),
    );
  });
});
