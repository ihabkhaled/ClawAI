import { type Mock, vi } from 'vitest';
// Batch A2 — the upload path decides what an archive IS from its bytes.
//
// FileSecurityManager and the magic-byte check are REAL here; only storage, the
// database, the broker and ClamAV (disabled in config) are stubbed. So these
// tests prove the two halves of the octet-stream loophole end to end through
// FilesService:
// - an archive sent as application/octet-stream (or a wrong text MIME) is
//   stored under its real archive MIME and handed to processing, which routes
//   it to archive expansion;
// - a declared archive MIME the bytes contradict is rejected, as before.

import * as zlib from 'node:zlib';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { FilesService } from '../files.service';
import { FileSecurityManager } from '../../managers/file-security.manager';
import { ClamavClient } from '../../../../infrastructure/clamav/clamav.client';
import { type FilesRepository } from '../../repositories/files.repository';
import { type FileChunksRepository } from '../../repositories/file-chunks.repository';
import { type FileProcessingContract } from '../../types/zip-expansion.types';
import { BusinessException } from '../../../../common/errors';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import {
  buildRar5,
  buildTar,
  buildWithSevenZip,
} from '../../../../common/utilities/__tests__/__fixtures__/archive-fixtures';

vi.mock('../../../../common/utilities', () => ({
  saveFile: vi.fn().mockReturnValue('/data/uploads/stored.bin'),
  deleteFile: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn(() => ({ FILE_RETENTION_DAYS: 0, CLAMAV_ENABLED: false })) },
}));

const storedRow = (data: Partial<File>): File => ({
  id: 'file-1',
  userId: 'user-1',
  filename: 'upload.bin',
  mimeType: 'application/octet-stream',
  sizeBytes: 1,
  storagePath: '/data/uploads/stored.bin',
  content: null,
  extractedText: null,
  extractionError: null,
  ingestionStatus: FileIngestionStatus.PENDING,
  retentionExpiresAt: null,
  parentFileId: null,
  isExtracted: false,
  archivePath: null,
  extractionMetadata: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...data,
});

describe('FilesService archive uploads (magic-byte routing)', () => {
  let service: FilesService;
  let create: Mock;
  let processFile: Mock;

  const upload = (filename: string, mimeType: string, bytes: Buffer): Promise<File> =>
    service.uploadFile('user-1', {
      filename,
      mimeType,
      sizeBytes: bytes.length,
      content: bytes.toString('base64'),
    });

  beforeEach(() => {
    create = vi.fn(async (data: Partial<File>) => storedRow(data));
    processFile = vi.fn().mockResolvedValue(undefined);
    const filesRepository: Pick<FilesRepository, 'create'> = { create };
    const processing: FileProcessingContract = {
      processFile,
      requestVideoProcessing: vi.fn().mockResolvedValue(undefined),
      updateIngestionStatus: vi.fn().mockResolvedValue(undefined),
    };
    const rabbitMQ: Pick<RabbitMQService, 'publish'> = { publish: vi.fn() };
    service = new FilesService(
      filesRepository as FilesRepository,
      {} as FileChunksRepository,
      rabbitMQ as RabbitMQService,
      new FileSecurityManager(new ClamavClient()),
      {
        init: vi.fn(),
        receiveChunk: vi.fn(),
        getStatus: vi.fn(),
        reassemble: vi.fn(),
        cleanup: vi.fn(),
      } as never,
      processing,
    );
  });

  it('stores an octet-stream 7z as application/x-7z-compressed and sends it to processing', async () => {
    const bytes = await buildWithSevenZip('7z', { 'notes.txt': 'seven zip notes' });

    await upload('notes.7z', 'application/octet-stream', bytes);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'application/x-7z-compressed' }),
    );
    expect(processFile).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'application/x-7z-compressed' }),
    );
  });

  it.each([
    ['rar', buildRar5([{ name: 'a.txt', data: 'rar text' }]), 'application/vnd.rar'],
    ['tar', buildTar([{ name: 'a.txt', data: 'tar text' }]), 'application/x-tar'],
    ['tar.gz', zlib.gzipSync(buildTar([{ name: 'a.txt', data: 'x' }])), 'application/gzip'],
  ])('re-labels an octet-stream %s by its bytes', async (_label, bytes, expected) => {
    await upload('upload.bin', 'application/octet-stream', bytes);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mimeType: expected }));
  });

  it('re-labels an archive sent under a wrong text MIME', async () => {
    await upload('logs.txt.gz', 'text/plain', zlib.gzipSync('line one\n'));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'application/gzip' }));
  });

  it('leaves real octet-stream bytes alone', async () => {
    await upload('blob.bin', 'application/octet-stream', Buffer.from('just some text'));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'application/octet-stream' }),
    );
  });

  it.each([
    ['application/x-7z-compressed', Buffer.from('%PDF-1.7 not an archive')],
    ['application/vnd.rar', zlib.gzipSync('gzip, not rar')],
    ['application/gzip', Buffer.from('plain text')],
    ['application/x-zip-compressed', Buffer.from('plain text, not PK')],
  ])('rejects a declared %s whose bytes are something else', async (mimeType, bytes) => {
    const attempt = upload('upload.bin', mimeType, bytes);

    await expect(attempt).rejects.toBeInstanceOf(BusinessException);
    await expect(attempt).rejects.toMatchObject({ code: 'FILE_SECURITY_CHECK_FAILED' });
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts a declared archive MIME whose bytes agree', async () => {
    const bytes = await buildWithSevenZip('xz', { 'data.csv': 'a,b\n1,2\n' });

    await upload('data.csv.xz', 'application/x-xz', bytes);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'application/x-xz' }));
  });

  it('routes a service-to-service octet-stream archive the same way', async () => {
    const bytes = zlib.gzipSync(buildTar([{ name: 'mail.txt', data: 'attachment body' }]));

    await service.createInternalFile({
      userId: 'user-1',
      filename: 'attachment.tgz',
      mimeType: 'application/octet-stream',
      contentBase64: bytes.toString('base64'),
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'application/gzip' }));
  });
});
