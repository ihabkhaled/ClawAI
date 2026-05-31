// Slice D backend 3 — lifecycle event publisher unit tests.
//
// Verifies that FilesService and FileRetentionSweeperManager publish the
// canonical lifecycle events (FILE_UPLOAD_STARTED, FILE_UPLOAD_COMPLETED,
// FILE_DOWNLOADED, FILE_DELETED, FILE_RETENTION_EXPIRED) at the correct
// points in their flows, with the correct payload shape and metadata
// (downloadMethod, deletion reason, etc.).
//
// All filesystem, DB, and AppConfig dependencies are mocked so the publisher
// behaviour is exercised in isolation.

import { type Response } from 'express';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { FilesService } from '../files.service';
import { type FilesRepository } from '../../repositories/files.repository';
import { type FileChunksRepository } from '../../repositories/file-chunks.repository';
import { type FileSecurityManager } from '../../managers/file-security.manager';
import { FileRetentionSweeperManager } from '../../managers/file-retention-sweeper.manager';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';

jest.mock('../../../../common/utilities', () => ({
  verifyAccessToken: jest.fn(),
  saveFile: jest.fn().mockReturnValue('/data/uploads/test-file.txt'),
  deleteFile: jest.fn(),
  readFile: jest.fn().mockReturnValue(Buffer.from('test content')),
}));

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn(() => ({
      FILE_RETENTION_DAYS: 0,
      FILE_RETENTION_SWEEP_CRON: '0 2 * * *',
      FILE_RETENTION_SWEEP_BATCH_LIMIT: 5,
    })),
  },
}));

const { deleteFile: mockedDeleteFile } = jest.requireMock('../../../../common/utilities') as {
  deleteFile: jest.Mock;
};

const buildFile = (overrides: Partial<File> = {}): File =>
  ({
    id: 'file-1',
    userId: 'user-1',
    filename: 'doc.txt',
    mimeType: 'text/plain',
    sizeBytes: 1024,
    storagePath: '/data/uploads/doc.txt',
    content: null,
    ingestionStatus: FileIngestionStatus.PENDING,
    retentionExpiresAt: new Date('2026-01-01T00:00:00Z'),
    parentFileId: null,
    isExtracted: false,
    extractionMetadata: null,
    createdAt: new Date('2025-12-01T00:00:00Z'),
    updatedAt: new Date('2025-12-01T00:00:00Z'),
    ...overrides,
  }) as unknown as File;

const mockFilesRepository = (): Record<keyof FilesRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  updateIngestionStatus: jest.fn(),
  delete: jest.fn(),
  countAll: jest.fn(),
  findExpiredBefore: jest.fn(),
  deleteById: jest.fn(),
  markAsExtractedChild: jest.fn(),
  recordExtractionMetadata: jest.fn(),
});

const mockFileChunksRepository = (): Record<keyof FileChunksRepository, jest.Mock> => ({
  createMany: jest.fn(),
  findByFileId: jest.fn(),
  deleteByFileId: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockImplementation(async () => {}),
});

const mockSecurityManager = (): Pick<
  FileSecurityManager,
  'runAllChecks' | 'getSanitizedFilename'
> => ({
  runAllChecks: jest.fn().mockResolvedValue({ passed: true, checks: [] }),
  getSanitizedFilename: jest.fn().mockImplementation((name: string) => name),
});

