import { type Mock, vi } from 'vitest';
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

vi.mock('../../../../common/utilities', () => ({
  verifyAccessToken: vi.fn(),
  saveFile: vi.fn().mockReturnValue('/data/files/stored'),
  deleteFile: vi.fn(),
  readFile: vi.fn().mockReturnValue(Buffer.from('bytes')),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({
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
  let filesRepo: Record<string, Mock>;
  let processing: FileProcessingContract;

  beforeEach(() => {
    vi.clearAllMocks();
    filesRepo = {
      create: vi.fn().mockResolvedValue(buildFile()),
      findById: vi.fn(),
      findAll: vi.fn(),
      updateIngestionStatus: vi.fn(),
      saveExtractionResult: vi.fn(),
      delete: vi.fn(),
      countAll: vi.fn(),
      findExpiredBefore: vi.fn(),
      findStaleProcessingBefore: vi.fn(),
      deleteById: vi.fn(),
      markAsExtractedChild: vi.fn(),
      recordExtractionMetadata: vi.fn(),
    };
    processing = {
      processFile: vi.fn().mockResolvedValue(void 0),
      updateIngestionStatus: vi.fn().mockResolvedValue(void 0),
    };
    const security = {
      runAllChecks: vi.fn().mockResolvedValue({ passed: true, checks: [] }),
      getSanitizedFilename: vi.fn().mockImplementation((name: string) => name),
    };
    service = new FilesService(
      filesRepo as unknown as FilesRepository,
      {
        createMany: vi.fn(),
        findByFileId: vi.fn(),
        deleteByFileId: vi.fn(),
      } as unknown as FileChunksRepository,
      { publish: vi.fn().mockResolvedValue(void 0) } as unknown as RabbitMQService,
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
      (processing.processFile as Mock).mockReturnValue(
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
      (processing.processFile as Mock).mockRejectedValue(new Error('tesseract exploded'));

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

    // The defect this block exists to prevent from returning:
    //
    // TranscriptionManager writes FileIngestionStatus.COMPLETED the instant an
    // audio upload lands, with extractedText set to the "[Audio file: …]"
    // placeholder — the real transcript arrives later, out of band. Reporting
    // that COMPLETED verbatim told chat-service's bounded wait the text was
    // final, so it stopped waiting immediately and the model was handed the
    // literal placeholder string as if it were the transcript — the live bug
    // report: a voice note that reached the model as nothing.
    describe('an audio row still carrying the transcription placeholder', () => {
      it('reports PROCESSING instead of the persisted COMPLETED, so chat-service keeps waiting', async () => {
        filesRepo['findById']?.mockResolvedValue(
          buildFile({
            mimeType: 'audio/mpeg',
            ingestionStatus: 'COMPLETED',
            extractedText: '[Audio file: memo.mp3]',
            extractionError: null,
          }),
        );

        const state = await service.getIngestionState('file-1', USER_ID);

        expect(state.ingestionStatus).toBe('PROCESSING');
      });

      it('reports FAILED, not PROCESSING, once transcription has actually failed', async () => {
        filesRepo['findById']?.mockResolvedValue(
          buildFile({
            mimeType: 'audio/mpeg',
            ingestionStatus: 'COMPLETED',
            extractedText: '[Audio file: memo.mp3]',
            extractionError: 'Audio transcription failed: provider timed out',
          }),
        );

        const state = await service.getIngestionState('file-1', USER_ID);

        expect(state.ingestionStatus).toBe('FAILED');
      });

      it('reports COMPLETED, unchanged, once a real transcript has landed', async () => {
        filesRepo['findById']?.mockResolvedValue(
          buildFile({
            mimeType: 'audio/mpeg',
            ingestionStatus: 'COMPLETED',
            extractedText: 'I need this by Friday, thanks.',
            extractionError: null,
          }),
        );

        const state = await service.getIngestionState('file-1', USER_ID);

        expect(state.ingestionStatus).toBe('COMPLETED');
      });

      it('never touches the persisted row, only what is reported', async () => {
        const file = buildFile({
          mimeType: 'audio/mpeg',
          ingestionStatus: 'COMPLETED',
          extractedText: '[Audio file: memo.mp3]',
          extractionError: null,
        });
        filesRepo['findById']?.mockResolvedValue(file);

        await service.getIngestionState('file-1', USER_ID);

        expect(filesRepo['saveExtractionResult']).not.toHaveBeenCalled();
        expect(filesRepo['updateIngestionStatus']).not.toHaveBeenCalled();
      });

      it('leaves a non-audio COMPLETED row alone', async () => {
        filesRepo['findById']?.mockResolvedValue(
          buildFile({ mimeType: PDF_MIME, ingestionStatus: 'COMPLETED', extractedText: 'body' }),
        );

        const state = await service.getIngestionState('file-1', USER_ID);

        expect(state.ingestionStatus).toBe('COMPLETED');
      });
    });
  });
});
