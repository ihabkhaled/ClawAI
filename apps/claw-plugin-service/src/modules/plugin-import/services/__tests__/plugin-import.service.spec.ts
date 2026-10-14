import { ImportErrorCode } from '../../../../common/enums/import-error-code.enum';
import { ImportSourceKind } from '../../../../common/enums/import-source-kind.enum';
import { buildZip } from '../../__tests__/archive-builders';
import { file, iHaveHeadacheLayout } from '../../__tests__/plugin-fixtures';
import { ImportInstallOutcome } from '../../../../common/enums/import-install-outcome.enum';
import { type DraftRecord } from '../../types/plugin-import.types';
import { PluginImportService } from '../plugin-import.service';

const SHA = 'b'.repeat(40);

function build(overrides: { fetched?: unknown } = {}) {
  const github = {
    fetch: vi
      .fn()
      .mockResolvedValue(
        overrides.fetched ?? { files: iHaveHeadacheLayout(), commitSha: SHA, ref: 'main' },
      ),
  };
  const created: DraftRecord[] = [];
  const repository = {
    createDraft: vi.fn(async (input: Omit<DraftRecord, 'id' | 'expiresAt'>) => {
      const draft = { ...input, id: 'draft-1', expiresAt: new Date('2026-10-15T10:30:00Z') };
      created.push(draft);
      return draft;
    }),
    findDraft: vi.fn(async () => created[0] ?? null),
    installDraft: vi.fn(async (draft: DraftRecord) => ({
      outcome: ImportInstallOutcome.INSTALLED,
      record: {
        id: 'plugin-1',
        name: draft.preview.name,
        version: draft.preview.version,
        sourceKind: draft.sourceKind,
        sourceRef: draft.sourceRef,
        commitSha: draft.commitSha,
        checksum: draft.checksum,
        preview: draft.preview,
        totalBytes: 10,
        fileCount: draft.files.length,
        createdAt: new Date('2026-10-15T10:00:00Z'),
      },
    })),
    list: vi.fn().mockResolvedValue([]),
    findOwned: vi.fn(),
    remove: vi.fn(),
  };
  const planGate = { resolveInstallCap: vi.fn().mockResolvedValue(null) };
  const service = new PluginImportService(github as never, repository as never, planGate as never);
  return { service, github, repository, planGate };
}

