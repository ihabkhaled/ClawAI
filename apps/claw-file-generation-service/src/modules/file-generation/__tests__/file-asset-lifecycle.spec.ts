import { Readable } from 'node:stream';

import { vi } from 'vitest';

import { FileGenerationService } from '../services/file-generation.service';
import {
  fileAssetDownloadPath,
  isAssetExpired,
  safeDownloadFilename,
  toGenerationView,
} from '../utilities/file-asset.utility';

vi.mock('../managers/file-execution.manager');

const NOW = new Date('2026-09-19T12:00:00.000Z');
const HOUR = 3_600_000;

const generation = (overrides: Record<string, unknown> = {}) => ({
  id: 'gen-1',
  userId: 'owner',
  content: '# Report\n\nBody',
  format: 'PDF',
  filename: 'Quarterly Report',
  status: 'COMPLETED',
  createdAt: NOW,
  assets: [],
  ...overrides,
});

const asset = (overrides: Record<string, unknown> = {}) => ({
  id: 'asset-1',
  generationId: 'gen-1',
  storageKey: 'file-service-id-123',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  expiresAt: new Date(NOW.getTime() + HOUR),
  expiredAt: null,
  ...overrides,
});

function build(repoOverrides: Record<string, unknown> = {}) {
  const repo = {
    findById: vi.fn().mockResolvedValue(generation()),
    findAsset: vi.fn().mockResolvedValue(asset()),
    findExpiredAssets: vi.fn().mockResolvedValue([]),
    markAssetExpired: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(generation()),
    createEvent: vi.fn(),
    createAsset: vi.fn().mockResolvedValue(asset()),
    setAssetUrls: vi.fn().mockResolvedValue(asset()),
    ...repoOverrides,
  };
  const exec = {
    openStoredFile: vi.fn().mockResolvedValue(Readable.from(['%PDF'])),
    deleteStoredFile: vi.fn().mockResolvedValue(undefined),
    convert: vi.fn().mockResolvedValue(Buffer.from('%PDF')),
    storeFile: vi.fn().mockResolvedValue('file-2'),
    generateFilename: vi.fn().mockReturnValue('generated.pdf'),
  };
  const service = new FileGenerationService(
    repo as never,
    exec as never,
    { publish: vi.fn() } as never,
    { publish: vi.fn().mockResolvedValue(undefined) } as never,
  );
  return { service, repo, exec };
}

describe('file asset utilities', () => {
  it('builds a download path that names the asset, never the stored file', () => {
    expect(fileAssetDownloadPath('gen-1', 'asset-1')).toBe(
      '/api/v1/file-generations/gen-1/assets/asset-1/download',
    );
  });

  // Content-Disposition is built from this: no quotes, newlines, slashes or
  // a model-chosen extension may survive.
  it.each([
    ['Quarterly Report', 'pdf', 'Quarterly Report.pdf'],
    ['report.exe', 'pdf', 'report.pdf'],
    ['../../etc/passwd', 'txt', 'etc-passwd.txt'],
    ['a"; filename="evil.sh', 'md', 'a- filename-evil.md'],
    ['line\r\nSet-Cookie: x=1', 'csv', 'line-Set-Cookie- x-1.csv'],
    ['', 'docx', 'claw-file.docx'],
    [null, 'json', 'claw-file.json'],
    ['تقرير', 'pdf', 'claw-file.pdf'],
  ])('safe filename: %s -> %s', (requested, extension, expected) => {
    expect(safeDownloadFilename(requested, extension)).toBe(expected);
  });

  it('caps a very long name', () => {
    expect(safeDownloadFilename('x'.repeat(500), 'pdf').length).toBeLessThanOrEqual(124);
  });

  it('treats an asset past its hour, or already swept, as expired', () => {
    expect(isAssetExpired(asset(), NOW)).toBe(false);
    expect(isAssetExpired(asset({ expiresAt: new Date(NOW.getTime() - 1) }), NOW)).toBe(true);
    expect(isAssetExpired(asset({ expiredAt: NOW }), NOW)).toBe(true);
    expect(isAssetExpired(asset({ expiresAt: null }), NOW)).toBe(false);
  });
});

