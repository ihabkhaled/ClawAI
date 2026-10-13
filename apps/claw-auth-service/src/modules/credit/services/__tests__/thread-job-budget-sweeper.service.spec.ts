import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  THREAD_BUDGET_STALE_AFTER_MS,
  THREAD_BUDGET_SWEEP_BATCH_SIZE,
  THREAD_BUDGET_SWEEP_INTERVAL_MS,
} from '../../../entitlements/constants/thread-job-budget-retry.constants';
import { ThreadJobBudgetCloseStatus } from '../../enums/thread-job-budget-close-status.enum';
import { ThreadJobBudgetSweeperService } from '../thread-job-budget-sweeper.service';

describe('ThreadJobBudgetSweeperService', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const redis = { acquireLock: vi.fn(), releaseLock: vi.fn() };
  const repository = { findStaleActive: vi.fn(), findStrandedFeatureReservationIds: vi.fn() };
  const budgets = { close: vi.fn() };
  const featureUsage = { settle: vi.fn() };
  const build = (): ThreadJobBudgetSweeperService =>
    new ThreadJobBudgetSweeperService(
      redis as never,
      repository as never,
      budgets as never,
      featureUsage as never,
    );

  beforeEach(() => {
    vi.resetAllMocks();
    redis.acquireLock.mockResolvedValue(true);
    redis.releaseLock.mockResolvedValue(true);
    repository.findStaleActive.mockResolvedValue([]);
    repository.findStrandedFeatureReservationIds.mockResolvedValue([]);
    budgets.close.mockResolvedValue(true);
    featureUsage.settle.mockResolvedValue(undefined);
  });

  it('closes every stale ACTIVE budget as RELEASED, which also returns the allowance', async () => {
    repository.findStaleActive.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);

    await expect(build().sweep(now)).resolves.toEqual({ budgets: 2, features: 0 });

    expect(budgets.close.mock.calls).toEqual([
      ['b1', ThreadJobBudgetCloseStatus.RELEASED],
      ['b2', ThreadJobBudgetCloseStatus.RELEASED],
    ]);
  });

  it('only looks at budgets older than the stale age, in a bounded batch', async () => {
    await build().sweep(now);

    expect(repository.findStaleActive).toHaveBeenCalledWith(
      new Date(now.getTime() - THREAD_BUDGET_STALE_AFTER_MS),
      THREAD_BUDGET_SWEEP_BATCH_SIZE,
    );
    expect(repository.findStrandedFeatureReservationIds).toHaveBeenCalledWith(
      new Date(now.getTime() - THREAD_BUDGET_SWEEP_INTERVAL_MS),
      THREAD_BUDGET_SWEEP_BATCH_SIZE,
    );
  });

  it('releases allowance holds stranded on an already-closed budget', async () => {
    repository.findStrandedFeatureReservationIds.mockResolvedValue(['f1', 'f2']);

    await expect(build().sweep(now)).resolves.toEqual({ budgets: 0, features: 2 });

    expect(featureUsage.settle.mock.calls).toEqual([
      ['f1', 'RELEASE'],
      ['f2', 'RELEASE'],
    ]);
  });

  it('leaves a budget that fails to close for the next pass and carries on', async () => {
    repository.findStaleActive.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
    budgets.close.mockRejectedValueOnce(new Error('busy')).mockResolvedValueOnce(true);

    await expect(build().sweep(now)).resolves.toEqual({ budgets: 1, features: 0 });
  });

  it('does not count a budget another replica closed first', async () => {
    repository.findStaleActive.mockResolvedValue([{ id: 'b1' }]);
    budgets.close.mockResolvedValue(false);
    await expect(build().sweep(now)).resolves.toEqual({ budgets: 0, features: 0 });
  });

  it('is idempotent: a second pass over nothing does nothing', async () => {
    const sweeper = build();
    await sweeper.sweep(now);
    await sweeper.sweep(now);
    expect(budgets.close).not.toHaveBeenCalled();
    expect(featureUsage.settle).not.toHaveBeenCalled();
  });

  describe('run', () => {
    it('does nothing when another replica holds the lock', async () => {
      redis.acquireLock.mockResolvedValue(false);
      await build().run();
      expect(repository.findStaleActive).not.toHaveBeenCalled();
      expect(redis.releaseLock).not.toHaveBeenCalled();
    });

    it('releases the lock even when the pass throws, and does not throw itself', async () => {
      repository.findStaleActive.mockRejectedValue(new Error('db down'));
      await expect(build().run()).resolves.toBeUndefined();
      expect(redis.releaseLock).toHaveBeenCalledTimes(1);
    });
  });
});
