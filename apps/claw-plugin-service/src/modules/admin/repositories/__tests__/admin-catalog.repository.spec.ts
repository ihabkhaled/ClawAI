import { CatalogSource } from '../../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { AdminCatalogRepository } from '../admin-catalog.repository';

function entryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    slug: 'weather',
    source: 'FIRST_PARTY',
    status: 'DRAFT',
    category: 'data',
    publisher: 'ClawAI',
    iconKey: 'cloud',
    translations: {},
    globallyEnabled: false,
    featured: true,
    installCount: 3,
    currentVersionId: 'version-1',
    ...overrides,
  };
}

function buildRepository() {
  const tx = {
    pluginCatalogEntry: { update: vi.fn().mockResolvedValue({}) },
    pluginTool: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    pluginCatalogEntry: { findMany: vi.fn(), findUnique: vi.fn() },
    pluginVersion: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'version-1',
          version: '1.0.0',
          tools: [{ name: 'get_weather', riskLevel: 'READ', disabledByAdmin: true }],
        },
      ]),
    },
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  return { prisma, tx, repository: new AdminCatalogRepository(prisma as never) };
}

describe('AdminCatalogRepository', () => {
  it('lists entries of every status, with their current version and tools', async () => {
    const { prisma, repository } = buildRepository();
    prisma.pluginCatalogEntry.findMany.mockResolvedValue([entryRow()]);

    const [record] = await repository.findAll();

    expect(prisma.pluginCatalogEntry.findMany).toHaveBeenCalledWith({
      orderBy: [{ featured: 'desc' }, { slug: 'asc' }],
    });
    expect(record).toMatchObject({
      slug: 'weather',
      source: CatalogSource.FIRST_PARTY,
      status: CatalogStatus.DRAFT,
      globallyEnabled: false,
      featured: true,
      currentVersion: {
        id: 'version-1',
        version: '1.0.0',
        tools: [{ name: 'get_weather', riskLevel: RiskLevel.READ, disabledByAdmin: true }],
      },
    });
  });

  it('returns an empty list without a version lookup', async () => {
    const { prisma, repository } = buildRepository();
    prisma.pluginCatalogEntry.findMany.mockResolvedValue([]);

    await expect(repository.findAll()).resolves.toEqual([]);
    expect(prisma.pluginVersion.findMany).not.toHaveBeenCalled();
  });

  it('reads an entry without a current version as having none', async () => {
    const { prisma, repository } = buildRepository();
    prisma.pluginCatalogEntry.findUnique.mockResolvedValue(entryRow({ currentVersionId: null }));
    prisma.pluginVersion.findMany.mockResolvedValue([]);

    const record = await repository.findBySlug('weather');

    expect(record?.currentVersion).toBeNull();
  });

  it('returns null for an unknown slug', async () => {
    const { prisma, repository } = buildRepository();
    prisma.pluginCatalogEntry.findUnique.mockResolvedValue(null);

    await expect(repository.findBySlug('nope')).resolves.toBeNull();
    expect(prisma.pluginCatalogEntry.findUnique).toHaveBeenCalledWith({ where: { slug: 'nope' } });
  });

  describe('applyChanges', () => {
    it('updates the entry switches and the tools of the given version in one transaction', async () => {
      const { tx, repository } = buildRepository();

      await repository.applyChanges(
        'entry-1',
        'version-1',
        { globallyEnabled: false, featured: true },
        [
          { name: 'get_weather', disabledByAdmin: true },
          { name: 'other', disabledByAdmin: false },
        ],
      );

      expect(tx.pluginCatalogEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { globallyEnabled: false, featured: true },
      });
      expect(tx.pluginTool.updateMany).toHaveBeenCalledTimes(2);
      expect(tx.pluginTool.updateMany).toHaveBeenCalledWith({
        where: { versionId: 'version-1', name: 'get_weather' },
        data: { disabledByAdmin: true },
      });
    });

    it('skips the entry update when only tools change', async () => {
      const { tx, repository } = buildRepository();

      await repository.applyChanges('entry-1', 'version-1', {}, [
        { name: 'get_weather', disabledByAdmin: true },
      ]);

      expect(tx.pluginCatalogEntry.update).not.toHaveBeenCalled();
      expect(tx.pluginTool.updateMany).toHaveBeenCalledTimes(1);
    });

    it('skips tools when there is no version', async () => {
      const { tx, repository } = buildRepository();

      await repository.applyChanges('entry-1', null, { featured: false }, [
        { name: 'get_weather', disabledByAdmin: true },
      ]);

      expect(tx.pluginCatalogEntry.update).toHaveBeenCalledTimes(1);
      expect(tx.pluginTool.updateMany).not.toHaveBeenCalled();
    });
  });
});
