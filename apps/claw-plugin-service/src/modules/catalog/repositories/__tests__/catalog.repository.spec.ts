import { CatalogSource } from '../../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { CatalogRepository } from '../catalog.repository';

type EntryRow = {
  id: string;
  slug: string;
  source: 'FIRST_PARTY' | 'CURATED_MCP';
  category: string;
  publisher: string;
  iconKey: string;
  homepageUrl: string | null;
  translations: unknown;
  featured: boolean;
  installCount: number;
  currentVersionId: string | null;
};

function entryRow(overrides: Partial<EntryRow> = {}): EntryRow {
  return {
    id: 'entry-1',
    slug: 'weather',
    source: 'FIRST_PARTY',
    category: 'data',
    publisher: 'ClawAI',
    iconKey: 'cloud',
    homepageUrl: null,
    translations: { en: { name: 'Weather', summary: 's', description: 'd' } },
    featured: true,
    installCount: 4,
    currentVersionId: 'version-2',
    ...overrides,
  };
}

function versionRow(id: string, version: string, entryId = 'entry-1') {
  return {
    id,
    entryId,
    version,
    manifest: { slug: 'weather', version },
    tools: [{ name: 'get_weather', riskLevel: 'READ', disabledByAdmin: false, scopes: [] }],
  };
}

function buildRepository() {
  const prisma = {
    pluginCatalogEntry: { findMany: vi.fn(), findFirst: vi.fn() },
    pluginVersion: { findMany: vi.fn() },
  };
  return { prisma, repository: new CatalogRepository(prisma as never) };
}

describe('CatalogRepository', () => {
  describe('findVisibleEntries', () => {
    it('queries only published, globally enabled entries that have a current version', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findMany.mockResolvedValue([]);

      await repository.findVisibleEntries();

      expect(prisma.pluginCatalogEntry.findMany).toHaveBeenCalledWith({
        where: {
          status: CatalogStatus.PUBLISHED,
          globallyEnabled: true,
          currentVersionId: { not: null },
        },
        orderBy: [{ featured: 'desc' }, { slug: 'asc' }],
      });
      expect(prisma.pluginVersion.findMany).not.toHaveBeenCalled();
    });

    it('adds the category filter when one is given', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findMany.mockResolvedValue([]);

      await repository.findVisibleEntries('search');

      expect(prisma.pluginCatalogEntry.findMany.mock.calls[0]?.[0].where).toMatchObject({
        category: 'search',
        status: CatalogStatus.PUBLISHED,
      });
    });

    it('attaches the current version, its tools and every version number', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findMany.mockResolvedValue([entryRow()]);
      prisma.pluginVersion.findMany.mockResolvedValue([
        versionRow('version-2', '1.1.0'),
        versionRow('version-1', '1.0.0'),
      ]);

      const [record] = await repository.findVisibleEntries();

      expect(prisma.pluginVersion.findMany).toHaveBeenCalledWith({
        where: { entryId: { in: ['entry-1'] } },
        include: { tools: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(record).toMatchObject({
        id: 'entry-1',
        slug: 'weather',
        source: CatalogSource.FIRST_PARTY,
        featured: true,
        installCount: 4,
        versions: ['1.1.0', '1.0.0'],
        currentVersion: {
          id: 'version-2',
          version: '1.1.0',
          tools: [{ name: 'get_weather', riskLevel: RiskLevel.READ, disabledByAdmin: false }],
        },
      });
    });

    it('skips an entry whose current version row is missing', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findMany.mockResolvedValue([
        entryRow({ currentVersionId: 'gone' }),
        entryRow({ id: 'entry-2', slug: 'web-fetch', currentVersionId: 'version-9' }),
      ]);
      prisma.pluginVersion.findMany.mockResolvedValue([
        versionRow('version-9', '1.0.0', 'entry-2'),
      ]);

      const records = await repository.findVisibleEntries();

      expect(records.map((record) => record.slug)).toEqual(['web-fetch']);
    });

    it('keeps each entry with its own versions', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findMany.mockResolvedValue([
        entryRow({ currentVersionId: 'version-1' }),
        entryRow({ id: 'entry-2', slug: 'web-fetch', currentVersionId: 'version-9' }),
      ]);
      prisma.pluginVersion.findMany.mockResolvedValue([
        versionRow('version-1', '1.0.0'),
        versionRow('version-9', '3.0.0', 'entry-2'),
      ]);

      const records = await repository.findVisibleEntries();

      expect(records.map((record) => record.versions)).toEqual([['1.0.0'], ['3.0.0']]);
    });
  });

  describe('findVisibleEntryBySlug', () => {
    it('returns null when no visible entry has the slug', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findFirst.mockResolvedValue(null);

      await expect(repository.findVisibleEntryBySlug('missing')).resolves.toBeNull();
      expect(prisma.pluginCatalogEntry.findFirst).toHaveBeenCalledWith({
        where: {
          status: CatalogStatus.PUBLISHED,
          globallyEnabled: true,
          currentVersionId: { not: null },
          slug: 'missing',
        },
      });
    });

    it('returns the entry with its versions', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findFirst.mockResolvedValue(entryRow());
      prisma.pluginVersion.findMany.mockResolvedValue([versionRow('version-2', '1.1.0')]);

      await expect(repository.findVisibleEntryBySlug('weather')).resolves.toMatchObject({
        slug: 'weather',
        versions: ['1.1.0'],
      });
    });

    it('returns null when the current version row is missing', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findFirst.mockResolvedValue(entryRow());
      prisma.pluginVersion.findMany.mockResolvedValue([]);

      await expect(repository.findVisibleEntryBySlug('weather')).resolves.toBeNull();
    });
  });
});
