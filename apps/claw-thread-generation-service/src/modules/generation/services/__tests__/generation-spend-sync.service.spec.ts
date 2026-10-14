import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SPEND_SYNC_MIN_INTERVAL_MS } from '../../constants/generation.constants';
import { GenerationSpendSyncService } from '../generation-spend-sync.service';

function build(settled: () => Promise<number>) {
  const budgets = { spentMicroUsd: vi.fn(settled) };
  const repository = { syncSpend: vi.fn().mockResolvedValue(undefined) };
  const service = new GenerationSpendSyncService(budgets as never, repository as never);
  return { service, budgets, repository };
}

describe('GenerationSpendSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies the settled spend onto the job', async () => {
    const { service, repository } = build(() => Promise.resolve(1234));
    await service.sync('job-1', 'budget-1');
    expect(repository.syncSpend).toHaveBeenCalledWith('job-1', 1234);
  });

  it('asks the budget at most once per interval per job', async () => {
    const { service, budgets } = build(() => Promise.resolve(5));
    await service.sync('job-1', 'budget-1');
    await service.sync('job-1', 'budget-1');
    await service.sync('job-2', 'budget-2');
    expect(budgets.spentMicroUsd).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(SPEND_SYNC_MIN_INTERVAL_MS + 1);
    await service.sync('job-1', 'budget-1');
    expect(budgets.spentMicroUsd).toHaveBeenCalledTimes(3);
  });

  it('never throws when the budget service fails', async () => {
    const { service, repository } = build(() => Promise.reject(new Error('down')));
    await expect(service.sync('job-1', 'budget-1')).resolves.toBeUndefined();
    expect(repository.syncSpend).not.toHaveBeenCalled();
  });
});
