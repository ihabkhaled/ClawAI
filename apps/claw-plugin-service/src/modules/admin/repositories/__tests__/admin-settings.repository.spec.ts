import { AdminSettingsRepository } from '../admin-settings.repository';

function buildRepository() {
  const prisma = {
    pluginSetting: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn((args: unknown) => ({ args })),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return { prisma, repository: new AdminSettingsRepository(prisma as never) };
}

describe('AdminSettingsRepository', () => {
  it('reads every stored row', async () => {
    const { prisma, repository } = buildRepository();

    await repository.findAll();

    expect(prisma.pluginSetting.findMany).toHaveBeenCalledWith({
      select: { key: true, value: true, updatedAt: true },
    });
  });

  it('upserts all values in one transaction and records who changed them', async () => {
    const { prisma, repository } = buildRepository();

    await repository.upsertMany({ 'loop.maxRounds': 3, 'userServers.enabled': false }, 'admin-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.pluginSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'loop.maxRounds' },
      create: { key: 'loop.maxRounds', value: 3, updatedBy: 'admin-1' },
      update: { value: 3, updatedBy: 'admin-1' },
    });
    expect(prisma.pluginSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'userServers.enabled' },
      create: { key: 'userServers.enabled', value: false, updatedBy: 'admin-1' },
      update: { value: false, updatedBy: 'admin-1' },
    });
    expect(prisma.$transaction.mock.calls[0]?.[0]).toHaveLength(2);
  });
});