describe('FilesService lifecycle events (Slice D backend 3)', () => {
  let service: FilesService;
  let filesRepo: ReturnType<typeof mockFilesRepository>;
  let chunksRepo: ReturnType<typeof mockFileChunksRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    jest.clearAllMocks();
    filesRepo = mockFilesRepository();
    chunksRepo = mockFileChunksRepository();
    rabbitMQ = mockRabbitMQ();
    service = new FilesService(
      filesRepo as unknown as FilesRepository,
      chunksRepo as unknown as FileChunksRepository,
      rabbitMQ as unknown as RabbitMQService,
      mockSecurityManager() as unknown as FileSecurityManager,
    );
  });

  describe('uploadFile', () => {
    it('publishes FILE_UPLOAD_STARTED exactly once at the start of the upload', async () => {
      const created = buildFile();
      filesRepo.create.mockResolvedValue(created);

      await service.uploadFile('user-1', {
        filename: 'doc.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
        content: Buffer.from('hello').toString('base64'),
      });

      // First publish call must be FILE_UPLOAD_STARTED — it fires BEFORE the row is
      // created, so its fileId is the empty-string sentinel.
      const startedCalls = rabbitMQ.publish!.mock.calls.filter(
        (call) => call[0] === EventPattern.FILE_UPLOAD_STARTED,
      );
      expect(startedCalls).toHaveLength(1);
      expect(startedCalls[0]?.[1]).toEqual(
        expect.objectContaining({
          fileId: '',
          userId: 'user-1',
          filename: 'doc.txt',
          mimeType: 'text/plain',
          sizeBytes: 1024,
          timestamp: expect.any(String),
        }),
      );
    });

    it('publishes FILE_UPLOAD_COMPLETED + (deprecated) FILE_UPLOADED on success — same payload', async () => {
      const created = buildFile({ id: 'file-xyz', userId: 'user-1' });
      filesRepo.create.mockResolvedValue(created);

      await service.uploadFile('user-1', {
        filename: 'doc.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
        content: Buffer.from('hello').toString('base64'),
      });

      const completedCalls = rabbitMQ.publish!.mock.calls.filter(
        (call) => call[0] === EventPattern.FILE_UPLOAD_COMPLETED,
      );
      const legacyCalls = rabbitMQ.publish!.mock.calls.filter(
        (call) => call[0] === EventPattern.FILE_UPLOADED,
      );

      expect(completedCalls).toHaveLength(1);
      expect(legacyCalls).toHaveLength(1);

      // Both payload shapes must be the FileUploadCompletedPayload (alias of legacy FileUploadedPayload).
      const expectedShape = expect.objectContaining({
        fileId: 'file-xyz',
        userId: 'user-1',
        fileName: 'doc.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
        threadId: '',
        timestamp: expect.any(String),
      });
      expect(completedCalls[0]?.[1]).toEqual(expectedShape);
      expect(legacyCalls[0]?.[1]).toEqual(expectedShape);
    });

    it('publishes FILE_UPLOAD_STARTED before FILE_UPLOAD_COMPLETED in publish order', async () => {
      const created = buildFile({ id: 'file-order' });
      filesRepo.create.mockResolvedValue(created);

      await service.uploadFile('user-1', {
        filename: 'doc.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
        content: Buffer.from('hello').toString('base64'),
      });

      const patterns = rabbitMQ.publish!.mock.calls.map((call) => call[0]);
      const startedIdx = patterns.indexOf(EventPattern.FILE_UPLOAD_STARTED);
      const completedIdx = patterns.indexOf(EventPattern.FILE_UPLOAD_COMPLETED);
      expect(startedIdx).toBeGreaterThanOrEqual(0);
      expect(completedIdx).toBeGreaterThan(startedIdx);
    });
  });

  describe('downloadFile', () => {
    const buildResponse = (): Response => {
      const res: Partial<Response> = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };
      return res as Response;
    };

    it('publishes FILE_DOWNLOADED with downloadMethod=BROWSER and the authenticated userId', async () => {
      const file = buildFile({ id: 'file-dl', userId: 'user-1' });
      filesRepo.findById.mockResolvedValue(file);

      await service.downloadFile('file-dl', 'user-1', buildResponse());

      const calls = rabbitMQ.publish!.mock.calls.filter(
        (call) => call[0] === EventPattern.FILE_DOWNLOADED,
      );
      expect(calls).toHaveLength(1);
      expect(calls[0]?.[1]).toEqual(
        expect.objectContaining({
          fileId: 'file-dl',
          userId: 'user-1',
          downloadedBy: 'user-1',
          downloadMethod: 'BROWSER',
          timestamp: expect.any(String),
        }),
      );
    });

    it('publishes FILE_DOWNLOADED with downloadMethod=INTERNAL_API for the public route', async () => {
      const file = buildFile({ id: 'file-internal', userId: 'user-2' });
      filesRepo.findById.mockResolvedValue(file);

      await service.downloadFilePublic('file-internal', buildResponse());

      const calls = rabbitMQ.publish!.mock.calls.filter(
        (call) => call[0] === EventPattern.FILE_DOWNLOADED,
      );
      expect(calls).toHaveLength(1);
      expect(calls[0]?.[1]).toEqual(
        expect.objectContaining({
          fileId: 'file-internal',
          userId: 'user-2',
          downloadedBy: 'system',
          downloadMethod: 'INTERNAL_API',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('deleteFile (user-driven)', () => {
    it("publishes FILE_DELETED with reason='USER' and deletedBy=authenticated userId", async () => {
      const file = buildFile({ id: 'file-del', userId: 'user-1', filename: 'gone.txt' });
      filesRepo.findById.mockResolvedValue(file);
      filesRepo.delete.mockResolvedValue(file);
      chunksRepo.deleteByFileId.mockResolvedValue(0);

      await service.deleteFile('file-del', 'user-1');

      const calls = rabbitMQ.publish!.mock.calls.filter(
        (call) => call[0] === EventPattern.FILE_DELETED,
      );
      expect(calls).toHaveLength(1);
      expect(calls[0]?.[1]).toEqual(
        expect.objectContaining({
          fileId: 'file-del',
          userId: 'user-1',
          filename: 'gone.txt',
          deletedBy: 'user-1',
          reason: 'USER',
          timestamp: expect.any(String),
        }),
      );
    });
  });
});

// ============================================================================
// FileRetentionSweeperManager — retention sweep must publish BOTH
// FILE_RETENTION_EXPIRED (legacy/specific) AND FILE_DELETED (reason='RETENTION')
// per reaped file so the audit-side handler covers every delete path once.
// ============================================================================

describe('FileRetentionSweeperManager retention sweep events (Slice D backend 3)', () => {
  let manager: FileRetentionSweeperManager;
  let filesRepo: ReturnType<typeof mockFilesRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    jest.clearAllMocks();
    filesRepo = mockFilesRepository();
    rabbitMQ = mockRabbitMQ();
    manager = new FileRetentionSweeperManager(
      filesRepo as unknown as FilesRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  it('publishes FILE_RETENTION_EXPIRED AND FILE_DELETED (reason=RETENTION) for each reaped file', async () => {
    const f = buildFile({
      id: 'expired-1',
      userId: 'user-7',
      filename: 'old.txt',
      storagePath: '/data/uploads/old.txt',
      sizeBytes: 2048,
      retentionExpiresAt: new Date('2025-01-01T00:00:00Z'),
    });
    filesRepo.findExpiredBefore.mockResolvedValue([f]);

    await manager.runSweep();

    // Disk + DB delete happened first.
    expect(mockedDeleteFile).toHaveBeenCalledWith('/data/uploads/old.txt');
    expect(filesRepo.deleteById).toHaveBeenCalledWith('expired-1');

    // BOTH events published — 2 events per reaped file.
    const retentionCalls = rabbitMQ.publish!.mock.calls.filter(
      (call) => call[0] === EventPattern.FILE_RETENTION_EXPIRED,
    );
    const deletedCalls = rabbitMQ.publish!.mock.calls.filter(
      (call) => call[0] === EventPattern.FILE_DELETED,
    );

    expect(retentionCalls).toHaveLength(1);
    expect(retentionCalls[0]?.[1]).toEqual(
      expect.objectContaining({
        fileId: 'expired-1',
        userId: 'user-7',
        filename: 'old.txt',
        sizeBytes: 2048,
        retentionExpiresAt: expect.any(String),
        timestamp: expect.any(String),
      }),
    );

    expect(deletedCalls).toHaveLength(1);
    expect(deletedCalls[0]?.[1]).toEqual(
      expect.objectContaining({
        fileId: 'expired-1',
        userId: 'user-7',
        filename: 'old.txt',
        deletedBy: 'system',
        reason: 'RETENTION',
        timestamp: expect.any(String),
      }),
    );
  });
});
