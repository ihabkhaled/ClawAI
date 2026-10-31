import { vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SessionAdminRepository } from '../session-admin.repository';

interface SqlLike {
  sql: string;
  values: unknown[];
}

function build(rows: unknown[] = []): {
  repository: SessionAdminRepository;
  queryRaw: ReturnType<typeof vi.fn>;
} {
  const queryRaw = vi.fn().mockResolvedValue(rows);
  const prisma = {
    $queryRaw: queryRaw,
    session: { count: vi.fn(), findUnique: vi.fn(), groupBy: vi.fn() },
    user: { findUnique: vi.fn() },
    sessionAdminAudit: { create: vi.fn() },
  };
  return { repository: new SessionAdminRepository(prisma as unknown as PrismaService), queryRaw };
}

function lastQuery(queryRaw: ReturnType<typeof vi.fn>): SqlLike {
  return queryRaw.mock.calls.at(-1)?.[0] as SqlLike;
}

const NOW = new Date('2026-10-31T12:00:00Z');

describe('SessionAdminRepository SQL shape', () => {
  it('parameterises every value (no user input is concatenated into the statement)', async () => {
    const { repository, queryRaw } = build();
    const hostile = "x'; DROP TABLE sessions; --";

    await repository.terminateOpenRows({
      userId: hostile,
      familyId: hostile,
      reason: 'ADMIN_TERMINATED' as never,
      actorUserId: 'admin',
      at: NOW,
    });

    const query = lastQuery(queryRaw);
    expect(query.sql).not.toContain('DROP TABLE');
    expect(query.values).toContain(hostile);
  });

  it('terminateOpenRows only touches open rows, one atomic UPDATE .. RETURNING', async () => {
    const { repository, queryRaw } = build([{ id: 'a' }, { id: 'b' }]);

    const ids = await repository.terminateOpenRows({
      userId: 'u1',
      reason: 'ADMIN_TERMINATED_ALL' as never,
      actorUserId: 'admin',
      at: NOW,
    });

    expect(ids).toEqual(['a', 'b']);
    const { sql } = lastQuery(queryRaw);
    expect(sql).toContain('UPDATE sessions');
    expect(sql).toContain('revoked_at IS NULL');
    expect(sql).toContain('RETURNING id');
  });

  it('can spare one family', async () => {
    const { repository, queryRaw } = build();

    await repository.terminateOpenRows({
      userId: 'u1',
      exceptFamilyId: 'keep-me',
      reason: 'ADMIN_TERMINATED_ALL' as never,
      actorUserId: 'admin',
      at: NOW,
    });

    const query = lastQuery(queryRaw);
    expect(query.sql).toContain('family_id <>');
    expect(query.values).toContain('keep-me');
  });

  it('deletes inactive logins only: the revoked/expired test is inside the DELETE', async () => {
    const { repository, queryRaw } = build([{ families: 2, total_rows: 7 }]);

    const result = await repository.deleteInactiveFamilies({ userId: 'u1', now: NOW });

    expect(result).toEqual({ families: 2, rows: 7 });
    const { sql, values } = lastQuery(queryRaw);
    expect(sql).toContain('DELETE FROM sessions');
    expect(sql).toContain('newest.revoked_at IS NOT NULL OR newest.expires_at <=');
    expect(values).toContain('u1');
  });

  it('the global clear has no user filter', async () => {
    const { repository, queryRaw } = build([{ families: 1, total_rows: 1 }]);

    await repository.deleteInactiveFamilies({ userId: null, now: NOW });

    expect(lastQuery(queryRaw).values).not.toContain('u1');
    expect(lastQuery(queryRaw).sql).not.toContain('user_id =');
  });

  it('answers zero when the delete matched nothing', async () => {
    const { repository } = build([]);

    await expect(repository.deleteInactiveFamilies({ userId: 'u1', now: NOW })).resolves.toEqual({
      families: 0,
      rows: 0,
    });
  });

  it('the global kill batch is bounded, skips locked rows and spares the kept family', async () => {
    const { repository, queryRaw } = build([{ id: 'a' }]);

    const ids = await repository.terminateBatchGlobally({
      startedAt: NOW,
      accessCutoff: NOW,
      exceptFamilyId: 'my-family',
      actorUserId: 'super',
      at: NOW,
    });

    expect(ids).toEqual(['a']);
    const query = lastQuery(queryRaw);
    expect(query.sql).toContain('LIMIT');
    expect(query.sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(query.sql).toContain('created_at <=');
    expect(query.values).toContain('my-family');
    expect(query.values).toContain(1_000);
  });

  it('summarizes the three states', async () => {
    const { repository } = build([
      { state: 'ACTIVE', count: 2 },
      { state: 'EXPIRED', count: 3 },
      { state: 'TERMINATED', count: 4 },
    ]);

    await expect(repository.summarize('u1', NOW)).resolves.toEqual({
      active: 2,
      expired: 3,
      terminated: 4,
      total: 9,
    });
  });

  it('listFamilies filters by state and pages from the offset', async () => {
    const { repository, queryRaw } = build();

    await repository.listFamilies('u1', 'EXPIRED' as never, 3, 10, NOW);

    const query = lastQuery(queryRaw);
    expect(query.sql).toContain('ORDER BY r.last_used_at DESC');
    expect(query.values).toContain('EXPIRED');
    expect(query.values).toContain(20);
    expect(query.values).toContain(10);
  });

  it('isFamilyActive reads the newest row only', async () => {
    const { repository, queryRaw } = build([{ active: true }]);
    await expect(repository.isFamilyActive('u1', 'f', NOW)).resolves.toBe(true);
    expect(lastQuery(queryRaw).sql).toContain('ORDER BY created_at DESC');

    const none = build([]);
    await expect(none.repository.isFamilyActive('u1', 'f', NOW)).resolves.toBe(false);
  });
});
