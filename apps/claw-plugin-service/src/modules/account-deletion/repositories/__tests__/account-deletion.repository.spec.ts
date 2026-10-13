import { AccountDeletionRepository } from '../account-deletion.repository';

function buildRepository(installs: Array<{ pluginId: string }>) {
  const tx = {
    pluginInstall: {
      findMany: vi.fn().mockResolvedValue(installs),
      deleteMany: vi.fn().mockResolvedValue({ count: installs.length }),
    },
    pluginCredential: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    pluginToolConsent: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    pluginInvocation: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
    pluginCatalogEntry: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  return { tx, repository: new AccountDeletionRepository(prisma as never) };
}

describe('AccountDeletionRepository', () => {
  it('deletes credentials, consents, invocations and installs for the user in one transaction', async () => {
    const { tx, repository } = buildRepository([{ pluginId: 'a' }, { pluginId: 'b' }]);

    const counts = await repository.deleteAllForUser('user-1');

    expect(tx.pluginCredential.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(tx.pluginToolConsent.deleteMany).toHaveBeenCalledWith({
      where: { install: { userId: 'user-1' } },
    });
    expect(tx.pluginInvocation.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(tx.pluginInstall.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(counts).toEqual({ installs: 2, credentials: 1, consents: 2, invocations: 5 });
  });

  it('only ever filters by the deleted user', async () => {
    const { tx, repository } = buildRepository([]);

    await repository.deleteAllForUser('user-1');

    const wheres = [
      tx.pluginInstall.findMany.mock.calls[0]?.[0].where,
      tx.pluginCredential.deleteMany.mock.calls[0]?.[0].where,
      tx.pluginInvocation.deleteMany.mock.calls[0]?.[0].where,
      tx.pluginInstall.deleteMany.mock.calls[0]?.[0].where,
    ];
    expect(wheres).toEqual(Array.from({ length: 4 }, () => ({ userId: 'user-1' })));
  });

  it('lowers each plugin install count once, never below zero', async () => {
    const { tx, repository } = buildRepository([
      { pluginId: 'a' },
      { pluginId: 'a' },
      { pluginId: 'b' },
    ]);

    await repository.deleteAllForUser('user-1');

    expect(tx.pluginCatalogEntry.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.pluginCatalogEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'a', installCount: { gt: 0 } },
      data: { installCount: { decrement: 1 } },
    });
  });

  it('finds nothing the second time', async () => {
    const { tx, repository } = buildRepository([]);
    tx.pluginInstall.deleteMany.mockResolvedValue({ count: 0 });
    tx.pluginCredential.deleteMany.mockResolvedValue({ count: 0 });
    tx.pluginToolConsent.deleteMany.mockResolvedValue({ count: 0 });
    tx.pluginInvocation.deleteMany.mockResolvedValue({ count: 0 });

    await expect(repository.deleteAllForUser('user-1')).resolves.toEqual({
      installs: 0,
      credentials: 0,
      consents: 0,
      invocations: 0,
    });
    expect(tx.pluginCatalogEntry.updateMany).not.toHaveBeenCalled();
  });
});
