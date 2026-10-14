import { ImportInstallOutcome } from '../../../../common/enums/import-install-outcome.enum';
import { IMPORT_QUOTA } from '../../constants/plugin-import.constants';
import { type DraftRecord, type ImportPreview } from '../../types/plugin-import.types';
import { PluginImportRepository } from '../plugin-import.repository';

const PREVIEW = { name: 'Thing', version: '1.0.0', components: [] } as unknown as ImportPreview;
const DRAFT: DraftRecord = {
  id: 'd1',
  userId: 'user-1',
  sourceKind: 'UPLOAD',
  sourceRef: 'thing.zip',
  commitSha: null,
  checksum: 'c'.repeat(64),
  preview: PREVIEW,
  files: [{ path: 'skills/a/SKILL.md', content: 'héllo' }],
  totalBytes: 6,
  expiresAt: new Date(),
};

function build(usage: { count: number; bytes: number }, createError?: unknown) {
  const tx = {
    importedPlugin: {
      aggregate: vi
        .fn()
        .mockResolvedValue({ _count: { _all: usage.count }, _sum: { totalBytes: usage.bytes } }),
      create: vi.fn(async () => {
        if (createError !== undefined) throw createError;
        return {
          ...DRAFT,
          id: 'p1',
          name: 'Thing',
          version: '1.0.0',
          fileCount: 1,
          createdAt: new Date(),
        };
      }),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    pluginImportAudit: { create: vi.fn() },
    pluginImportDraft: { deleteMany: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    pluginImportDraft: {
      deleteMany: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    importedPlugin: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    pluginImportAudit: { deleteMany: vi.fn() },
  };
  return { tx, prisma, repository: new PluginImportRepository(prisma as never) };
}

describe('plugin import repository', () => {
  it('installs the draft, audits it and discards the draft in one transaction', async () => {
    const { tx, repository } = build({ count: 0, bytes: 0 });

    const result = await repository.installDraft(DRAFT, 'thing');

    expect(result.outcome).toBe(ImportInstallOutcome.INSTALLED);
    expect(tx.importedPlugin.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', nameKey: 'thing', totalBytes: 6 }),
    });
    expect(tx.pluginImportAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'IMPORT',
        checksum: DRAFT.checksum,
        userId: 'user-1',
      }),
    });
    expect(tx.pluginImportDraft.deleteMany).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });

  it('refuses past the plugin-count quota', async () => {
    const { tx, repository } = build({ count: IMPORT_QUOTA.maxPlugins, bytes: 0 });
    expect(await repository.installDraft(DRAFT, 'thing')).toEqual({
      outcome: ImportInstallOutcome.QUOTA_PLUGINS,
    });
    expect(tx.importedPlugin.create).not.toHaveBeenCalled();
  });

  it('refuses past the stored-bytes quota', async () => {
    const { repository } = build({ count: 1, bytes: IMPORT_QUOTA.maxTotalBytes - 1 });
    expect(await repository.installDraft(DRAFT, 'thing')).toEqual({
      outcome: ImportInstallOutcome.QUOTA_BYTES,
    });
  });

  it('turns a duplicate name into a stable code', async () => {
    const { repository } = build({ count: 0, bytes: 0 }, { code: 'P2002' });
    expect(await repository.installDraft(DRAFT, 'thing')).toEqual({
      outcome: ImportInstallOutcome.DUPLICATE,
    });
  });

  it('scopes every read, remove and draft lookup by the owner', async () => {
    const { prisma, tx, repository } = build({ count: 0, bytes: 0 });
    prisma.importedPlugin.findFirst.mockResolvedValue(null);
    prisma.pluginImportDraft.findFirst.mockResolvedValue(null);
    await repository.findOwned('p1', 'user-1');
    await repository.findDraft('d1', 'user-1');
    tx.importedPlugin.findFirst.mockResolvedValue(null);
    const removed = await repository.remove('p1', 'user-1');

    expect(prisma.importedPlugin.findFirst).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'user-1' },
    });
    expect(prisma.pluginImportDraft.findFirst).toHaveBeenCalledWith({
      where: { id: 'd1', userId: 'user-1', expiresAt: { gt: expect.any(Date) } },
    });
    expect(tx.importedPlugin.findFirst).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'user-1' },
    });
    expect(removed).toBe(false);
    expect(tx.importedPlugin.delete).not.toHaveBeenCalled();
  });

  it('removes and audits an owned plugin', async () => {
    const { tx, repository } = build({ count: 0, bytes: 0 });
    tx.importedPlugin.findFirst.mockResolvedValue({
      name: 'Thing',
      sourceKind: 'UPLOAD',
      sourceRef: 'thing.zip',
      commitSha: null,
      checksum: 'c',
    });
    expect(await repository.remove('p1', 'user-1')).toBe(true);
    expect(tx.pluginImportAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'REMOVE', pluginName: 'Thing' }),
    });
  });

  it('keeps at most the draft cap per user when a new draft is stored', async () => {
    const { prisma, repository } = build({ count: 0, bytes: 0 });
    prisma.pluginImportDraft.findMany.mockResolvedValue([{ id: 'old1' }, { id: 'old2' }]);
    prisma.pluginImportDraft.create.mockResolvedValue({ id: 'new' });

    await repository.createDraft({ ...DRAFT });

    expect(prisma.pluginImportDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: IMPORT_QUOTA.maxDrafts - 1 }),
    );
    expect(prisma.pluginImportDraft.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old1', 'old2'] } },
    });
  });
});
