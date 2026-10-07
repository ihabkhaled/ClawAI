import { type Mock, vi } from 'vitest';

import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CreditFreeAllowanceRepository } from '../credit-free-allowance.repository';

type Statement = { sql: string; values: unknown[] };

const KEY = { userId: 'user-1', provider: '*', periodKey: '2026-10' };

const asStatement = (strings: TemplateStringsArray, values: unknown[]): Statement => ({
  sql: strings.join('?').replaceAll(/\s+/g, ' ').trim(),
  values,
});

/**
 * A stand-in for Postgres that applies the SAME rule the statement encodes: insert at 1, or
 * increment only while `used_count < limit` AND (no meter OR spent + hold fits the budget).
 * Statements are serialised the way the unique-index row lock serialises them, so a parallel
 * burst can be asserted without a database. The real race is proved against Postgres in the
 * live lane.
 */
class FakeCounterTable {
  readonly rows = new Map<string, { used: number; spent: bigint }>();

  // Bound values arrive in statement order:
  // id, user, provider, period, hold, hold, limit, budget, hold, budget.
  queryRaw = vi.fn((_strings: TemplateStringsArray, ...values: unknown[]) => {
    const [, userId, provider, periodKey, hold, , limit, budget] = values as [
      string,
      string,
      string,
      string,
      bigint,
      bigint,
      number,
      bigint | null,
    ];
    const key = `${userId}|${provider}|${periodKey}`;
    const current = this.rows.get(key);
    if (current === undefined) {
      this.rows.set(key, { used: 1, spent: hold });
      return Promise.resolve([{ used_count: 1 }]);
    }
    const fits = budget === null || current.spent + hold <= budget;
    if (current.used < limit && fits) {
      this.rows.set(key, { used: current.used + 1, spent: current.spent + hold });
      return Promise.resolve([{ used_count: current.used + 1 }]);
    }
    return Promise.resolve([]);
  });
}

