// Slice C backend 2 — ZIP expansion manager unit tests.
//
// Mocks every collaborator so the manager runs without any real filesystem,
// database, ClamAV, or RabbitMQ. Verifies the three core flows:
//   - happy path: 2 inner files → 2 child rows + FILE_ARCHIVE_EXPANDED
//   - validation failure: ZIP_BOMB_RATIO → 0 child rows + FILE_FAILED + parent FAILED
//   - partial success: one inner file fails ClamAV → that single child rejected,
//     others extracted, FILE_ARCHIVE_EXPANDED still fires with the reduced count

import * as os from 'node:os';
import { HttpStatus } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { ZipExpansionManager } from '../zip-expansion.manager';
import { type FileSecurityManager } from '../file-security.manager';
import { type FileProcessingManager } from '../file-processing.manager';
import { type FilesRepository } from '../../repositories/files.repository';
import { type FileChunksRepository } from '../../repositories/file-chunks.repository';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import { BusinessException } from '../../../../common/errors/business.exception';
import { validateAndExtractZip } from '../../../../common/utilities/zip-extraction.utility';
import type { ExtractedEntry, ZipExtractionResult } from '../../types/zip-expansion.types';

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn(() => ({
      ZIP_MAX_EXTRACTED_SIZE_MB: 500,
      ZIP_MAX_ENTRY_COUNT: 10_000,
      ZIP_MAX_NESTING_DEPTH: 5,
      ZIP_COMPRESSION_RATIO_THRESHOLD: 1000,
      ZIP_TEMP_EXTRACTION_PATH: os.tmpdir(),
    })),
  },
}));

jest.mock('../../../../common/utilities/zip-extraction.utility', () => ({
  validateAndExtractZip: jest.fn(),
}));

jest.mock('node:fs', () => {
  const actual = jest.requireActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: jest.fn(() => Buffer.from('extracted-content')),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
  };
});

const mockedValidateAndExtractZip = validateAndExtractZip as jest.MockedFunction<
  typeof validateAndExtractZip
>;

