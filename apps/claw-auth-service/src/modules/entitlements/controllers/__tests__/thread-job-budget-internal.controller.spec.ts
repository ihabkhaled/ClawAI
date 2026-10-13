import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadCallReserveOutcome } from '../../../credit/enums/thread-call-reserve-outcome.enum';
import { ThreadJobBudgetCloseStatus } from '../../../credit/enums/thread-job-budget-close-status.enum';
import { ThreadJobBudgetInternalController } from '../thread-job-budget-internal.controller';

describe('ThreadJobBudgetInternalController', () => {
  const budgets = {
    reserve: vi.fn(),
    reserveCall: vi.fn(),
    settleCall: vi.fn(),
    releaseCall: vi.fn(),
    close: vi.fn(),
    summary: vi.fn(),
  };
  const controller = (): ThreadJobBudgetInternalController =>
    new ThreadJobBudgetInternalController(budgets as never);
  const callBody = {
    budgetId: 'budget-1',
    requestId: 'job:a',
    creditReservationId: 'hold-1',
    amountMicroUsd: 21_226,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('calls/reserve', () => {
    it('hands the service integer micro-USD as a bigint', async () => {
      budgets.reserveCall.mockResolvedValue({
        outcome: ThreadCallReserveOutcome.RESERVED,
        remainingMicroUsd: 0n,
        supersededCreditReservationId: null,
      });

      await controller().reserveCall(callBody);

      expect(budgets.reserveCall).toHaveBeenCalledWith({ ...callBody, amountMicroUsd: 21_226n });
    });

    it('answers the bare boolean an older meter understands unless detail is asked for', async () => {
      budgets.reserveCall.mockResolvedValue({
        outcome: ThreadCallReserveOutcome.CAP_EXCEEDED,
        remainingMicroUsd: 5n,
        supersededCreditReservationId: null,
      });
      await expect(controller().reserveCall(callBody)).resolves.toBe(false);
    });

    it('answers the outcome and what is left when detail is asked for', async () => {
      budgets.reserveCall.mockResolvedValue({
        outcome: ThreadCallReserveOutcome.CAP_EXCEEDED,
        remainingMicroUsd: 5n,
        supersededCreditReservationId: 'hold-0',
      });
      await expect(controller().reserveCall({ ...callBody, detailed: true })).resolves.toEqual({
        reserved: false,
        outcome: 'CAP_EXCEEDED',
        remainingMicroUsd: 5,
      });
    });

    it('does not leak the superseded credit hold to the caller', async () => {
      budgets.reserveCall.mockResolvedValue({
        outcome: ThreadCallReserveOutcome.RESERVED,
        remainingMicroUsd: 1n,
        supersededCreditReservationId: 'hold-0',
      });
      const reply = await controller().reserveCall({ ...callBody, detailed: true });
      expect(JSON.stringify(reply)).not.toContain('hold-0');
    });
  });

  describe('summary', () => {
    it('delegates to the service and returns its answer unchanged', async () => {
      const summary = {
        status: 'ACTIVE',
        capMicroUsd: 300_000,
        reservedMicroUsd: 21_226,
        spentMicroUsd: 12_000,
        remainingMicroUsd: 266_774,
      };
      budgets.summary.mockResolvedValue(summary);

      await expect(controller().summary({ budgetId: 'budget-1' })).resolves.toEqual(summary);
      expect(budgets.summary).toHaveBeenCalledWith('budget-1');
    });
  });

  it('settles with a bigint amount', async () => {
    budgets.settleCall.mockResolvedValue(true);
    await controller().settleCall({ budgetId: 'b', requestId: 'r', settledMicroUsd: 4_829 });
    expect(budgets.settleCall).toHaveBeenCalledWith('b', 'r', 4_829n);
  });

  it('closes with the requested status', async () => {
    budgets.close.mockResolvedValue(true);
    await expect(
      controller().close({ budgetId: 'b', status: ThreadJobBudgetCloseStatus.RELEASED }),
    ).resolves.toBe(true);
    expect(budgets.close).toHaveBeenCalledWith('b', ThreadJobBudgetCloseStatus.RELEASED);
  });
});
