import { describe, expect, it, vi } from 'vitest';
import { RoutineSecretRepository } from '../routine-secret.repository';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

const sealed = {
  routineId: 'routine-1',
  userId: 'user-1',
  name: 'API_KEY',
  ciphertext: 'c2VhbGVk',
};

function build() {
  const tx = {
    routineSecret: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi
        .fn()
        .mockResolvedValue({ name: 'API_KEY', createdAt: new Date(), updatedAt: new Date() }),
    },
  };
  const routineSecret = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue({ name: 'API_KEY' }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const prisma = {
    routineSecret,
    $transaction: vi.fn().mockImplementation((work: (t: typeof tx) => unknown) => work(tx)),
  };
  return {
    repo: new RoutineSecretRepository(prisma as unknown as PrismaService),
    tx,
    routineSecret,
    prisma,
  };
}

describe('RoutineSecretRepository', () => {
  it('every read and write is scoped by routine and owner', async () => {
    const { repo, routineSecret } = build();
    await repo.listMetadata('routine-1', 'user-1');
    await repo.listSealed('routine-1', 'user-1');
    await repo.replace(sealed);
    await repo.remove('routine-1', 'user-1', 'API_KEY');
    expect(routineSecret.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { routineId: 'routine-1', userId: 'user-1' } }),
    );
    expect(routineSecret.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { routineId: 'routine-1', userId: 'user-1' } }),
    );
    expect(routineSecret.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { routineId: 'routine-1', userId: 'user-1', name: 'API_KEY' },
      }),
    );
    expect(routineSecret.deleteMany).toHaveBeenCalledWith({
      where: { routineId: 'routine-1', userId: 'user-1', name: 'API_KEY' },
    });
  });

  it('the owner listing selects metadata only, never the ciphertext', async () => {
    const { repo, routineSecret } = build();
    await repo.listMetadata('routine-1', 'user-1');
    const args = routineSecret.findMany.mock.calls[0]?.[0] as { select: Record<string, boolean> };
    expect(Object.keys(args.select).sort()).toEqual(['createdAt', 'name', 'updatedAt']);
  });

  it('creates inside a serializable transaction and selects metadata only', async () => {
    const { repo, tx, prisma } = build();
    expect((await repo.createWithinLimit(sealed, 20)).status).toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    const args = tx.routineSecret.create.mock.calls[0]?.[0] as { select: Record<string, boolean> };
    expect(Object.keys(args.select).sort()).toEqual(['createdAt', 'name', 'updatedAt']);
  });

  it('reports exists and limit without writing', async () => {
    const taken = build();
    taken.tx.routineSecret.findFirst.mockResolvedValueOnce({ id: 'x' });
    expect(await taken.repo.createWithinLimit(sealed, 20)).toEqual({ status: 'exists' });
    expect(taken.tx.routineSecret.create).not.toHaveBeenCalled();
    const full = build();
    full.tx.routineSecret.count.mockResolvedValueOnce(20);
    expect(await full.repo.createWithinLimit(sealed, 20)).toEqual({ status: 'limit' });
    expect(full.tx.routineSecret.create).not.toHaveBeenCalled();
  });

  it('maps a unique violation and a serialization failure to exists, and rethrows anything else', async () => {
    for (const code of ['P2002', 'P2034']) {
      const { repo, prisma } = build();
      prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('x'), { code }));
      expect(await repo.createWithinLimit(sealed, 20)).toEqual({ status: 'exists' });
    }
    const { repo, prisma } = build();
    prisma.$transaction.mockRejectedValueOnce(new Error('connection lost'));
    await expect(repo.createWithinLimit(sealed, 20)).rejects.toThrow('connection lost');
  });

  it('replace and remove report a miss', async () => {
    const { repo, routineSecret } = build();
    routineSecret.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await repo.replace(sealed)).toEqual({ status: 'missing' });
    routineSecret.deleteMany.mockResolvedValueOnce({ count: 0 });
    expect(await repo.remove('routine-1', 'user-1', 'API_KEY')).toBe(false);
    routineSecret.findFirst.mockResolvedValueOnce(null);
    expect(await repo.replace(sealed)).toEqual({ status: 'missing' });
  });
});
