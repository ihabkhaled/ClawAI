// B6b — the producer half: an audio upload must QUEUE a transcription job.
//
// Ordering is the thing under test as much as the publish itself. The request
// goes out AFTER the row has been written with its placeholder, because a job
// that raced the write could have its transcript overwritten by the very
// placeholder that asked for it.

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { EventPattern } from '@claw/shared-types';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { FileProcessingManager } from '../file-processing.manager';
import { type ZipExpansionManager } from '../zip-expansion.manager';
import { type FilesRepository } from '../../repositories/files.repository';
import { type FileChunksRepository } from '../../repositories/file-chunks.repository';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';

vi.mock('../../../../common/utilities', () => ({
  readFile: vi.fn(() => Buffer.from('binary-audio-bytes')),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({
      OCR_ENABLED: false,
      SCANNED_PDF_CHAR_THRESHOLD: 100,
      OCR_LANGUAGE: 'eng',
      OCR_TIMEOUT_MS: 30_000,
      OCR_CONFIDENCE_MIN: 0.5,
      OCR_WORKER_THREADS: 2,
    })),
  },
}));

const buildFile = (overrides: Partial<File> = {}): File =>
  ({
    id: 'audio-1',
    userId: 'user-1',
    filename: 'meeting.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 2048,
    storagePath: '/data/uploads/meeting.mp3',
    content: null,
    extractedText: null,
    extractionError: null,
    ingestionStatus: FileIngestionStatus.PENDING,
    retentionExpiresAt: null,
    parentFileId: null,
    isExtracted: false,
    extractionMetadata: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as File;

const buildHarness = () => {
  const order: string[] = [];
  const filesRepository = {
    updateIngestionStatus: vi.fn().mockResolvedValue(undefined),
    saveExtractionResult: vi.fn().mockImplementation(() => {
      order.push('saveExtractionResult');
      return Promise.resolve(undefined);
    }),
  };
  const fileChunksRepository = { createMany: vi.fn().mockResolvedValue(undefined) };
  const rabbit = {
    publish: vi.fn().mockResolvedValue(undefined),
    publishConfirmed: vi.fn().mockImplementation(() => {
      order.push('publishConfirmed');
      return Promise.resolve(undefined);
    }),
  };
  const manager = new FileProcessingManager(
    filesRepository as unknown as FilesRepository,
    fileChunksRepository as unknown as FileChunksRepository,
    rabbit as unknown as RabbitMQService,
    {} as unknown as ZipExpansionManager,
  );
  return { manager, filesRepository, rabbit, order };
};

describe('FileProcessingManager — audio transcription trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes FILE_TRANSCRIBE_REQUESTED with confirms, after the row is written', async () => {
    const harness = buildHarness();

    await harness.manager.processFile(buildFile());

    expect(harness.rabbit.publishConfirmed).toHaveBeenCalledWith(
      EventPattern.FILE_TRANSCRIBE_REQUESTED,
      expect.objectContaining({
        fileId: 'audio-1',
        userId: 'user-1',
        filename: 'meeting.mp3',
        mimeType: 'audio/mpeg',
      }),
    );
    expect(harness.order).toEqual(['saveExtractionResult', 'publishConfirmed']);
  });

  it('still stores the readable placeholder so the row is coherent meanwhile', async () => {
    const harness = buildHarness();

    await harness.manager.processFile(buildFile());

    const firstCall = (harness.filesRepository.saveExtractionResult as Mock).mock.calls[0];
    expect(firstCall?.[1]).toEqual({
      extractedText: '[Audio file: meeting.mp3]',
      extractionError: null,
      status: FileIngestionStatus.COMPLETED,
    });
  });

  it('records a reason on the row when the broker refuses the job', async () => {
    const harness = buildHarness();
    harness.rabbit.publishConfirmed.mockRejectedValue(new Error('channel closed'));

    await harness.manager.processFile(buildFile());

    expect(harness.filesRepository.saveExtractionResult).toHaveBeenLastCalledWith('audio-1', {
      extractedText: '[Audio file: meeting.mp3]',
      extractionError: 'Audio transcription could not be queued: channel closed',
      status: FileIngestionStatus.COMPLETED,
    });
  });

  it('does not queue transcription for a non-audio upload', async () => {
    const harness = buildHarness();

    await harness.manager.processFile(buildFile({ mimeType: 'text/plain', filename: 'notes.txt' }));

    expect(harness.rabbit.publishConfirmed).not.toHaveBeenCalled();
  });
});
