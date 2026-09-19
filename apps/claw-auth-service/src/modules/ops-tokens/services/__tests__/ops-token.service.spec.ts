import { vi } from 'vitest';

import { OpsTokenScope } from '../../../../common/enums';
import { type OpsAccessToken } from '../../../../generated/prisma';
import { OpsTokenService } from '../ops-token.service';
import { hashOpsToken } from '../../utilities/ops-token.utility';

const NOW = new Date('2026-09-19T12:00:00.000Z');

/** An in-memory repository with the real repository's contract. */
function memoryRepository() {
  const rows: OpsAccessToken[] = [];
  return {
    rows,
    create: vi.fn(async (data: Record<string, unknown>) => {
      const row = {
        id: `t${String(rows.length + 1)}`,
        lastUsedAt: null,
        useCount: 0,
        revokedAt: null,
        createdAt: NOW,
        ...data,
      } as OpsAccessToken;
      rows.push(row);
      return Promise.resolve(row);
    }),
    listAll: vi.fn(async () => Promise.resolve([...rows])),
    countActiveForUser: vi.fn(async (userId: string, now: Date) =>
      Promise.resolve(
        rows.filter(
          (r) => r.createdByUserId === userId && r.revokedAt === null && r.expiresAt > now,
        ).length,
      ),
    ),
    findByHash: vi.fn(async (hash: string) =>
      Promise.resolve(rows.find((r) => r.tokenHash === hash) ?? null),
    ),
    recordUse: vi.fn(async (id: string, now: Date) => {
      const row = rows.find((r) => r.id === id);
      if (row) {
        row.lastUsedAt = now;
        row.useCount += 1;
      }
      return Promise.resolve();
    }),
    revoke: vi.fn(async (id: string, now: Date) => {
      const row = rows.find((r) => r.id === id && r.revokedAt === null);
      if (!row) return Promise.resolve(null);
      row.revokedAt = now;
      return Promise.resolve(row);
    }),
  };
}

const create = (service: OpsTokenService, scopes = [OpsTokenScope.LOGS_READ], ttlDays = 30) =>
  service.create('admin-1', { name: 'agent channel', scopes, ttlDays }, NOW);

describe('OpsTokenService', () => {
  let repo: ReturnType<typeof memoryRepository>;
  let service: OpsTokenService;

  beforeEach(() => {
    repo = memoryRepository();
    service = new OpsTokenService(repo as never);
  });

  it('returns the token once and stores only its hash and a short prefix', async () => {
    const { token, view } = await create(service);

    expect(token).toMatch(/^claw_ops_[A-Za-z0-9_-]{43}$/u);
    expect(repo.rows[0]?.tokenHash).toBe(hashOpsToken(token));
    expect(JSON.stringify(repo.rows[0])).not.toContain(token);
    expect(view.tokenPrefix).toBe(token.slice(0, 13));
    expect(JSON.stringify(view)).not.toContain(token);
    expect(view.expiresAt).toBe('2026-10-19T12:00:00.000Z');
  });

  it('verifies a live token for a scope it carries, and counts the use', async () => {
    const { token } = await create(service);

    await expect(service.verify(token, OpsTokenScope.LOGS_READ, NOW)).resolves.toMatchObject({
      valid: true,
      scopes: [OpsTokenScope.LOGS_READ],
    });
    expect(repo.rows[0]?.useCount).toBe(1);
  });

  it('refuses a token stored without the requested scope', async () => {
    const { token } = await create(service);
    const row = repo.rows[0];
    if (row) row.scopes = [];

    await expect(service.verify(token, OpsTokenScope.LOGS_READ, NOW)).resolves.toEqual({
      valid: false,
      tokenId: null,
      scopes: [],
    });
  });

  it('refuses an expired token', async () => {
    const { token } = await create(service, [OpsTokenScope.LOGS_READ], 1);
    const later = new Date(NOW.getTime() + 2 * 86_400_000);

    await expect(service.verify(token, OpsTokenScope.LOGS_READ, later)).resolves.toMatchObject({
      valid: false,
    });
  });

  it('refuses a revoked token, and a second revoke is not found', async () => {
    const { token, view } = await create(service);
    await service.revoke(view.id, 'admin-1', NOW);

    await expect(service.verify(token, OpsTokenScope.LOGS_READ, NOW)).resolves.toMatchObject({
      valid: false,
    });
    await expect(service.revoke(view.id, 'admin-1', NOW)).rejects.toThrow();
  });

  it('refuses a made-up token without touching the database', async () => {
    await expect(service.verify('Bearer xyz', OpsTokenScope.LOGS_READ, NOW)).resolves.toMatchObject(
      { valid: false },
    );
    expect(repo.findByHash).not.toHaveBeenCalled();
  });

  it('refuses a token with one character changed', async () => {
    const { token } = await create(service);
    const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

    await expect(service.verify(tampered, OpsTokenScope.LOGS_READ, NOW)).resolves.toMatchObject({
      valid: false,
    });
  });

  it('caps live tokens per admin', async () => {
    for (let i = 0; i < 10; i += 1) {
      await create(service);
    }
    await expect(create(service)).rejects.toThrow(/At most 10/u);
  });
});
