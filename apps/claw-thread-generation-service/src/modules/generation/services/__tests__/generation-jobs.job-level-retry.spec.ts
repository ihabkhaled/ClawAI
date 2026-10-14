import { GenerationJobRecoveryOutcome } from '../../../../common/enums/generation-job-recovery-outcome.enum';
import { GenerationJobsService } from '../generation-jobs.service';

function build() {
  const repository = {
    retryOrFail: vi.fn().mockResolvedValue(GenerationJobRecoveryOutcome.RETRY),
    findLastFailureCode: vi.fn().mockResolvedValue(null),
    syncSpend: vi.fn().mockResolvedValue(undefined),
    markBudgetClosed: vi.fn().mockResolvedValue(undefined),
    recordBudgetCloseFailure: vi.fn().mockResolvedValue(null),
  };
  const service = new GenerationJobsService(
    {} as never,
    repository as never,
    { publishConfirmed: vi.fn() } as never,
    {} as never,
    {
      close: vi.fn().mockResolvedValue(undefined),
      spentMicroUsd: vi.fn().mockResolvedValue(0),
    } as never,
    { record: vi.fn() } as never,
  );
  return { service, repository };
}

const job = { id: 'job-1', budgetId: 'budget-1', attemptCount: 1 };
const failure = (status: number, code: string): Error =>
  new Error(`Chat model request failed (${String(status)}: ${code})`);

/** The retry flag the service passes to retryOrFail: false fails the job on this attempt. */
async function retryableFlag(error: Error): Promise<unknown> {
  const { service, repository } = build();
  await service['handleFailedAttempt'](job as never, error);
  return repository.retryOrFail.mock.calls[0]?.[3];
}

describe('which failures are worth another whole attempt (ADR-181)', () => {
  it.each([
    ['PROVIDER_RATE_LIMITED', 429],
    ['PROVIDER_UNAVAILABLE', 503],
    ['OUTPUT_INVALID', 502],
    ['CLOUD_PROVIDER_REQUEST_FAILED', 400],
  ])('retries %s', async (code, status) => {
    expect(await retryableFlag(failure(status, code))).toBe(true);
  });

  it.each([
    ['PAYG_CREDIT_EXHAUSTED', 402],
    ['PAYG_CAP_TOO_LOW', 402],
    ['PAYG_PRICING_UNAVAILABLE', 402],
    ['PROVIDER_REQUEST_TOO_LARGE', 413],
    ['CONTENT_FILTERED_SAFETY', 400],
    ['THREAD_GENERATION_NOT_IN_PLAN', 403],
  ])('fails %s on the first attempt: nothing changes between attempts', async (code, status) => {
    expect(await retryableFlag(failure(status, code))).toBe(false);
  });
});
