// The defect this file exists to prevent from returning:
//
// FileProcessingManager was complete and correct, and nothing on the upload path
// ever called it. Every attachment reached the models as base64, and every model
// replied that it could not read the file. These tests assert the wiring, the
// truthfulness of the served payload, and the lazy repair of rows that predate
// the pipeline.

import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { FilesService } from '../files.service';
import { type FilesRepository } from '../../repositories/files.repository';
import { type FileChunksRepository } from '../../repositories/file-chunks.repository';
import { type FileSecurityManager } from '../../managers/file-security.manager';
import { type FileProcessingContract } from '../../types/zip-expansion.types';
import { type File } from '../../../../generated/prisma';

jest.mock('../../../../common/utilities', () => ({
  verifyAccessToken: jest.fn(),
  saveFile: jest.fn().mockReturnValue('/data/files/stored'),
  deleteFile: jest.fn(),
  readFile: jest.fn().mockReturnValue(Buffer.from('bytes')),
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

const PDF_MIME = 'application/pdf';
const USER_ID = 'user-1';

const buildFile = (overrides: Partial<File> = {}): File =>
  ({
    id: 'file-1',
    userId: USER_ID,
    filename: 'resume.pdf',
    mimeType: PDF_MIME,
    sizeBytes: 2035,
    storagePath: '/data/files/resume.pdf',
    content: 'JVBERi0xLjM=',
    extractedText: null,
    extractionError: null,
    ingestionStatus: 'PENDING',
    retentionExpiresAt: null,
    parentFileId: null,
    isExtracted: false,
    extractionMetadata: null,
    createdAt: new Date('2026-09-12T00:00:00Z'),
    updatedAt: new Date('2026-09-12T00:00:00Z'),
    ...overrides,
  }) as unknown as File;

describe('FilesService extraction wiring', () => {
  let service: FilesService;
  let filesRepo: Record<string, jest.Mock>;
  let processing: FileProcessingContract;

  beforeEach(() => {
    jest.clearAllMocks();
    filesRepo = {
      create: jest.fn().mockResolvedValue(buildFile()),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateIngestionStatus: jest.fn(),
      saveExtractionResult: jest.fn(),
      delete: jest.fn(),
      countAll: jest.fn(),
      findExpiredBefore: jest.fn(),
      findStaleProcessingBefore: jest.fn(),
      deleteById: jest.fn(),
      markAsExtractedChild: jest.fn(),
      recordExtractionMetadata: jest.fn(),
    };
    processing = {
      processFile: jest.fn().mockResolvedValue(void 0),
      updateIngestionStatus: jest.fn().mockResolvedValue(void 0),
    };
    const security = {
      runAllChecks: jest.fn().mockResolvedValue({ passed: true, checks: [] }),
      getSanitizedFilename: jest.fn().mockImplementation((name: string) => name),
    };
    service = new FilesService(
      filesRepo as unknown as FilesRepository,
      {
        createMany: jest.fn(),
        findByFileId: jest.fn(),
        deleteByFileId: jest.fn(),
      } as unknown as FileChunksRepository,
      { publish: jest.fn().mockResolvedValue(void 0) } as unknown as RabbitMQService,
      security as unknown as FileSecurityManager,
      processing,
    );
  });

  describe('uploadFile', () => {
    it('starts extraction for the uploaded file', async () => {
      await service.uploadFile(USER_ID, {
        filename: 'resume.pdf',
        mimeType: PDF_MIME,
        sizeBytes: 5,
        content: Buffer.from('bytes').toString('base64'),
      });

      expect(processing.processFile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'file-1' }),
      );
    });

    it('returns without waiting for extraction to finish', async () => {
      let release = (): void => {};
      (processing.processFile as jest.Mock).mockReturnValue(
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      );

      await expect(
        service.uploadFile(USER_ID, {
          filename: 'resume.pdf',
          mimeType: PDF_MIME,
          sizeBytes: 5,
          content: Buffer.from('bytes').toString('base64'),
        }),
      ).resolves.toBeDefined();

      release();
    });

    it('does not reject the upload when extraction throws', async () => {
      (processing.processFile as jest.Mock).mockRejectedValue(new Error('tesseract exploded'));

      await expect(
        service.uploadFile(USER_ID, {
          filename: 'resume.pdf',
          mimeType: PDF_MIME,
          sizeBytes: 5,
          content: Buffer.from('bytes').toString('base64'),
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('createInternalFile', () => {
    it('starts extraction for a service-to-service upload too', async () => {
      await service.createInternalFile({
        userId: USER_ID,
        filename: 'resume.pdf',
        mimeType: PDF_MIME,
        contentBase64: Buffer.from('bytes').toString('base64'),
      });

      expect(processing.processFile).toHaveBeenCalled();
    });
  });

  describe('getFileContent', () => {
    it('serves the extracted text alongside the original bytes', async () => {
      filesRepo['findById']?.mockResolvedValue(
        buildFile({ ingestionStatus: 'COMPLETED', extractedText: 'Ihab Khaled — Senior Engineer' }),
      );

      const result = await service.getFileContent('file-1', USER_ID);

      expect(result.extractedText).toBe('Ihab Khaled — Senior Engineer');
      expect(result.content).toBe('JVBERi0xLjM=');
    });

    it('reports the failure reason so the caller can say what went wrong', async () => {
      filesRepo['findById']?.mockResolvedValue(
        buildFile({ ingestionStatus: 'FAILED', extractionError: 'PDF is password protected' }),
      );

      const result = await service.getFileContent('file-1', USER_ID);

      expect(result.ingestionStatus).toBe('FAILED');
      expect(result.extractionError).toBe('PDF is password protected');
    });

    it('refuses to serve a file owned by another user', async () => {
      filesRepo['findById']?.mockResolvedValue(buildFile({ userId: 'someone-else' }));

      await expect(service.getFileContent('file-1', USER_ID)).rejects.toThrow();
    });
  });

  // Rows uploaded before the pipeline was wired sit at COMPLETED with no text,
  // because the old schema default lied. They are repaired one at a time on use
  // rather than by a migration, which would have left the whole table PENDING
  // forever and kept the file-list poller running against a 4.2 MB endpoint.
  describe('legacy rows', () => {
    it('re-extracts a document row that claims COMPLETED but holds no text', async () => {
      filesRepo['findById']?.mockResolvedValue(
        buildFile({ ingestionStatus: 'COMPLETED', extractedText: null }),
      );

      const result = await service.getFileContent('file-1', USER_ID);

      expect(processing.processFile).toHaveBeenCalled();
      expect(result.ingestionStatus).toBe('PROCESSING');
    });

    it('leaves a text file alone, because its bytes were always readable', async () => {
      filesRepo['findById']?.mockResolvedValue(
        buildFile({ mimeType: 'text/plain', ingestionStatus: 'COMPLETED', extractedText: null }),
      );

      const result = await service.getFileContent('file-1', USER_ID);

      expect(processing.processFile).not.toHaveBeenCalled();
      expect(result.ingestionStatus).toBe('COMPLETED');
    });

    it('does not re-extract a row that already has text', async () => {
      filesRepo['findById']?.mockResolvedValue(
        buildFile({ ingestionStatus: 'COMPLETED', extractedText: 'already done' }),
      );

      await service.getFileContent('file-1', USER_ID);

      expect(processing.processFile).not.toHaveBeenCalled();
    });

    it('does not re-extract a row that is still in flight', async () => {
      filesRepo['findById']?.mockResolvedValue(buildFile({ ingestionStatus: 'PROCESSING' }));

      await service.getFileContent('file-1', USER_ID);

      expect(processing.processFile).not.toHaveBeenCalled();
    });

    it('does not retry a row that already failed', async () => {
      filesRepo['findById']?.mockResolvedValue(
        buildFile({ ingestionStatus: 'FAILED', extractionError: 'corrupt' }),
      );

      await service.getFileContent('file-1', USER_ID);

      expect(processing.processFile).not.toHaveBeenCalled();
    });
  });

  describe('getIngestionState', () => {
    it('reports the text length without shipping the text', async () => {
      filesRepo['findById']?.mockResolvedValue(
        buildFile({ ingestionStatus: 'COMPLETED', extractedText: 'abcdef' }),
      );

      const state = await service.getIngestionState('file-1', USER_ID);

      expect(state.extractedTextLength).toBe(6);
      expect(Object.keys(state)).not.toContain('extractedText');
    });

    it('refuses a file owned by another user', async () => {
      filesRepo['findById']?.mockResolvedValue(buildFile({ userId: 'someone-else' }));

      await expect(service.getIngestionState('file-1', USER_ID)).rejects.toThrow();
    });
  });
});
