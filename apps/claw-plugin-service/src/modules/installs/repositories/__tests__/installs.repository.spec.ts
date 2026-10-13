import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../../common/enums/install-status.enum';
import { InstallsRepository } from '../installs.repository';

function installRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'install-1',
    userId: 'user-1',
    pluginId: 'entry-1',
    versionId: 'version-1',
    status: 'ENABLED',
    settings: { units: 'metric' },
    installedAt: new Date('2026-10-13T10:00:00.000Z'),
    updatedAt: new Date('2026-10-13T11:00:00.000Z'),
    plugin: {
      id: 'entry-1',
      slug: 'weather',
      status: 'PUBLISHED',
      globallyEnabled: true,
      translations: {},
      iconKey: 'cloud',
      currentVersionId: 'version-2',
    },
    version: { id: 'version-1', version: '1.0.0', manifest: {} },
    credential: { kind: 'API_KEY', updatedAt: new Date('2026-10-13T09:00:00.000Z') },
    consents: [
      { toolName: 'send', level: 'WRITE', grantedAt: new Date('2026-10-13T08:00:00.000Z') },
    ],
    ...overrides,
  };
}

function buildRepository() {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    pluginInstall: {
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    pluginCatalogEntry: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    pluginInstall: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    pluginCatalogEntry: { findUnique: vi.fn() },
    pluginVersion: { findMany: vi.fn().mockResolvedValue([{ id: 'version-2', version: '1.1.0' }]) },
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  return { prisma, tx, repository: new InstallsRepository(prisma as never) };
}

const INPUT = { userId: 'user-1', pluginId: 'entry-1', versionId: 'version-1', settings: {} };

describe('InstallsRepository', () => {
  describe('findOwned', () => {
    it('queries by id AND owner, so another user id finds nothing', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.findFirst.mockResolvedValue(null);

      await expect(repository.findOwned('install-1', 'intruder')).resolves.toBeNull();
      expect(prisma.pluginInstall.findFirst.mock.calls[0]?.[0].where).toEqual({
        id: 'install-1',
        userId: 'intruder',
      });
    });

    it('maps the row and adds the latest version number', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.findFirst.mockResolvedValue(installRow());

      const record = await repository.findOwned('install-1', 'user-1');

      expect(prisma.pluginVersion.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['version-2'] } },
        select: { id: true, version: true },
      });
      expect(record).toMatchObject({
        id: 'install-1',
        status: InstallStatus.ENABLED,
        plugin: { slug: 'weather', status: CatalogStatus.PUBLISHED, latestVersion: '1.1.0' },
        version: { version: '1.0.0' },
        credential: { kind: 'API_KEY' },
        consents: [{ toolName: 'send', level: 'WRITE' }],
      });
    });

    it('never selects the credential ciphertext', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.findFirst.mockResolvedValue(installRow());

      await repository.findOwned('install-1', 'user-1');

      const include = prisma.pluginInstall.findFirst.mock.calls[0]?.[0].include;
      expect(include.credential).toEqual({ select: { kind: true, updatedAt: true } });
    });

    it('reports a null latest version when the plugin has no current version', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.findFirst.mockResolvedValue(
        installRow({
          plugin: { ...installRow().plugin, currentVersionId: null },
          credential: null,
        }),
      );

      const record = await repository.findOwned('install-1', 'user-1');

      expect(record?.plugin.latestVersion).toBeNull();
      expect(record?.credential).toBeNull();
    });
  });

  describe('findAllOwned', () => {
    it('lists only the owner installs, newest first, capped', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.findMany.mockResolvedValue([installRow()]);

      const records = await repository.findAllOwned('user-1');

      expect(records).toHaveLength(1);
      expect(prisma.pluginInstall.findMany.mock.calls[0]?.[0]).toMatchObject({
        where: { userId: 'user-1' },
        take: 500,
      });
    });

    it('returns an empty list without a version lookup', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.findMany.mockResolvedValue([]);

      await expect(repository.findAllOwned('user-1')).resolves.toEqual([]);
      expect(prisma.pluginVersion.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findEntryForInstall', () => {
    it('returns null for an unknown slug', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findUnique.mockResolvedValue(null);

      await expect(repository.findEntryForInstall('nope')).resolves.toBeNull();
    });

    it('maps the entry with its versions', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCatalogEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        slug: 'weather',
        status: 'DRAFT',
        globallyEnabled: false,
        currentVersionId: 'version-1',
        versions: [{ id: 'version-1', version: '1.0.0', manifest: {} }],
      });

      await expect(repository.findEntryForInstall('weather')).resolves.toEqual({
        id: 'entry-1',
        slug: 'weather',
        status: CatalogStatus.DRAFT,
        globallyEnabled: false,
        currentVersionId: 'version-1',
        versions: [{ id: 'version-1', version: '1.0.0', manifest: {} }],
      });
    });
  });

  describe('createWithinCap', () => {
    it('takes the per-user lock, creates the install and bumps the install count', async () => {
      const { tx, repository } = buildRepository();

      const outcome = await repository.createWithinCap(INPUT, 5);

      expect(outcome).toEqual({ kind: 'CREATED', installId: expect.any(String) });
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      const call = tx.pluginInstall.createMany.mock.calls[0]?.[0];
      expect(call.skipDuplicates).toBe(true);
      expect(call.data).toEqual([
        {
          id: outcome.kind === 'CREATED' ? outcome.installId : '',
          userId: 'user-1',
          pluginId: 'entry-1',
          versionId: 'version-1',
          settings: {},
        },
      ]);
      expect(tx.pluginCatalogEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { installCount: { increment: 1 } },
      });
    });

    it('refuses at the cap and creates nothing', async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.count.mockResolvedValue(5);

      await expect(repository.createWithinCap(INPUT, 5)).resolves.toEqual({
        kind: 'LIMIT',
        current: 5,
      });
      expect(tx.pluginInstall.createMany).not.toHaveBeenCalled();
    });

    it('refuses everything when the cap is 0 (installs disabled)', async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.count.mockResolvedValue(0);

      await expect(repository.createWithinCap(INPUT, 0)).resolves.toEqual({
        kind: 'LIMIT',
        current: 0,
      });
      expect(tx.pluginInstall.createMany).not.toHaveBeenCalled();
    });

    it('allows any number of installs when the cap is null (unlimited)', async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.count.mockResolvedValue(10_000);

      await expect(repository.createWithinCap(INPUT, null)).resolves.toMatchObject({
        kind: 'CREATED',
      });
    });

    it('allows the install just under the cap', async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.count.mockResolvedValue(4);

      await expect(repository.createWithinCap(INPUT, 5)).resolves.toMatchObject({
        kind: 'CREATED',
      });
    });

    it('reports a duplicate before the cap check', async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.findUnique.mockResolvedValue({ id: 'existing' });
      tx.pluginInstall.count.mockResolvedValue(99);

      await expect(repository.createWithinCap(INPUT, 5)).resolves.toEqual({ kind: 'DUPLICATE' });
      expect(tx.pluginInstall.count).not.toHaveBeenCalled();
      expect(tx.pluginInstall.createMany).not.toHaveBeenCalled();
    });

    it('turns a lost race (nothing inserted) into a duplicate and does not bump the count', async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.createMany.mockResolvedValue({ count: 0 });

      await expect(repository.createWithinCap(INPUT, 5)).resolves.toEqual({ kind: 'DUPLICATE' });
      expect(tx.pluginCatalogEntry.update).not.toHaveBeenCalled();
    });

    it('propagates a database error', async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.createMany.mockRejectedValue(new Error('connection lost'));

      await expect(repository.createWithinCap(INPUT, 5)).rejects.toThrow('connection lost');
    });
  });

  describe('update', () => {
    it('updates by id AND owner and re-reads the install', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.updateMany.mockResolvedValue({ count: 1 });
      prisma.pluginInstall.findFirst.mockResolvedValue(installRow());

      const record = await repository.update('install-1', 'user-1', {
        status: InstallStatus.DISABLED,
        settings: { units: 'imperial' },
      });

      expect(prisma.pluginInstall.updateMany).toHaveBeenCalledWith({
        where: { id: 'install-1', userId: 'user-1' },
        data: { status: 'DISABLED', settings: { units: 'imperial' } },
      });
      expect(record?.id).toBe('install-1');
    });

    it('only sends the fields that changed', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.updateMany.mockResolvedValue({ count: 1 });
      prisma.pluginInstall.findFirst.mockResolvedValue(installRow());

      await repository.update('install-1', 'user-1', { status: InstallStatus.ENABLED });
      await repository.update('install-1', 'user-1', { settings: {} });

      expect(prisma.pluginInstall.updateMany.mock.calls[0]?.[0].data).toEqual({
        status: 'ENABLED',
      });
      expect(prisma.pluginInstall.updateMany.mock.calls[1]?.[0].data).toEqual({ settings: {} });
    });

    it('returns null when no row of this owner matched', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginInstall.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.update('install-1', 'intruder', { status: InstallStatus.DISABLED }),
      ).resolves.toBeNull();
      expect(prisma.pluginInstall.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the owner install and lowers the plugin install count', async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.findFirst.mockResolvedValue({ pluginId: 'entry-1' });

      await expect(repository.remove('install-1', 'user-1')).resolves.toBe(true);
      expect(tx.pluginInstall.findFirst).toHaveBeenCalledWith({
        where: { id: 'install-1', userId: 'user-1' },
        select: { pluginId: true },
      });
      expect(tx.pluginInstall.delete).toHaveBeenCalledWith({ where: { id: 'install-1' } });
      expect(tx.pluginCatalogEntry.updateMany).toHaveBeenCalledWith({
        where: { id: 'entry-1', installCount: { gt: 0 } },
        data: { installCount: { decrement: 1 } },
      });
    });

    it("deletes nothing for another user's install id", async () => {
      const { tx, repository } = buildRepository();
      tx.pluginInstall.findFirst.mockResolvedValue(null);

      await expect(repository.remove('install-1', 'intruder')).resolves.toBe(false);
      expect(tx.pluginInstall.delete).not.toHaveBeenCalled();
      expect(tx.pluginCatalogEntry.updateMany).not.toHaveBeenCalled();
    });
  });
});
