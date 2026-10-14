import { describe, expect, it, vi } from 'vitest';

import { ThreadJobBudgetFreeMeterRepository } from '../thread-job-budget-free-meter.repository';

type Sum = { month_key: string; micro_usd: bigint };

function build(options: { claimCount?: number; sums?: Sum[]; charged?: bigint[] } = {}) {
  const tx = {
    threadJobBudget: { updateMany: vi.fn().mockResolvedValue({ count: options.claimCount ?? 1 }) },
    $queryRaw: vi.fn().mockResolvedValue(options.sums ?? []),
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
  const prisma = {
    $transaction: vi.fn((work: (client: typeof tx) => Promise<bigint>) => work(tx)),
    $queryRaw: vi
      .fn()
      .mockResolvedValue((options.charged ?? []).map((micro_usd) => ({ micro_usd }))),
  };
  return { repository: new ThreadJobBudgetFreeMeterRepository(prisma as never), tx, prisma };
}

describe('ThreadJobBudgetFreeMeterRepository', () => {
  describe('refundFinishedCalls', () => {
    it('claims the marker, then gives each month its finished calls back', async () => {
      const { repository, tx } = build({
        sums: [
          { month_key: '2026-10', micro_usd: 7_000n },
          { month_key: '2026-09', micro_usd: 1_500n },
        ],
      });

      await expect(repository.refundFinishedCalls('budget-1')).resolves.toBe(8_500n);
      expect(tx.threadJobBudget.updateMany).toHaveBeenCalledWith({
        where: { id: 'budget-1', freeRefundedAt: null },
        data: { freeRefundedAt: expect.any(Date) },
      });
      expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('does nothing when the refund was already claimed (second or concurrent close)', async () => {
      const { repository, tx } = build({
        claimCount: 0,
        sums: [{ month_key: 'm', micro_usd: 9n }],
      });

      await expect(repository.refundFinishedCalls('budget-1')).resolves.toBe(0n);
      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('claims but moves no money for a non-free job', async () => {
      const { repository, tx } = build({ sums: [] });

      await expect(repository.refundFinishedCalls('budget-1')).resolves.toBe(0n);
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('skips a zero month and never refunds a negative figure', async () => {
      const { repository, tx } = build({
        sums: [
          { month_key: '2026-10', micro_usd: 0n },
          { month_key: '2026-09', micro_usd: -5n },
        ],
      });

      await expect(repository.refundFinishedCalls('budget-1')).resolves.toBe(0n);
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('rolls back the claim with the transaction when the meter update fails', async () => {
      const { repository, tx } = build({ sums: [{ month_key: '2026-10', micro_usd: 3n }] });
      tx.$executeRaw.mockRejectedValue(new Error('db down'));

      await expect(repository.refundFinishedCalls('budget-1')).rejects.toThrow('db down');
    });
  });

  describe('chargedMicroUsd', () => {
    it('returns what the meter charges for the job', async () => {
      const { repository } = build({ charged: [4_200n] });
      await expect(repository.chargedMicroUsd('budget-1')).resolves.toBe(4_200n);
    });

    it('is zero when there is no row', async () => {
      const { repository } = build({ charged: [] });
      await expect(repository.chargedMicroUsd('budget-1')).resolves.toBe(0n);
    });
  });
});
