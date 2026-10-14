import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { BoardMaintenanceRepository } from '../repositories/board-maintenance.repository';
import { BoardRepository } from '../repositories/board.repository';

const base = {
  q: '',
  lang: 'all',
  type: 'all',
  sort: 'latest' as const,
  page: 1,
  limit: 12,
  userId: 'u1',
};

function fakePrisma(rows: unknown[] = []): {
  prisma: PrismaService;
  calls: string[];
  direct: ReturnType<typeof vi.fn>;
} {
  const calls: string[] = [];
  const tx = {
    $queryRaw: vi.fn((query: { sql: string }) => {
      calls.push(query.sql.includes('set_config') ? 'thresholds' : 'read');
      return Promise.resolve(rows);
    }),
    $executeRaw: vi.fn(() => Promise.resolve(0)),
  };
  const direct = vi.fn(() => Promise.resolve(rows));
  const prisma = {
    $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    $queryRaw: direct,
  } as unknown as PrismaService;
  return { prisma, calls, direct };
}

describe('BoardRepository', () => {
  it('sets the trigram thresholds inside the transaction before a searching read', async () => {
    const { prisma, calls, direct } = fakePrisma();
    await new BoardRepository(prisma).list({ ...base, q: 'quantum' });
    expect(calls).toEqual(['thresholds', 'read']);
    expect(direct).not.toHaveBeenCalled();
  });

  it('wraps suggest, its count and did-you-mean the same way', async () => {
    const { prisma, calls } = fakePrisma([{ total: 4 }]);
    const repo = new BoardRepository(prisma);
    await repo.suggest('qu', 'en');
    await repo.suggestCount('qu', 'en');
    await repo.closestWords(['quantm'], 'en');
    expect(calls).toEqual(['thresholds', 'read', 'thresholds', 'read', 'thresholds', 'read']);
  });

  it('reads without a transaction when there is no search text', async () => {
    const { prisma, calls, direct } = fakePrisma([{ total: 7 }]);
    const repo = new BoardRepository(prisma);
    expect(await repo.count(base)).toBe(7);
    await repo.list(base);
    expect(direct).toHaveBeenCalledTimes(2);
    expect(calls).toEqual([]);
  });
});

describe('BoardMaintenanceRepository', () => {
  it('skips the pass when another replica holds the advisory lock', async () => {
    const { prisma } = fakePrisma([{ ok: false }]);
    expect(await new BoardMaintenanceRepository(prisma).refresh()).toBeNull();
  });

  it('rebuilds the dictionary and trending score when it holds the lock', async () => {
    const { prisma } = fakePrisma([{ ok: true }]);
    expect(await new BoardMaintenanceRepository(prisma).refresh()).toEqual({
      wordsUpserted: 0,
      wordsRemoved: 0,
      trendingUpdated: 0,
    });
  });
});