describe('FileGenerationService asset lifecycle', () => {
  it("streams the owner's file with a safe name, from the stored id it never exposes", async () => {
    const { service, exec } = build();

    const file = await service.openAssetForUser('gen-1', 'asset-1', 'owner', NOW);

    expect(exec.openStoredFile).toHaveBeenCalledWith('file-service-id-123');
    expect(file).toMatchObject({ mimeType: 'application/pdf', filename: 'Quarterly Report.pdf' });
  });

  it("refuses another user's file before touching storage", async () => {
    const { service, exec } = build();

    await expect(service.openAssetForUser('gen-1', 'asset-1', 'stranger', NOW)).rejects.toThrow();
    expect(exec.openStoredFile).not.toHaveBeenCalled();
  });

  it('answers 410 FILE_EXPIRED for a file past its hour', async () => {
    const { service } = build({
      findAsset: vi.fn().mockResolvedValue(asset({ expiresAt: new Date(NOW.getTime() - 1) })),
    });

    await expect(service.openAssetForUser('gen-1', 'asset-1', 'owner', NOW)).rejects.toMatchObject({
      code: 'FILE_EXPIRED',
      status: 410,
    });
  });

  it('refuses an asset id that belongs to another generation', async () => {
    const { service } = build({ findAsset: vi.fn().mockResolvedValue(null) });

    await expect(service.openAssetForUser('gen-1', 'asset-x', 'owner', NOW)).rejects.toMatchObject({
      code: 'FILE_ASSET_NOT_FOUND',
    });
  });

  it('rebuilds from the saved text for the owner only', async () => {
    const { service, repo } = build();

    await service.rebuildForUser('gen-1', 'owner');
    expect(repo.updateStatus).toHaveBeenCalledWith('gen-1', 'QUEUED', expect.anything());

    await expect(service.rebuildForUser('gen-1', 'stranger')).rejects.toThrow();
  });

  it('refuses to rebuild a file that has no saved text', async () => {
    const { service } = build({ findById: vi.fn().mockResolvedValue(generation({ content: '' })) });

    await expect(service.rebuildForUser('gen-1', 'owner')).rejects.toMatchObject({
      code: 'FILE_CONTENT_UNAVAILABLE',
      status: 409,
    });
  });

  it('sweeps expired bytes as their owner and keeps going past a failure', async () => {
    const { service, repo, exec } = build({
      findExpiredAssets: vi
        .fn()
        .mockResolvedValue([asset({ id: 'a1' }), asset({ id: 'a2', storageKey: 'broken' })]),
    });
    exec.deleteStoredFile.mockImplementation(async (key: string) =>
      key === 'broken' ? Promise.reject(new Error('down')) : Promise.resolve(),
    );

    await expect(service.sweepExpiredAssets(NOW)).resolves.toBe(1);
    expect(exec.deleteStoredFile).toHaveBeenCalledWith('file-service-id-123', 'owner');
    expect(repo.markAssetExpired).toHaveBeenCalledWith('a1', NOW);
    expect(repo.markAssetExpired).not.toHaveBeenCalledWith('a2', NOW);
  });
});

describe('toGenerationView', () => {
  // The user sees an asset path, never the file-service id behind it.
  it('drops every storage key from what a user is sent', () => {
    const view = toGenerationView(
      generation({ assets: [asset(), asset({ id: 'asset-2', storageKey: 'fs-2' })] }) as never,
    );
    expect(JSON.stringify(view)).not.toContain('file-service-id-123');
    expect(JSON.stringify(view)).not.toContain('fs-2');
    expect(view.assets).toHaveLength(2);
  });
});
