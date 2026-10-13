import { Logger } from '@nestjs/common';

import {
  BUDGET_CLOSE_MAX_ATTEMPTS,
  budgetCloseDelayMs,
  GENERATION_RECOVERY_INTERVAL_MS,
} from '../../constants/generation.constants';
import { GenerationBudgetCloser } from '../generation-budget-closer';
import { GenerationJobsService } from '../generation-jobs.service';
import { ThreadBudgetCloseRefusedError } from '../../utilities/thread-budget-close-refused.error';
import { GenerationBudgetCloseStatus } from '../../../../common/enums/generation-budget-close-status.enum';

type StoredJob = {
  id: string;
  budgetId: string;
  status: string;
  attempts: number;
  nextAt: number | null;
  closedAt: number | null;
  closeStatus: string | null;
};

/** The repository contract for budget closing, with the real back-off and limit. */
function createStore(now: () => number) {
  const jobs = new Map<string, StoredJob>();
  return {
    jobs,
    add: (job: Partial<StoredJob> & { id: string }) =>
      jobs.set(job.id, {
        budgetId: `budget-${job.id}`,
        status: 'CANCELLED',
        attempts: 0,
        nextAt: null,
        closedAt: null,
        closeStatus: null,
        ...job,
      }),
    repository: {
      recoverExpiredLeases: vi.fn().mockResolvedValue([]),
      expireStaleQueuedJobs: vi.fn().mockResolvedValue([]),
      findUnreportedFailures: vi.fn().mockResolvedValue([]),
      findDispatchable: vi.fn().mockResolvedValue([]),
      findPendingBudgetClosures: vi.fn(async () =>
        [...jobs.values()]
          .filter((job) => job.closedAt === null && (job.nextAt === null || job.nextAt <= now()))
          .map((job) => ({ id: job.id, budgetId: job.budgetId, status: job.status })),
      ),
      markBudgetClosed: vi.fn(async (id: string, status: string) => {
        const job = jobs.get(id);
        if (job?.closedAt === null) {
          job.closedAt = now();
          job.closeStatus = status;
        }
      }),
      recordBudgetCloseFailure: vi.fn(async (id: string) => {
        const job = jobs.get(id);
        if (job?.closedAt !== null) return null;
        job.attempts += 1;
        const abandoned = job.attempts >= BUDGET_CLOSE_MAX_ATTEMPTS;
        if (abandoned) {
          job.closedAt = now();
          job.closeStatus = 'CLOSE_ABANDONED';
          job.nextAt = null;
        } else {
          job.nextAt = now() + budgetCloseDelayMs(job.attempts);
        }
        return { attempts: job.attempts, abandoned };
      }),
    },
  };
}

function build(closeImpl: () => Promise<void>) {
  const clock = { now: Date.now() };
  const store = createStore(() => clock.now);
  const budgets = { close: vi.fn(closeImpl) };
  const service = new GenerationJobsService(
    {} as never,
    store.repository as never,
    { publishConfirmed: vi.fn() } as never,
    {} as never,
    budgets as never,
    { record: vi.fn() } as never,
  );
  const sweep = async (): Promise<void> => {
    await service['reconcileQueue']();
  };
  const advance = (ms: number): void => {
    clock.now += ms;
  };
  return { store, budgets, sweep, advance, now: () => clock.now };
}

describe('bounded budget close retries after a cancel (browser D-05)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries a refused close a bounded number of times with growing gaps, then stops', async () => {
    const run = build(() => Promise.reject(new ThreadBudgetCloseRefusedError()));
    run.store.add({ id: 'job-1' });
    const closeTimes: number[] = [];
    run.budgets.close.mockImplementation(async () => {
      closeTimes.push(run.now());
      throw new ThreadBudgetCloseRefusedError();
    });

    // Six hours of 15 s sweeps; the old behaviour would have closed 1,440 times.
    for (let elapsed = 0; elapsed < 6 * 3_600_000; elapsed += GENERATION_RECOVERY_INTERVAL_MS) {
      await run.sweep();
      run.advance(GENERATION_RECOVERY_INTERVAL_MS);
    }

    expect(run.budgets.close).toHaveBeenCalledTimes(BUDGET_CLOSE_MAX_ATTEMPTS);
    const job = run.store.jobs.get('job-1');
    expect(job?.closeStatus).toBe('CLOSE_ABANDONED');
    expect(job?.closedAt).not.toBeNull();
    const gaps = closeTimes.slice(1).map((time, index) => time - (closeTimes[index] ?? 0));
    expect(gaps.every((gap, index) => index === 0 || gap >= (gaps[index - 1] ?? 0))).toBe(true);
  });

  it('logs the reason once at the start and once when it gives up, nothing in between', async () => {
    const run = build(() => Promise.reject(new ThreadBudgetCloseRefusedError()));
    run.store.add({ id: 'job-1' });

    for (let sweep = 0; sweep < 400; sweep += 1) {
      await run.sweep();
      run.advance(GENERATION_RECOVERY_INTERVAL_MS);
    }

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('refused to close it');
    expect(String(warn.mock.calls[0]?.[0])).toContain('job-1');
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0]?.[0])).toContain(
      `${String(BUDGET_CLOSE_MAX_ATTEMPTS)} tries`,
    );
  });

  it('says the budget service was unreachable when it was', async () => {
    const run = build(() => Promise.reject(new Error('connect ECONNREFUSED')));
    run.store.add({ id: 'job-1' });

    await run.sweep();

    expect(String(warn.mock.calls[0]?.[0])).toContain('could not be reached or failed');
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('ECONNREFUSED');
  });

  it('stops as soon as the budget closes, and never touches a closed job again', async () => {
    let attempt = 0;
    const run = build(async () => {
      attempt += 1;
      if (attempt < 3) throw new ThreadBudgetCloseRefusedError();
    });
    run.store.add({ id: 'job-1' });

    for (let sweep = 0; sweep < 200; sweep += 1) {
      await run.sweep();
      run.advance(GENERATION_RECOVERY_INTERVAL_MS);
    }

    expect(run.budgets.close).toHaveBeenCalledTimes(3);
    expect(run.store.jobs.get('job-1')?.closeStatus).toBe(GenerationBudgetCloseStatus.RELEASED);
    expect(error).not.toHaveBeenCalled();
  });

  it('finalizes a job that is waiting for review and releases a cancelled one', async () => {
    const run = build(() => Promise.resolve());
    run.store.add({ id: 'kept', status: 'WAITING_FOR_REVIEW' });
    run.store.add({ id: 'dropped', status: 'CANCELLED' });

    await run.sweep();

    expect(run.budgets.close).toHaveBeenCalledWith('budget-kept', 'FINALIZED');
    expect(run.budgets.close).toHaveBeenCalledWith('budget-dropped', 'RELEASED');
  });

  it('does not let a failing counter write break the sweep', async () => {
    const run = build(() => Promise.reject(new Error('down')));
    run.store.add({ id: 'job-1' });
    run.store.repository.recordBudgetCloseFailure.mockRejectedValue(new Error('db down'));

    await expect(run.sweep()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('stays quiet when another replica already counted the same failure', async () => {
    const closer = new GenerationBudgetCloser(
      { close: vi.fn().mockRejectedValue(new Error('x')) } as never,
      {
        markBudgetClosed: vi.fn(),
        recordBudgetCloseFailure: vi.fn().mockResolvedValue(null),
      } as never,
    );

    await closer.close('job-1', 'budget-1', GenerationBudgetCloseStatus.RELEASED);

    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
