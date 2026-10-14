import { createHealingBudget } from '../healing-budget.utility';
import { waitBeforeRetry } from '../wait-before-retry.utility';
import { ThreadGenerationCancelledError } from '../thread-generation-cancelled.error';
import { MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT } from '../../constants/healing.constants';

describe('waitBeforeRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the wait', async () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const waiting = waitBeforeRetry(5000, undefined).then(done);
    await vi.advanceTimersByTimeAsync(4999);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(done).toHaveBeenCalled();
  });

  it('ends at once with the cancel error when the job is cancelled during the wait', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const waiting = waitBeforeRetry(30_000, controller.signal);
    const caught = waiting.catch((error: unknown) => error);
    controller.abort(new ThreadGenerationCancelledError());
    expect(await caught).toBeInstanceOf(ThreadGenerationCancelledError);
  });

  it('refuses to start when the job is already cancelled', async () => {
    const controller = new AbortController();
    controller.abort(new ThreadGenerationCancelledError());
    await expect(waitBeforeRetry(10, controller.signal)).rejects.toBeInstanceOf(
      ThreadGenerationCancelledError,
    );
  });
});

describe('createHealingBudget', () => {
  it('starts every job attempt with the full allowance and the job’s cap and spend', () => {
    expect(createHealingBudget({ spendCapMicroUsd: 1000, spentMicroUsd: 40 } as never)).toEqual({
      jobAttemptsLeft: MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT,
      spendCapMicroUsd: 1000,
      spentMicroUsd: 40,
    });
  });

  it('has no cap guard for a job without a known cap', () => {
    expect(createHealingBudget({} as never)).toMatchObject({
      spendCapMicroUsd: null,
      spentMicroUsd: 0,
    });
  });
});
