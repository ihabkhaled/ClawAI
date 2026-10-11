import { vi } from 'vitest';

import { Prisma } from '../../../../generated/prisma';
import {
  UsageBillingKind,
  UsageLeaderboardDimension,
  UsageSortField,
} from '../../enums/usage-cost-kind.enum';
import { AdminUsageExplorerRepository } from '../admin-usage-explorer.repository';

const scope = {
  userId: 'u1',
  from: new Date('2026-10-01T00:00:00Z'),
  to: new Date('2026-10-02T00:00:00Z'),
  provider: 'LOCAL_OLLAMA',
  model: null,
  workflow: null,
  billing: UsageBillingKind.UNMETERED,
};

function build() {
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    user: { findUnique: vi.fn() },
  };
  return { prisma, repo: new AdminUsageExplorerRepository(prisma as never) };
}

function firstQuery(prisma: { $queryRaw: ReturnType<typeof vi.fn> }): {
  text: string;
  values: unknown[];
} {
  const [strings, ...parts] = prisma.$queryRaw.mock.calls[0] as [
    TemplateStringsArray,
    ...unknown[],
  ];
  const flat = Prisma.sql(strings, ...parts);
  return { text: flat.sql, values: flat.values };
}

describe('AdminUsageExplorerRepository', () => {
  it('binds user, window, provider and limit as parameters and excludes released rows', async () => {
    const { prisma, repo } = build();
    await repo.groupPage({
      scope,
      dimension: UsageLeaderboardDimension.MODEL,
      search: null,
      sort: UsageSortField.COST,
      descending: true,
      limit: 26,
      cursor: null,
    });
    const { text, values } = firstQuery(prisma);
    expect(text).toContain('RELEASED');
    expect(text).toContain('LIMIT');
    expect(text).not.toContain('u1');
    expect(values).toEqual(expect.arrayContaining(['u1', 'LOCAL_OLLAMA', 26]));
  });

  it('escapes LIKE wildcards in search text and keeps it a parameter', async () => {
    const { prisma, repo } = build();
    await repo.groupPage({
      scope: { ...scope, userId: null, billing: null },
      dimension: UsageLeaderboardDimension.USER,
      search: '50%_off\\x',
      sort: UsageSortField.REQUESTS,
      descending: false,
      limit: 11,
      cursor: { v: '5', id: 'user-9' },
    });
    const { text, values } = firstQuery(prisma);
    expect(values).toContain('%50\\%\\_off\\\\x%');
    expect(values).toEqual(expect.arrayContaining(['5', 'user-9']));
    expect(text).not.toContain('50%_off');
    expect(text).toContain(' > ');
  });

  it('returns nothing for an unknown dimension instead of building SQL', async () => {
    const { prisma, repo } = build();
    const rows = await repo.groupPage({
      scope,
      dimension: 'bogus' as UsageLeaderboardDimension,
      search: null,
      sort: UsageSortField.COST,
      descending: true,
      limit: 5,
      cursor: null,
    });
    expect(rows).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('maps a found user and returns null otherwise', async () => {
    const { prisma, repo } = build();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.co',
      username: 'a',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    expect(await repo.findUserIdentity('u1')).toMatchObject({ email: 'a@b.co', role: 'ADMIN' });
    prisma.user.findUnique.mockResolvedValueOnce(null);
    expect(await repo.findUserIdentity('nope')).toBeNull();
  });
});
