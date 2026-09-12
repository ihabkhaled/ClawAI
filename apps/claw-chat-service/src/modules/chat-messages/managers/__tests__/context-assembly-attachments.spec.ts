// The defect this file exists to prevent from returning:
//
// decodeFileContent fell through to "[Binary file ... content not extractable as
// text]" for every PDF, DOCX, XLSX and PPTX. Models read that sentence and
// paraphrased it back as a refusal, which users reported as "the AI can't read
// my file". The AI could read perfectly; we were telling it there was nothing
// to read. See ADR-095.

import { ContextAssemblyManager } from '../context-assembly.manager';
import { type FileContentResponse } from '../../types/context.types';
import { MAX_FILE_CONTENT_LENGTH } from '../../constants/file-content.constants';

type Decoder = (file: FileContentResponse) => string;

const buildFile = (overrides: Partial<FileContentResponse> = {}): FileContentResponse => ({
  id: 'file-1',
  filename: 'resume.pdf',
  mimeType: 'application/pdf',
  content: 'JVBERi0xLjMKJf////8K',
  extractedText: null,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
  ...overrides,
});

describe('ContextAssemblyManager attachment decoding', () => {
  let decode: Decoder;

  beforeEach(() => {
    const manager = new ContextAssemblyManager(
      { select: jest.fn() } as never,
      { retrieve: jest.fn() } as never,
    );
    // decodeFileContent is private by design — it is an implementation detail of
    // prompt assembly — but it is the exact seam the defect lived in, so it is
    // exercised directly rather than through a full assemble() fixture.
    decode = (file) =>
      (manager as unknown as { decodeFileContent: Decoder }).decodeFileContent(file);
  });

  describe('documents', () => {
    it('gives the model the extracted text of a PDF', () => {
      const result = decode(
        buildFile({ extractedText: 'Ihab Khaled — Senior Full-Stack Engineer' }),
      );

      expect(result).toBe('Ihab Khaled — Senior Full-Stack Engineer');
    });

    it('never returns the old not-extractable sentence for a PDF with text', () => {
      const result = decode(buildFile({ extractedText: 'Real content' }));

      expect(result).not.toContain('not extractable');
    });

    it('prefers extracted text over the base64 bytes', () => {
      const result = decode(buildFile({ extractedText: 'Readable' }));

      expect(result).not.toContain('JVBERi0');
    });

    it.each([
      ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'report.docx'],
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'revenue.xlsx'],
      ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'deck.pptx'],
      ['application/rtf', 'contract.rtf'],
    ])('gives the model the extracted text of %s', (mimeType, filename) => {
      const result = decode(buildFile({ mimeType, filename, extractedText: 'Document body' }));

      expect(result).toBe('Document body');
    });

    it('truncates a very long document rather than blowing the budget', () => {
      const long = 'x'.repeat(MAX_FILE_CONTENT_LENGTH + 5000);

      const result = decode(buildFile({ extractedText: long }));

      expect(result.length).toBeLessThan(long.length);
      expect(result).toContain('truncated');
    });
  });

  // Extraction is asynchronous, so "not yet" and "never" are different answers.
  // Telling a model a document is empty while it is still being read produces a
  // confidently wrong reply, which is worse than an honest wait.
  describe('unfinished extraction', () => {
    it.each(['PENDING', 'PROCESSING'] as const)(
      'tells the model a %s file is still being read, not that it is empty',
      (ingestionStatus) => {
        const result = decode(buildFile({ ingestionStatus }));

        expect(result).toContain('still being read');
        expect(result).not.toContain('no content');
      },
    );

    it('instructs the model not to guess while a file is still being read', () => {
      const result = decode(buildFile({ ingestionStatus: 'PROCESSING' }));

      expect(result).toContain('rather than guessing');
    });
  });

  describe('failed extraction', () => {
    it('passes the specific reason through to the model', () => {
      const result = decode(
        buildFile({ ingestionStatus: 'FAILED', extractionError: 'PDF is password protected' }),
      );

      expect(result).toContain('PDF is password protected');
    });

    it('falls back to a generic reason when none was recorded', () => {
      const result = decode(buildFile({ ingestionStatus: 'FAILED', extractionError: null }));

      expect(result).toContain('could not be parsed');
    });

    it('tells the model not to guess at the contents', () => {
      const result = decode(buildFile({ ingestionStatus: 'FAILED', extractionError: 'corrupt' }));

      expect(result).toContain('do not guess');
    });
  });

  describe('images', () => {
    it('routes an image to the multimodal path when it has no OCR text', () => {
      const result = decode(
        buildFile({ filename: 'invoice.png', mimeType: 'image/png', extractedText: null }),
      );

      expect(result).toContain('multimodal images field');
    });

    // A text-only model cannot see the picture. OCR text is the difference
    // between a useful answer and a model inventing an invoice.
    it('gives a text-only lane the OCR text of an image', () => {
      const result = decode(
        buildFile({
          filename: 'invoice.png',
          mimeType: 'image/png',
          extractedText: 'INVOICE NUMBER 4471 TOTAL DUE 1284 USD',
        }),
      );

      expect(result).toContain('INVOICE NUMBER 4471');
    });

    it('treats the OCR placeholder as no text at all', () => {
      const result = decode(
        buildFile({
          filename: 'invoice.png',
          mimeType: 'image/png',
          extractedText: '[Image file: invoice.png]',
        }),
      );

      expect(result).toContain('multimodal images field');
    });
  });

  describe('plain text files', () => {
    it('still decodes a text file from base64 when nothing was extracted', () => {
      const result = decode(
        buildFile({
          filename: 'notes.md',
          mimeType: 'text/markdown',
          extractedText: null,
          content: Buffer.from('# Heading\n\nBody').toString('base64'),
        }),
      );

      expect(result).toContain('# Heading');
    });

    it('reports an empty file honestly', () => {
      const result = decode(
        buildFile({
          filename: 'empty.txt',
          mimeType: 'text/plain',
          extractedText: null,
          content: null,
        }),
      );

      expect(result).toContain('no content');
    });
  });

  // A file-service that predates ADR-095 does not send the new fields at all.
  describe('older file-service payloads', () => {
    it('falls back to decoding a text file when the new fields are absent', () => {
      const result = decode({
        id: 'file-1',
        filename: 'notes.txt',
        mimeType: 'text/plain',
        content: Buffer.from('legacy body').toString('base64'),
      });

      expect(result).toBe('legacy body');
    });
  });
});
