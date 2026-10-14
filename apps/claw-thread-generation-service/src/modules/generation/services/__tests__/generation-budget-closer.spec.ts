import { GenerationBudgetCloseStatus } from '../../../../common/enums/generation-budget-close-status.enum';
import { GenerationBudgetCloser } from '../generation-budget-closer';

function build(settled: () => Promise<number>) {
  const budgets = { spentMicroUsd: vi.fn(settled), close: vi.fn().mockResolvedValue(undefined) };
  const repository = {
    syncSpend: vi.fn().mockResolvedValue(undefined),
    markBudgetClosed: vi.fn().mockResolvedValue(undefined),
    recordBudgetCloseFailure: vi.fn().mockResolvedValue(null),
  };
  return {
    budgets,
    repository,
    closer: new GenerationBudgetCloser(budgets as never, repository as never),
  };
}

describe('GenerationBudgetCloser spend sync', () => {
  it('persists the budget row spend before closing', async () => {
    const { closer, budgets, repository } = build(async () => 8_227);

    await closer.close('job-1', 'budget-1', GenerationBudgetCloseStatus.FINALIZED);

    expect(repository.syncSpend).toHaveBeenCalledWith('job-1', 8_227);
    expect(repository.syncSpend.mock.invocationCallOrder[0]).toBeLessThan(
      budgets.close.mock.invocationCallOrder[0] ?? 0,
    );
    expect(repository.markBudgetClosed).toHaveBeenCalled();
  });

  it('still closes the budget when the summary cannot be read', async () => {
    const { closer, repository } = build(async () => {
      throw new Error('down');
    });

    await closer.close('job-1', 'budget-1', GenerationBudgetCloseStatus.RELEASED);

    expect(repository.syncSpend).not.toHaveBeenCalled();
    expect(repository.markBudgetClosed).toHaveBeenCalled();
  });
});
