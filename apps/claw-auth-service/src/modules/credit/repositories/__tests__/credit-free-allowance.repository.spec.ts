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
 * A stand-in for Postgres that applies the SAME rule the statement encodes:
 * insert at 1, or increment only while `used_count < limit`. Statements are
 * serialised the way the unique-index row lock serialises them, so a parallel
 * burst can be asserted without a database. The real race is proved against
 * Postgres in the live lane.
 */
class FakeCounterTable {
  readonly rows = new Map<string, number>();

  // Bound values arrive in statement order: id, user, provider, period, limit.
  queryRaw = vi.fn((_strings: TemplateStringsArray, ...values: unknown[]) => {
    const [, userId, provider, periodKey, limit] = values;
    const key = `${String(userId)}|${String(provider)}|${String(periodKey)}`;
    const current = this.rows.get(key);
    if (current === undefined) {
      this.rows.set(key, 1);
      return Promise.resolve([{ used_count: 1 }]);
    }
    if (current < Number(limit)) {
      this.rows.set(key, current + 1);
      return Promise.resolve([{ used_count: current + 1 }]);
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
    it('is ONE upsert guarded by used_count < limit, so it cannot be read-then-written', async () => {
      await repository.tryConsume(KEY, 2);

      const [strings, ...values] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      const statement = asStatement(strings, values);
      expect(statement.sql).toContain('ON CONFLICT (user_id, provider, period_key)');
      expect(statement.sql).toContain('WHERE credit_free_allowance_usage.used_count < ?');
      expect(statement.sql).toContain('RETURNING used_count');
      expect(statement.values).toContain(2);
      expect(statement.values).toEqual(
        expect.arrayContaining([KEY.userId, KEY.provider, KEY.periodKey]),
      );
    });

    it('returns true when the statement returned a row', async () => {
      queryRaw.mockResolvedValueOnce([{ used_count: 1 }]);
      await expect(repository.tryConsume(KEY, 2)).resolves.toBe(true);
    });

    it('returns false when the guard matched nothing (the allowance is spent)', async () => {
      queryRaw.mockResolvedValueOnce([]);
      await expect(repository.tryConsume(KEY, 2)).resolves.toBe(false);
    });

    it.each([0, -1])('never admits and never queries at a limit of %i', async (limit) => {
      await expect(repository.tryConsume(KEY, limit)).resolves.toBe(false);
      expect(queryRaw).not.toHaveBeenCalled();
    });

    it('lets exactly N of a parallel burst through', async () => {
      const table = new FakeCounterTable();
      const racing = new CreditFreeAllowanceRepository({
        $queryRaw: table.queryRaw,
      } as unknown as PrismaService);

      const results = await Promise.all(
        Array.from({ length: 12 }, () => racing.tryConsume(KEY, 3)),
      );

      expect(results.filter(Boolean)).toHaveLength(3);
      expect(table.rows.get('user-1|*|2026-10')).toBe(3);
    });
  });

  describe('giveBack', () => {
    it('decrements with a floor of zero, scoped to the exact counter', async () => {
      await repository.giveBack(KEY);

      const [strings, ...values] = executeRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      const statement = asStatement(strings, values);
      expect(statement.sql).toContain('GREATEST(used_count - 1, 0)');
      expect(statement.sql).toContain('user_id = ? AND provider = ? AND period_key = ?');
      expect(statement.values).toEqual([KEY.userId, KEY.provider, KEY.periodKey]);
    });
  });

  describe('findTotalUsed', () => {
    it('reads the single total row of one user and one month', async () => {
      findUnique.mockResolvedValueOnce({ usedCount: 2 });

      await expect(repository.findTotalUsed('user-1', '2026-10')).resolves.toBe(2);
      expect(findUnique).toHaveBeenCalledWith({
        where: {
          userId_provider_periodKey: { userId: 'user-1', provider: '*', periodKey: '2026-10' },
        },
        select: { usedCount: true },
      });
    });

    it('is 0 when the user has not used any request this month', async () => {
      await expect(repository.findTotalUsed('user-1', '2026-10')).resolves.toBe(0);
    });
  });
});
