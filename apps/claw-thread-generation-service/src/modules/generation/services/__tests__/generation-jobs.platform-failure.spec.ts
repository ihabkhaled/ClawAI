import { GenerationBudgetCloseStatus } from '../../../../common/enums/generation-budget-close-status.enum';
import { GenerationJobRecoveryOutcome } from '../../../../common/enums/generation-job-recovery-outcome.enum';
import { GenerationJobsService } from '../generation-jobs.service';

function build(overrides: Record<string, unknown> = {}) {
  const repository = {
    retryOrFail: vi.fn().mockResolvedValue(GenerationJobRecoveryOutcome.FAILED),
    recoverExpiredLeases: vi.fn().mockResolvedValue([]),
    expireStaleQueuedJobs: vi.fn().mockResolvedValue([]),
    findPendingBudgetClosures: vi.fn().mockResolvedValue([]),
    findLastFailureCode: vi.fn().mockResolvedValue(null),
    syncSpend: vi.fn().mockResolvedValue(undefined),
    markBudgetClosed: vi.fn().mockResolvedValue(undefined),
    recordBudgetCloseFailure: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
  const budgets = {
    close: vi.fn().mockResolvedValue(undefined),
    spentMicroUsd: vi.fn().mockResolvedValue(0),
  };
  const service = new GenerationJobsService(
    {} as never,
    repository as never,
    { publishConfirmed: vi.fn() } as never,
    {} as never,
    budgets as never,
    { record: vi.fn() } as never,
  );
  return { service, repository, budgets };
}

const job = { id: 'job-1', budgetId: 'budget-1', attemptCount: 1 };

function codedError(code: string): Error {
  return new Error(`Chat model request failed (502: ${code})`);
}

describe('platform-caused failures refund the Free allowance', () => {
  it.each([
    ['CLOUD_PROVIDER_UNAVAILABLE', GenerationBudgetCloseStatus.PLATFORM_FAILED],
    ['OUTPUT_INVALID', GenerationBudgetCloseStatus.PLATFORM_FAILED],
    ['PAYG_CAP_TOO_LOW', GenerationBudgetCloseStatus.RELEASED],
    ['PAYG_CREDIT_EXHAUSTED', GenerationBudgetCloseStatus.RELEASED],
  ])('a failed attempt coded %s closes the budget as %s', async (code, expected) => {
    const { service, budgets } = build();

    await service['handleFailedAttempt'](job as never, codedError(code));

    expect(budgets.close).toHaveBeenCalledWith('budget-1', expected);
  });

  it('a draft that did not pass review keeps the allowance spent', async () => {
    const { service, budgets } = build();

    await service['handleFailedAttempt'](
      job as never,
      new Error('Generation did not pass consensus and reviews'),
    );

    expect(budgets.close).toHaveBeenCalledWith('budget-1', GenerationBudgetCloseStatus.RELEASED);
  });

  it('a retry that is scheduled closes nothing', async () => {
    const { service, budgets } = build({
      retryOrFail: vi.fn().mockResolvedValue(GenerationJobRecoveryOutcome.RETRY),
    });

    await service['handleFailedAttempt'](job as never, codedError('PROVIDER_ERROR'));

    expect(budgets.close).not.toHaveBeenCalled();
  });

  it('an owner cancel keeps the allowance spent', async () => {
    const { service, budgets } = build({
      retryOrFail: vi.fn().mockResolvedValue(GenerationJobRecoveryOutcome.CANCELLED),
    });

    await service['handleCancelledAttempt'](job as never);

    expect(budgets.close).toHaveBeenCalledWith('budget-1', GenerationBudgetCloseStatus.RELEASED);
  });

  it('an expired lease is a platform failure, a recovered cancel is not', async () => {
    const { service, budgets } = build({
      recoverExpiredLeases: vi.fn().mockResolvedValue([
        { jobId: 'a', budgetId: 'budget-a', outcome: GenerationJobRecoveryOutcome.FAILED },
        { jobId: 'b', budgetId: 'budget-b', outcome: GenerationJobRecoveryOutcome.CANCELLED },
        { jobId: 'c', budgetId: 'budget-c', outcome: GenerationJobRecoveryOutcome.RETRY },
      ]),
    });

    await service['recoverAbandonedJobs']();

    expect(budgets.close).toHaveBeenCalledWith(
      'budget-a',
      GenerationBudgetCloseStatus.PLATFORM_FAILED,
    );
    expect(budgets.close).toHaveBeenCalledWith('budget-b', GenerationBudgetCloseStatus.RELEASED);
    expect(budgets.close).not.toHaveBeenCalledWith('budget-c', expect.anything());
  });

  it('queue expiry is a platform failure', async () => {
    const { service, budgets } = build({
      expireStaleQueuedJobs: vi.fn().mockResolvedValue([{ jobId: 'q', budgetId: 'budget-q' }]),
    });

    await service['recoverAbandonedJobs']();

    expect(budgets.close).toHaveBeenCalledWith(
      'budget-q',
      GenerationBudgetCloseStatus.PLATFORM_FAILED,
    );
  });

  it.each([
    ['WAITING_FOR_REVIEW', null, GenerationBudgetCloseStatus.FINALIZED],
    ['CANCELLED', 'PROVIDER_ERROR', GenerationBudgetCloseStatus.RELEASED],
    ['FAILED', 'MODEL_IDLE_TIMEOUT', GenerationBudgetCloseStatus.PLATFORM_FAILED],
    ['FAILED', 'REVIEW_NOT_PASSED', GenerationBudgetCloseStatus.RELEASED],
    ['FAILED', 'PAYG_CAP_TOO_LOW', GenerationBudgetCloseStatus.RELEASED],
    ['FAILED', null, GenerationBudgetCloseStatus.RELEASED],
  ])('the sweep closes a %s job whose last failure is %s as %s', async (status, code, expected) => {
    const { service, budgets } = build({
      findPendingBudgetClosures: vi
        .fn()
        .mockResolvedValue([{ id: 'job-1', budgetId: 'budget-1', status }]),
      findLastFailureCode: vi.fn().mockResolvedValue(code),
    });

    await service['sweepBudgetClosures']();

    expect(budgets.close).toHaveBeenCalledWith('budget-1', expected);
  });

  it('the sweep falls back to RELEASED when the failure code cannot be read', async () => {
    const { service, budgets } = build({
      findPendingBudgetClosures: vi
        .fn()
        .mockResolvedValue([{ id: 'job-1', budgetId: 'budget-1', status: 'FAILED' }]),
      findLastFailureCode: vi.fn().mockRejectedValue(new Error('db down')),
    });

    await service['sweepBudgetClosures']();

    expect(budgets.close).toHaveBeenCalledWith('budget-1', GenerationBudgetCloseStatus.RELEASED);
  });

  it('persists the close status that was sent, after syncing the Free spend', async () => {
    const { service, repository, budgets } = build();
    budgets.spentMicroUsd.mockResolvedValue(4_100);

    await service['handleFailedAttempt'](job as never, codedError('PROVIDER_ERROR'));

    expect(repository.syncSpend).toHaveBeenCalledWith('job-1', 4_100);
    expect(repository.markBudgetClosed).toHaveBeenCalledWith(
      'job-1',
      GenerationBudgetCloseStatus.PLATFORM_FAILED,
    );
  });
});
