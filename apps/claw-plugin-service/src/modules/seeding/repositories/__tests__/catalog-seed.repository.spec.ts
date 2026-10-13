import { CatalogSource } from '../../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../../common/enums/runtime-kind.enum';
import { type PluginManifest } from '../../../catalog/schemas/plugin-manifest.schema';
import { parsePluginManifest } from '../../../catalog/utilities/parse-plugin-manifest.utility';
import { WEATHER_MANIFEST } from '../../constants/manifests/weather.manifest';
import { type SeedEntryContent, type SeedVersionData } from '../../types/seeding.types';
import { CatalogSeedRepository } from '../catalog-seed.repository';

function buildPrisma() {
  const prisma = {
    pluginCatalogEntry: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    pluginVersion: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    pluginTool: { deleteMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
    callback(prisma),
  );
  return prisma;
}

const content: SeedEntryContent = {
  category: 'data',
  publisher: 'ClawAI',
  iconKey: 'cloud',
  homepageUrl: null,
  translations: { en: { name: 'Weather', summary: 's', description: 'd' } },
};

function parsedWeatherManifest(): PluginManifest {
  const parsed = parsePluginManifest(WEATHER_MANIFEST);
  if (!parsed.ok) throw new Error(`weather fixture is invalid: ${parsed.errors.join('; ')}`);
  return parsed.manifest;
}

const version: SeedVersionData = {
  version: '1.0.0',
  runtimeKind: RuntimeKind.BUILTIN,
  manifest: parsedWeatherManifest(),
  manifestHash: 'a'.repeat(64),
  tools: [
    { name: 'get_weather', riskLevel: RiskLevel.READ, scopes: ['read'] },
    { name: 'get_alerts', riskLevel: RiskLevel.READ, scopes: [] },
  ],
};

describe('CatalogSeedRepository', () => {
  describe('findEntryBySlug', () => {
    it('returns null when the slug is unknown', async () => {
      const prisma = buildPrisma();
      prisma.pluginCatalogEntry.findUnique.mockResolvedValue(null);

      await expect(
        new CatalogSeedRepository(prisma as never).findEntryBySlug('x'),
      ).resolves.toBeNull();
      expect(prisma.pluginVersion.findUnique).not.toHaveBeenCalled();
    });

    it('returns the descriptive fields and the current version', async () => {
      const prisma = buildPrisma();
      prisma.pluginCatalogEntry.findUnique.mockResolvedValue({
        id: 'e1',
        ...content,
        currentVersionId: 'v1',
        status: 'HIDDEN',
        globallyEnabled: false,
      });
      prisma.pluginVersion.findUnique.mockResolvedValue({ id: 'v1', version: '1.0.0' });

      const entry = await new CatalogSeedRepository(prisma as never).findEntryBySlug('weather');

      expect(entry).toEqual({
        id: 'e1',
        ...content,
        currentVersion: { id: 'v1', version: '1.0.0' },
      });
      expect(entry).not.toHaveProperty('status');
      expect(entry).not.toHaveProperty('globallyEnabled');
    });

    it('returns a null current version when the entry has none', async () => {
      const prisma = buildPrisma();
      prisma.pluginCatalogEntry.findUnique.mockResolvedValue({
        id: 'e1',
        ...content,
        currentVersionId: null,
      });

      const entry = await new CatalogSeedRepository(prisma as never).findEntryBySlug('weather');

      expect(entry?.currentVersion).toBeNull();
      expect(prisma.pluginVersion.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('createEntryWithVersion', () => {
    it('creates a published first-party entry with its version and tools, then points at it', async () => {
      const prisma = buildPrisma();
      prisma.pluginCatalogEntry.create.mockResolvedValue({ id: 'e1', versions: [{ id: 'v1' }] });

      await new CatalogSeedRepository(prisma as never).createEntryWithVersion(
        'weather',
        content,
        version,
      );

      const data = prisma.pluginCatalogEntry.create.mock.calls[0]?.[0].data;
      expect(data).toMatchObject({
        slug: 'weather',
        source: CatalogSource.FIRST_PARTY,
        status: CatalogStatus.PUBLISHED,
        category: 'data',
        homepageUrl: null,
      });
      expect(data).not.toHaveProperty('globallyEnabled');
      expect(data).not.toHaveProperty('featured');
      expect(data.versions.create[0]).toMatchObject({
        version: '1.0.0',
        runtimeKind: 'BUILTIN',
        manifestHash: version.manifestHash,
        tools: { create: version.tools },
      });
      expect(prisma.pluginCatalogEntry.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { currentVersionId: 'v1' },
      });
    });

    it('does not point at a version when none came back', async () => {
      const prisma = buildPrisma();
      prisma.pluginCatalogEntry.create.mockResolvedValue({ id: 'e1', versions: [] });

      await new CatalogSeedRepository(prisma as never).createEntryWithVersion(
        'weather',
        content,
        version,
      );

      expect(prisma.pluginCatalogEntry.update).not.toHaveBeenCalled();
    });

    it('stores JSON copies, not live references to the manifest', async () => {
      const prisma = buildPrisma();
      prisma.pluginCatalogEntry.create.mockResolvedValue({ id: 'e1', versions: [{ id: 'v1' }] });

      await new CatalogSeedRepository(prisma as never).createEntryWithVersion(
        'weather',
        content,
        version,
      );

      const data = prisma.pluginCatalogEntry.create.mock.calls[0]?.[0].data;
      expect(data.translations).toEqual(content.translations);
      expect(data.translations).not.toBe(content.translations);
    });
  });

  describe('updateEntryContent', () => {
    it('writes only descriptive columns', async () => {
      const prisma = buildPrisma();

      await new CatalogSeedRepository(prisma as never).updateEntryContent('e1', content);

      const call = prisma.pluginCatalogEntry.update.mock.calls[0]?.[0];
      expect(call.where).toEqual({ id: 'e1' });
      expect(Object.keys(call.data).sort()).toEqual(
        ['category', 'homepageUrl', 'iconKey', 'publisher', 'translations'].sort(),
      );
    });
  });

  describe('findVersion', () => {
    it('looks the version up by the entry and version pair', async () => {
      const prisma = buildPrisma();
      prisma.pluginVersion.findUnique.mockResolvedValue({ id: 'v1', manifestHash: 'h' });

      await expect(
        new CatalogSeedRepository(prisma as never).findVersion('e1', '1.0.0'),
      ).resolves.toEqual({
        id: 'v1',
        manifestHash: 'h',
      });
      expect(prisma.pluginVersion.findUnique).toHaveBeenCalledWith({
        where: { entryId_version: { entryId: 'e1', version: '1.0.0' } },
        select: { id: true, manifestHash: true },
      });
    });
  });

  describe('addVersion', () => {
    it('adds the version and makes it current when asked', async () => {
      const prisma = buildPrisma();
      prisma.pluginVersion.create.mockResolvedValue({ id: 'v2' });

      await new CatalogSeedRepository(prisma as never).addVersion('e1', version, true);

      expect(prisma.pluginVersion.create.mock.calls[0]?.[0].data).toMatchObject({
        entryId: 'e1',
        version: '1.0.0',
        tools: { create: version.tools },
      });
      expect(prisma.pluginCatalogEntry.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { currentVersionId: 'v2' },
      });
    });

    it('leaves the current pointer alone when not asked', async () => {
      const prisma = buildPrisma();
      prisma.pluginVersion.create.mockResolvedValue({ id: 'v2' });

      await new CatalogSeedRepository(prisma as never).addVersion('e1', version, false);

      expect(prisma.pluginCatalogEntry.update).not.toHaveBeenCalled();
    });
  });

  describe('setCurrentVersion', () => {
    it('points the entry at the version', async () => {
      const prisma = buildPrisma();

      await new CatalogSeedRepository(prisma as never).setCurrentVersion('e1', 'v3');

      expect(prisma.pluginCatalogEntry.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { currentVersionId: 'v3' },
      });
    });
  });
});