describe('CreditFreeAllowanceRepository', () => {
  let queryRaw: Mock;
  let executeRaw: Mock;
  let findUnique: Mock;
  let repository: CreditFreeAllowanceRepository;

  beforeEach(() => {
    queryRaw = vi.fn().mockResolvedValue([{ used_count: 1 }]);
    executeRaw = vi.fn().mockResolvedValue(1);
    findUnique = vi.fn().mockResolvedValue(null);
    repository = new CreditFreeAllowanceRepository({
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
      creditFreeAllowanceUsage: { findUnique },
    } as unknown as PrismaService);
  });

  describe('tryConsume', () => {
    it('is ONE upsert guarded by the count and the meter, so it cannot be read-then-written', async () => {
      await repository.tryConsume(KEY, 2, 30_000n, 250_000n);

      const [strings, ...values] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      const statement = asStatement(strings, values);
      expect(statement.sql).toContain('ON CONFLICT (user_id, provider, period_key)');
      expect(statement.sql).toContain('WHERE credit_free_allowance_usage.used_count < ?');
      expect(statement.sql).toContain(
        'credit_free_allowance_usage.spent_micro_usd + ?::bigint <= ?::bigint',
      );
      expect(statement.sql).toContain('RETURNING used_count');
      expect(statement.values).toContain(2);
      expect(statement.values).toContain(30_000n);
      expect(statement.values).toContain(250_000n);
      expect(statement.values).toEqual(
        expect.arrayContaining([KEY.userId, KEY.provider, KEY.periodKey]),
      );
    });

    it('returns true when the statement returned a row', async () => {
      queryRaw.mockResolvedValueOnce([{ used_count: 1 }]);
      await expect(repository.tryConsume(KEY, 2, 0n, null)).resolves.toBe(true);
    });

    it('returns false when the guard matched nothing (the allowance is spent)', async () => {
      queryRaw.mockResolvedValueOnce([]);
      await expect(repository.tryConsume(KEY, 2, 0n, null)).resolves.toBe(false);
    });

    it.each([0, -1])('never admits and never queries at a limit of %i', async (limit) => {
      await expect(repository.tryConsume(KEY, limit, 0n, null)).resolves.toBe(false);
      expect(queryRaw).not.toHaveBeenCalled();
    });

    it('never admits a single hold bigger than the whole budget, without querying', async () => {
      await expect(repository.tryConsume(KEY, 10, 300_000n, 250_000n)).resolves.toBe(false);
      expect(queryRaw).not.toHaveBeenCalled();
    });

    it('lets exactly N of a parallel burst through', async () => {
      const table = new FakeCounterTable();
      const racing = new CreditFreeAllowanceRepository({
        $queryRaw: table.queryRaw,
      } as unknown as PrismaService);

      const results = await Promise.all(
        Array.from({ length: 12 }, () => racing.tryConsume(KEY, 3, 0n, null)),
      );

      expect(results.filter(Boolean)).toHaveLength(3);
      expect(table.rows.get('user-1|*|2026-10')?.used).toBe(3);
    });

    it('stops at the budget before the count, whichever comes first', async () => {
      const table = new FakeCounterTable();
      const racing = new CreditFreeAllowanceRepository({
        $queryRaw: table.queryRaw,
      } as unknown as PrismaService);

      // Ten requests allowed, $0.25 budget, each holding $0.06: four fit, the fifth does not.
      const results = await Promise.all(
        Array.from({ length: 10 }, () => racing.tryConsume(KEY, 10, 60_000n, 250_000n)),
      );

      expect(results.filter(Boolean)).toHaveLength(4);
      expect(table.rows.get('user-1|*|2026-10')).toEqual({ used: 4, spent: 240_000n });
    });

    it('lets cheap calls use all ten requests inside the same budget', async () => {
      const table = new FakeCounterTable();
      const racing = new CreditFreeAllowanceRepository({
        $queryRaw: table.queryRaw,
      } as unknown as PrismaService);

      const results = await Promise.all(
        Array.from({ length: 12 }, () => racing.tryConsume(KEY, 10, 5_000n, 250_000n)),
      );

      expect(results.filter(Boolean)).toHaveLength(10);
      expect(table.rows.get('user-1|*|2026-10')?.spent).toBe(50_000n);
    });
  });

  describe('giveBack', () => {
    it('decrements the count and the held cost with a floor of zero, scoped to the exact counter', async () => {
      await repository.giveBack(KEY, 30_000n);

      const [strings, ...values] = executeRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      const statement = asStatement(strings, values);
      expect(statement.sql).toContain('GREATEST(used_count - 1, 0)');
      expect(statement.sql).toContain('GREATEST(spent_micro_usd - ?::bigint, 0)');
      expect(statement.sql).toContain('user_id = ? AND provider = ? AND period_key = ?');
      expect(statement.values).toEqual([30_000n, KEY.userId, KEY.provider, KEY.periodKey]);
    });
  });

  describe('adjustSpend', () => {
    it('adds the difference between what a call cost and what it held, never going below zero', async () => {
      await repository.adjustSpend(KEY, -25_000n);

      const [strings, ...values] = executeRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      const statement = asStatement(strings, values);
      expect(statement.sql).toContain('GREATEST(spent_micro_usd + ?::bigint, 0)');
      expect(statement.values).toEqual([-25_000n, KEY.userId, KEY.provider, KEY.periodKey]);
    });
  });

  describe('findTotals', () => {
    it('reads the single total row of one user and one month, requests and cost', async () => {
      findUnique.mockResolvedValueOnce({ usedCount: 2, spentMicroUsd: 12_345n });

      await expect(repository.findTotals('user-1', '2026-10')).resolves.toEqual({
        usedCount: 2,
        spentMicroUsd: 12_345n,
      });
      expect(findUnique).toHaveBeenCalledWith({
        where: {
          userId_provider_periodKey: { userId: 'user-1', provider: '*', periodKey: '2026-10' },
        },
        select: { usedCount: true, spentMicroUsd: true },
      });
    });

    it('is zero when the user has not used any request this month', async () => {
      await expect(repository.findTotals('user-1', '2026-10')).resolves.toEqual({
        usedCount: 0,
        spentMicroUsd: 0n,
      });
    });
  });
});