const buildParent = (overrides: Partial<File> = {}): File =>
  ({
    id: 'parent-file-id',
    userId: 'user-1',
    filename: 'archive.zip',
    mimeType: 'application/zip',
    sizeBytes: 1024,
    storagePath: '/data/uploads/archive.zip',
    content: null,
    ingestionStatus: FileIngestionStatus.PENDING,
    retentionExpiresAt: null,
    parentFileId: null,
    isExtracted: false,
    extractionMetadata: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as unknown as File;

const buildChild = (id: string, name: string, parentId: string): File =>
  ({
    id,
    userId: 'user-1',
    filename: name,
    mimeType: 'text/plain',
    sizeBytes: 42,
    storagePath: `/tmp/extract/${name}`,
    content: null,
    ingestionStatus: FileIngestionStatus.PENDING,
    retentionExpiresAt: null,
    parentFileId: parentId,
    isExtracted: true,
    extractionMetadata: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }) as unknown as File;

// jest.fn() awaits to undefined by default, matching Promise<void> returns.
// Using .mockResolvedValue(undefined) trips unicorn/no-useless-undefined,
// using .mockResolvedValue() trips tsgo's strict arity check — so we use
// plain jest.fn() for Promise<void> mocks.
const mockFilesRepository = (): Partial<Record<keyof FilesRepository, jest.Mock>> => ({
  create: jest.fn(),
  markAsExtractedChild: jest.fn(),
  recordExtractionMetadata: jest.fn(),
});

const mockFileChunksRepository = (): Partial<Record<keyof FileChunksRepository, jest.Mock>> => ({
  deleteByFileId: jest.fn().mockResolvedValue(0),
});

const mockFileSecurityManager = (): Partial<Record<keyof FileSecurityManager, jest.Mock>> => ({
  runAllChecks: jest.fn().mockResolvedValue({ passed: true, checks: [] }),
});

const mockFileProcessingManager = (): Partial<Record<keyof FileProcessingManager, jest.Mock>> => ({
  processFile: jest.fn(),
  updateIngestionStatus: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn(),
});

describe('ZipExpansionManager', () => {
  let manager: ZipExpansionManager;
  let security: ReturnType<typeof mockFileSecurityManager>;
  let filesRepo: ReturnType<typeof mockFilesRepository>;
  let chunksRepo: ReturnType<typeof mockFileChunksRepository>;
  let processing: ReturnType<typeof mockFileProcessingManager>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    jest.clearAllMocks();
    security = mockFileSecurityManager();
    filesRepo = mockFilesRepository();
    chunksRepo = mockFileChunksRepository();
    processing = mockFileProcessingManager();
    rabbitMQ = mockRabbitMQ();
    manager = new ZipExpansionManager(
      security as unknown as FileSecurityManager,
      filesRepo as unknown as FilesRepository,
      chunksRepo as unknown as FileChunksRepository,
      processing as unknown as FileProcessingManager,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe('expandArchive (happy path)', () => {
    it('creates a child file for each inner entry, chunks them, and publishes FILE_ARCHIVE_EXPANDED', async () => {
      const parent = buildParent();
      const entries: ExtractedEntry[] = [
        { path: '/tmp/extract/a.txt', sizeBytes: 11, mimeType: 'text/plain' },
        { path: '/tmp/extract/b.txt', sizeBytes: 12, mimeType: 'text/plain' },
      ];
      const result: ZipExtractionResult = { entries, totalExtractedBytes: 23 };
      mockedValidateAndExtractZip.mockResolvedValue(result);

      const child1 = buildChild('child-1', 'a.txt', parent.id);
      const child2 = buildChild('child-2', 'b.txt', parent.id);
      filesRepo.create!.mockResolvedValueOnce(child1).mockResolvedValueOnce(child2);

      await manager.expandArchive(parent);

      expect(chunksRepo.deleteByFileId).toHaveBeenCalledWith(parent.id);
      expect(processing.updateIngestionStatus).toHaveBeenCalledWith(
        parent.id,
        FileIngestionStatus.PROCESSING,
      );
      expect(filesRepo.create).toHaveBeenCalledTimes(2);
      expect(filesRepo.create).toHaveBeenNthCalledWith(1, {
        userId: parent.userId,
        filename: 'a.txt',
        mimeType: 'text/plain',
        sizeBytes: 11,
        storagePath: '/tmp/extract/a.txt',
      });
      expect(filesRepo.create).toHaveBeenNthCalledWith(2, {
        userId: parent.userId,
        filename: 'b.txt',
        mimeType: 'text/plain',
        sizeBytes: 12,
        storagePath: '/tmp/extract/b.txt',
      });
      expect(filesRepo.markAsExtractedChild).toHaveBeenCalledWith('child-1', parent.id);
      expect(filesRepo.markAsExtractedChild).toHaveBeenCalledWith('child-2', parent.id);
      expect(processing.processFile).toHaveBeenCalledTimes(2);

      expect(filesRepo.recordExtractionMetadata).toHaveBeenCalledWith(
        parent.id,
        expect.objectContaining({
          childFileCount: 2,
          totalExtractedBytes: 23,
          expandedAt: expect.any(String),
        }),
      );
      expect(processing.updateIngestionStatus).toHaveBeenCalledWith(
        parent.id,
        FileIngestionStatus.COMPLETED,
      );

      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.FILE_ARCHIVE_EXPANDED,
        expect.objectContaining({
          parentFileId: parent.id,
          userId: parent.userId,
          parentFilename: parent.filename,
          childFileCount: 2,
          totalExtractedBytes: 23,
        }),
      );
    });
  });

  describe('expandArchive (validation failure)', () => {
    it('emits FILE_FAILED and marks the parent FAILED when validateAndExtractZip throws ZIP_BOMB_RATIO', async () => {
      const parent = buildParent();
      mockedValidateAndExtractZip.mockRejectedValue(
        new BusinessException(
          'Archive entry has suspicious compression ratio 5000:1',
          'ZIP_BOMB_RATIO',
          HttpStatus.BAD_REQUEST,
        ),
      );

      await manager.expandArchive(parent);

      expect(filesRepo.create).not.toHaveBeenCalled();
      expect(filesRepo.markAsExtractedChild).not.toHaveBeenCalled();
      expect(filesRepo.recordExtractionMetadata).not.toHaveBeenCalled();
      expect(processing.processFile).not.toHaveBeenCalled();

      expect(processing.updateIngestionStatus).toHaveBeenCalledWith(
        parent.id,
        FileIngestionStatus.FAILED,
      );

      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.FILE_FAILED,
        expect.objectContaining({
          fileId: parent.id,
          userId: parent.userId,
          filename: parent.filename,
          errorMessage: expect.stringContaining('ZIP_BOMB_RATIO'),
          failureStage: 'EXTRACTION',
        }),
      );
      expect(rabbitMQ.publish).not.toHaveBeenCalledWith(
        EventPattern.FILE_ARCHIVE_EXPANDED,
        expect.anything(),
      );
    });
  });

  describe('expandArchive (partial success — one inner file fails ClamAV)', () => {
    it('skips the failed entry, onboards the rest, and reports the reduced childFileCount', async () => {
      const parent = buildParent();
      const entries: ExtractedEntry[] = [
        { path: '/tmp/extract/clean1.txt', sizeBytes: 10, mimeType: 'text/plain' },
        { path: '/tmp/extract/infected.txt', sizeBytes: 20, mimeType: 'text/plain' },
        { path: '/tmp/extract/clean2.txt', sizeBytes: 30, mimeType: 'text/plain' },
      ];
      mockedValidateAndExtractZip.mockResolvedValue({
        entries,
        totalExtractedBytes: 60,
      });

      // First entry: clean → second: infected (ClamAV REJECTS) → third: clean
      security
        .runAllChecks!.mockResolvedValueOnce({ passed: true, checks: [] })
        .mockResolvedValueOnce({
          passed: false,
          checks: [{ name: 'antivirus_scan', passed: false, reason: 'EICAR-test' }],
        })
        .mockResolvedValueOnce({ passed: true, checks: [] });

      filesRepo
        .create!.mockResolvedValueOnce(buildChild('child-1', 'clean1.txt', parent.id))
        .mockResolvedValueOnce(buildChild('child-3', 'clean2.txt', parent.id));

      await manager.expandArchive(parent);

      // Three security checks ran (one per extracted entry).
      expect(security.runAllChecks).toHaveBeenCalledTimes(3);

      // Only the two clean entries became child rows; the infected one was
      // skipped — no create() call, no markAsExtractedChild(), no processFile().
      expect(filesRepo.create).toHaveBeenCalledTimes(2);
      expect(filesRepo.markAsExtractedChild).toHaveBeenCalledTimes(2);
      expect(processing.processFile).toHaveBeenCalledTimes(2);
      const createCalls = (filesRepo.create as jest.Mock).mock.calls.map(
        (c) => (c[0] as { filename: string }).filename,
      );
      expect(createCalls).toEqual(['clean1.txt', 'clean2.txt']);

      // FILE_ARCHIVE_EXPANDED still fires — childFileCount reflects the
      // partial success (2, not 3).
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.FILE_ARCHIVE_EXPANDED,
        expect.objectContaining({
          parentFileId: parent.id,
          childFileCount: 2,
          totalExtractedBytes: 60,
        }),
      );
      expect(processing.updateIngestionStatus).toHaveBeenCalledWith(
        parent.id,
        FileIngestionStatus.COMPLETED,
      );
    });
  });
});
