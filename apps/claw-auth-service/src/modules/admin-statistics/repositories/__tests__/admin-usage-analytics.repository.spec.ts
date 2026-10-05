import { vi } from 'vitest';
import { AdminUsageAnalyticsRepository } from '../admin-usage-analytics.repository';

describe('AdminUsageAnalyticsRepository', () => {
  const scope = {
    userId: 'u1',
    from: new Date('2026-10-01T00:00:00Z'),
    to: new Date('2026-10-02T00:00:00Z'),
  };

  function build() {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      featureUsageRecord: {
        groupBy: vi.fn().mockResolvedValue([{ feature: 'WEB_FETCH', _count: { _all: 2 } }]),
      },
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'u1', email: 'a@b.co' }]) },
    };
    return { prisma, repo: new AdminUsageAnalyticsRepository(prisma as never) };
  }

  it('parameterises the user id and the window instead of interpolating them', async () => {
    const { prisma, repo } = build();
    await repo.totals(scope);
    const [strings, ...values] = prisma.$queryRaw.mock.calls[0] ?? [];
    const sql = (strings as string[]).join('?');
    expect(sql).not.toContain('u1');
    expect(values).toBeDefined();
  });

  it('bounds the model query with a LIMIT parameter and excludes released rows', async () => {
    const { prisma, repo } = build();
    await repo.byModel(scope, 51);
    const call = prisma.$queryRaw.mock.calls[0] ?? [];
    const sqlText = JSON.stringify(call);
    expect(sqlText).toContain('LIMIT');
    expect(sqlText).toContain('RELEASED');
    expect(call).toContain(51);
  });

  it('omits the user predicate for the all-users scope', async () => {
    const { prisma, repo } = build();
    await repo.activeUsers({ ...scope, userId: null });
    expect(JSON.stringify(prisma.$queryRaw.mock.calls[0])).not.toContain('user_id = ');
  });

  it('counts only consumed tools inside the window, capped by take', async () => {
    const { prisma, repo } = build();
    const rows = await repo.tools(scope, 10);
    expect(rows).toEqual([{ feature: 'WEB_FETCH', count: 2 }]);
    const args = prisma.featureUsageRecord.groupBy.mock.calls[0]?.[0];
    expect(args.where).toMatchObject({ state: 'CONSUMED', userId: 'u1' });
    expect(args.take).toBe(10);
  });

  it('does not query users when there are no ids', async () => {
    const { prisma, repo } = build();
    expect((await repo.emailsFor([])).size).toBe(0);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
