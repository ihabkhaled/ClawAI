// A scanned (image-only) PDF is read: pages are drawn, each is OCRed, and the
// joined text is what the row stores — not the "[Image file: ...]" placeholder.

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { FileProcessingManager } from '../file-processing.manager';
import { type ZipExpansionManager } from '../zip-expansion.manager';
import { type FilesRepository } from '../../repositories/files.repository';
import { type FileChunksRepository } from '../../repositories/file-chunks.repository';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import {
  extractTextFromPdf,
  renderPdfPages,
} from '../../../../common/utilities/pdf-parser.utility';
import { extractTextFromImage } from '../../../../common/utilities/ocr-parser.utility';

vi.mock('../../../../common/utilities', () => ({
  readFile: vi.fn(() => Buffer.from('pdf-bytes')),
}));
vi.mock('../../../../common/utilities/pdf-parser.utility', () => ({
  extractTextFromPdf: vi.fn(),
  renderPdfPages: vi.fn(),
}));
vi.mock('../../../../common/utilities/ocr-parser.utility', () => ({
  extractTextFromImage: vi.fn(),
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({
      OCR_ENABLED: true,
      SCANNED_PDF_CHAR_THRESHOLD: 100,
      OCR_LANGUAGE: 'eng',
      OCR_TIMEOUT_MS: 30_000,
      OCR_CONFIDENCE_MIN: 0.5,
      OCR_WORKER_THREADS: 2,
    })),
  },
}));

const file = {
  id: 'pdf-1',
  userId: 'user-1',
  filename: 'scan.pdf',
  mimeType: 'application/pdf',
  storagePath: '/data/uploads/scan.pdf',
} as File;

const harness = () => {
  const filesRepository = {
    updateIngestionStatus: vi.fn().mockResolvedValue(undefined),
    saveExtractionResult: vi.fn().mockResolvedValue(undefined),
  };
  const rabbit = { publish: vi.fn().mockResolvedValue(undefined) };
  const manager = new FileProcessingManager(
    filesRepository as unknown as FilesRepository,
    { createMany: vi.fn().mockResolvedValue(undefined) } as unknown as FileChunksRepository,
    rabbit as unknown as RabbitMQService,
    {} as unknown as ZipExpansionManager,
  );
  return { manager, filesRepository };
};

const savedText = (repo: { saveExtractionResult: unknown }): unknown =>
  (repo.saveExtractionResult as Mock).mock.calls[0]?.[1];

describe('FileProcessingManager — scanned PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (extractTextFromPdf as Mock).mockResolvedValue({
      text: '',
      isScanned: true,
      pages: [],
      totalPages: 2,
    });
  });

  it('stores the OCR text of every drawn page, with page markers', async () => {
    const h = harness();
    (renderPdfPages as Mock).mockResolvedValue([Buffer.from('p1'), Buffer.from('p2')]);
    (extractTextFromImage as Mock)
      .mockResolvedValueOnce({ text: 'INVOICE 2026-0099', confidence: 0.9, durationMs: 1 })
      .mockResolvedValueOnce({ text: 'Total 1275 EUR', confidence: 0.8, durationMs: 1 });

    await h.manager.processFile(file);

    expect(savedText(h.filesRepository)).toEqual({
      extractedText: '-- Page 1 --\nINVOICE 2026-0099\n\n-- Page 2 --\nTotal 1275 EUR',
      extractionError: null,
      status: FileIngestionStatus.COMPLETED,
    });
    expect(extractTextFromImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/png',
      expect.objectContaining({ language: 'eng' }),
    );
  });

  it('falls back to the placeholder when no page can be drawn', async () => {
    const h = harness();
    (renderPdfPages as Mock).mockResolvedValue([]);

    await h.manager.processFile(file);

    expect(savedText(h.filesRepository)).toMatchObject({
      extractedText: '[Image file: scan.pdf]',
    });
  });

  it('falls back to the placeholder when every page reads as blank', async () => {
    const h = harness();
    (renderPdfPages as Mock).mockResolvedValue([Buffer.from('p1')]);
    (extractTextFromImage as Mock).mockResolvedValue({ text: ' ', confidence: 0, durationMs: 1 });

    await h.manager.processFile(file);

    expect(savedText(h.filesRepository)).toMatchObject({
      extractedText: '[Image file: scan.pdf]',
    });
  });
});
