import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadJobBudgetCreditLinkService } from '../thread-job-budget-credit-link.service';

describe('ThreadJobBudgetCreditLinkService', () => {
  const budgets = { get: vi.fn(), settleByCreditReservation: vi.fn() };
  const build = (): ThreadJobBudgetCreditLinkService =>
    new ThreadJobBudgetCreditLinkService(budgets as never);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('spendCeilingMicroUsd', () => {
    it('is undefined for a call with no budget, without reading anything', async () => {
      await expect(build().spendCeilingMicroUsd(undefined)).resolves.toBeUndefined();
      expect(budgets.get).not.toHaveBeenCalled();
    });

    it('is cap minus reserved minus spent', async () => {
      budgets.get.mockResolvedValue({
        status: 'ACTIVE',
        capMicroUsd: 300_000n,
        reservedMicroUsd: 21_226n,
        spentMicroUsd: 100_000n,
      });
      await expect(build().spendCeilingMicroUsd('budget-1')).resolves.toBe(178_774);
    });

    it('is zero once the cap is spent, never negative', async () => {
      budgets.get.mockResolvedValue({
        status: 'ACTIVE',
        capMicroUsd: 100n,
        reservedMicroUsd: 90n,
        spentMicroUsd: 90n,
      });
      await expect(build().spendCeilingMicroUsd('budget-1')).resolves.toBe(0);
    });

    it.each(['FINALIZED', 'RELEASED'])('is zero for a %s budget', async (status) => {
      budgets.get.mockResolvedValue({
        status,
        capMicroUsd: 1_000n,
        reservedMicroUsd: 0n,
        spentMicroUsd: 0n,
      });
      await expect(build().spendCeilingMicroUsd('budget-1')).resolves.toBe(0);
    });

    it('is zero for a budget that does not exist', async () => {
      budgets.get.mockResolvedValue(null);
      await expect(build().spendCeilingMicroUsd('nope')).resolves.toBe(0);
    });

    it('does not fail the hold when the budget cannot be read; the call reserve still enforces the cap', async () => {
      budgets.get.mockRejectedValue(new Error('db down'));
      await expect(build().spendCeilingMicroUsd('budget-1')).resolves.toBeUndefined();
    });

    it('clamps an enormous cap to a safe integer', async () => {
      budgets.get.mockResolvedValue({
        status: 'ACTIVE',
        capMicroUsd: 2n ** 70n,
        reservedMicroUsd: 0n,
        spentMicroUsd: 0n,
      });
      await expect(build().spendCeilingMicroUsd('budget-1')).resolves.toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('settleForReservation', () => {
    it('settles the call that carries the hold at the charge', async () => {
      budgets.settleByCreditReservation.mockResolvedValue(true);
      await build().settleForReservation('hold-1', 4_829n);
      expect(budgets.settleByCreditReservation).toHaveBeenCalledWith('hold-1', 4_829n);
    });

    it('never throws: a bookkeeping failure must not fail the credit settlement', async () => {
      budgets.settleByCreditReservation.mockRejectedValue(new Error('db down'));
      await expect(build().settleForReservation('hold-1', 1n)).resolves.toBeUndefined();
    });
  });
});