describe('plugin import service', () => {
  it('previews a GitHub source into a draft that records the pinned commit and a checksum', async () => {
    const { service, repository } = build();

    const result = await service.previewGithub('user-1', 'owner/repo');

    expect(result.kind).toBe('PLUGIN');
    if (result.kind !== 'PLUGIN') return;
    expect(result.draft.source).toEqual({
      kind: ImportSourceKind.GITHUB,
      ref: 'owner/repo@main',
      commitSha: SHA,
    });
    expect(result.draft.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(result.draft.preview.name).toBe('i-have-headache');
    expect(repository.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', commitSha: SHA }),
    );
  });

  it('answers a marketplace with its candidates and stores no draft', async () => {
    const { service, repository } = build({
      fetched: {
        files: [
          file('.claude-plugin/marketplace.json', {
            name: 'm',
            plugins: [{ name: 'p', source: './p' }],
          }),
        ],
        commitSha: SHA,
        ref: 'main',
      },
    });

    const result = await service.previewGithub('user-1', 'owner/repo');

    expect(result).toEqual({
      kind: 'MARKETPLACE',
      name: 'm',
      candidates: [{ name: 'p', description: '', subdir: 'p' }],
    });
    expect(repository.createDraft).not.toHaveBeenCalled();
  });

  it('previews an uploaded zip with no commit and a wrapper folder removed', async () => {
    const { service } = build();
    const entries = iHaveHeadacheLayout().map((f) => ({ name: `wrap/${f.path}`, data: f.content }));

    const result = await service.previewUpload('user-1', {
      buffer: buildZip(entries),
      originalname: 'headache.zip',
    });

    expect(result.kind).toBe('PLUGIN');
    if (result.kind !== 'PLUGIN') return;
    expect(result.draft.source).toEqual({
      kind: ImportSourceKind.UPLOAD,
      ref: 'headache.zip',
      commitSha: null,
    });
    expect(result.draft.preview.name).toBe('i-have-headache');
  });

  it('refuses a hostile upload before any draft exists', async () => {
    const { service, repository } = build();
    await expect(
      service.previewUpload('user-1', {
        buffer: buildZip([{ name: '../evil.md', data: 'x' }]),
        originalname: 'x.zip',
      }),
    ).rejects.toMatchObject({ importCode: ImportErrorCode.PATH_UNSAFE });
    expect(repository.createDraft).not.toHaveBeenCalled();
  });

  it('applies the plan gate to every entry point and stops when the plan refuses', async () => {
    const { service, planGate, github } = build();
    planGate.resolveInstallCap.mockRejectedValue(new Error('plan disabled'));

    await expect(service.previewGithub('user-1', 'o/r')).rejects.toThrow('plan disabled');
    await expect(service.confirm('user-1', 'draft-1', 'c'.repeat(64))).rejects.toThrow(
      'plan disabled',
    );
    expect(github.fetch).not.toHaveBeenCalled();
  });

  it('confirms only with the exact reviewed checksum', async () => {
    const { service, repository } = build();
    const preview = await service.previewGithub('user-1', 'owner/repo');
    if (preview.kind !== 'PLUGIN') throw new Error('expected plugin');

    await expect(service.confirm('user-1', 'draft-1', 'f'.repeat(64))).rejects.toMatchObject({
      importCode: ImportErrorCode.CHECKSUM_MISMATCH,
    });
    expect(repository.installDraft).not.toHaveBeenCalled();

    const installed = await service.confirm('user-1', 'draft-1', preview.draft.checksum);
    expect(installed).toMatchObject({
      id: 'plugin-1',
      name: 'i-have-headache',
      checksum: preview.draft.checksum,
    });
    expect(repository.installDraft).toHaveBeenCalledWith(expect.anything(), 'i-have-headache');
  });

  it('refuses a draft whose stored files no longer hash to the reviewed checksum', async () => {
    const { service, repository } = build();
    const preview = await service.previewGithub('user-1', 'owner/repo');
    if (preview.kind !== 'PLUGIN') throw new Error('expected plugin');
    const stored = await repository.findDraft();
    stored?.files.push({ path: 'skills/injected/SKILL.md', content: 'evil' });

    await expect(
      service.confirm('user-1', 'draft-1', preview.draft.checksum),
    ).rejects.toMatchObject({
      importCode: ImportErrorCode.CHECKSUM_MISMATCH,
    });
  });

  it('answers an expired or foreign draft as not found', async () => {
    const { service, repository } = build();
    repository.findDraft.mockResolvedValue(null as never);
    await expect(service.confirm('user-1', 'draft-9', 'c'.repeat(64))).rejects.toMatchObject({
      importCode: ImportErrorCode.DRAFT_NOT_FOUND,
    });
  });

  it('reports not found for another user plugin on get and remove', async () => {
    const { service, repository } = build();
    repository.findOwned.mockResolvedValue(null);
    repository.remove.mockResolvedValue(false);
    await expect(service.get('user-1', 'x')).rejects.toMatchObject({
      importCode: ImportErrorCode.NOT_FOUND,
    });
    await expect(service.remove('user-1', 'x')).rejects.toMatchObject({
      importCode: ImportErrorCode.NOT_FOUND,
    });
    expect(repository.findOwned).toHaveBeenCalledWith('x', 'user-1');
    expect(repository.remove).toHaveBeenCalledWith('x', 'user-1');
  });

  it('answers a missing upload with a stable code before touching the plan or the archive', async () => {
    const { service, planGate } = build();
    await expect(service.previewUpload('user-1', undefined)).rejects.toMatchObject({
      importCode: ImportErrorCode.UPLOAD_MISSING,
    });
    expect(planGate.resolveInstallCap).not.toHaveBeenCalled();
  });

  it.each([
    [ImportInstallOutcome.QUOTA_PLUGINS, ImportErrorCode.QUOTA_PLUGINS],
    [ImportInstallOutcome.QUOTA_BYTES, ImportErrorCode.QUOTA_BYTES],
    [ImportInstallOutcome.DUPLICATE, ImportErrorCode.DUPLICATE_PLUGIN],
  ])('turns the repository outcome %s into the error %s', async (outcome, code) => {
    const { service, repository } = build();
    const preview = await service.previewGithub('user-1', 'owner/repo');
    if (preview.kind !== 'PLUGIN') throw new Error('expected plugin');
    repository.installDraft.mockResolvedValue({ outcome } as never);

    await expect(
      service.confirm('user-1', 'draft-1', preview.draft.checksum),
    ).rejects.toMatchObject({
      importCode: code,
    });
  });
});
