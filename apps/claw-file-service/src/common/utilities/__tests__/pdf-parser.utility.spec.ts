import { vi } from 'vitest';

import { PdfExtractionTimeoutError } from '../../errors/pdf-extraction-timeout.error';
import {
  DOCUMENT_TEXT_MAX_CHARS,
  PDF_TEXT_MAX_PAGES,
  PDF_TEXT_TIMEOUT_MS,
} from '../../../modules/files/constants/extract-text.constants';
import { extractTextFromPdf } from '../pdf-parser.utility';

/**
 * `pdf-parse` is mocked because the unit under test is the page selection, not
 * the PDF format: what matters is which page numbers reach the parser and what
 * comes back out, and a real document would only make that harder to read.
 *
 * `vi.hoisted` because `vi.mock` is lifted above every import: a plain
 * top-level spy would be read before it exists, and reaching back into the
 * mocked module for it would need a cast.
 */
const spies = vi.hoisted(() => ({
  getText: vi.fn(),
  getInfo: vi.fn(async (): Promise<{ total: number }> => ({ total: 1 })),
  getImage: vi.fn(async (): Promise<{ pages: { images: unknown[] }[] }> => ({ pages: [] })),
  destroy: vi.fn(async () => {}),
}));

vi.mock('pdf-parse', () => ({
  PDFParse: class {
    getText = spies.getText;
    getInfo = spies.getInfo;
    getImage = spies.getImage;
    destroy = spies.destroy;
  },
}));

const { getText, getInfo, destroy } = spies;

const answer = (pages: { num: number; text: string }[], total: number): void => {
  getText.mockResolvedValue({ text: pages.map((page) => page.text).join('\n'), pages, total });
};

describe('extractTextFromPdf', () => {
  beforeEach(() => {
    getText.mockReset();
    getInfo.mockReset();
    getInfo.mockResolvedValue({ total: 1 });
    destroy.mockClear();
  });

  it('reads the whole document when no range is asked for', async () => {
    answer([{ num: 1, text: 'one' }], 1);

    const result = await extractTextFromPdf(Buffer.from('%PDF'), 1);

    expect(getText).toHaveBeenCalledWith();
    expect(result.totalPages).toBe(1);
  });

  it('asks for exactly the pages the range names, inclusive of both ends', async () => {
    answer([{ num: 3, text: 'three' }], 9);

    await extractTextFromPdf(Buffer.from('%PDF'), 1, { from: 3, to: 5 });

    // `partial` rather than first/last: those two mean "the first N" and "the
    // last N" alone and a range only together, so the call would depend on
    // which of them happened to be set.
    expect(getText).toHaveBeenCalledWith({ partial: [3, 4, 5] });
  });

  it('reads a reversed range as the range it names', async () => {
    answer([], 9);

    await extractTextFromPdf(Buffer.from('%PDF'), 1, { from: 7, to: 3 });

    expect(getText).toHaveBeenCalledWith({ partial: [3, 4, 5, 6, 7] });
  });

  it('never asks for page zero', async () => {
    answer([], 9);

    await extractTextFromPdf(Buffer.from('%PDF'), 1, { from: 0, to: 2 });

    expect(getText).toHaveBeenCalledWith({ partial: [1, 2] });
  });

  it('reports the pages it got back, with their own numbers', async () => {
    answer(
      [
        { num: 4, text: 'four' },
        { num: 5, text: 'five' },
      ],
      12,
    );

    const result = await extractTextFromPdf(Buffer.from('%PDF'), 1, { from: 4, to: 6 });

    // Page 6 is absent because the document has it but the parser returned
    // nothing for it. Reporting what came back, rather than what was asked
    // for, is what lets a caller tell an empty page from a missing one.
    expect(result.pages).toEqual([
      { number: 4, text: 'four' },
      { number: 5, text: 'five' },
    ]);
    expect(result.totalPages).toBe(12);
  });

  it('keeps a short document with real text as not scanned', async () => {
    answer([{ num: 1, text: 'hi' }], 1);

    const result = await extractTextFromPdf(Buffer.from('%PDF'), 100);

    expect(result.isScanned).toBe(false);
  });

  it('marks a short document with no text and an image as scanned', async () => {
    answer([{ num: 1, text: '' }], 1);
    spies.getImage.mockResolvedValueOnce({ pages: [{ images: [{}] }] });

    const result = await extractTextFromPdf(Buffer.from('%PDF'), 100);

    expect(result.isScanned).toBe(true);
  });

  it('releases the parser even when parsing throws', async () => {
    getText.mockRejectedValue(new Error('broken document'));

    await expect(extractTextFromPdf(Buffer.from('%PDF'), 1)).rejects.toThrow('broken document');
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  describe('bounds', () => {
    it('cuts a many-page document to the page cap with a visible line', async () => {
      getInfo.mockResolvedValue({ total: PDF_TEXT_MAX_PAGES + 40 });
      answer([{ num: 1, text: 'one' }], PDF_TEXT_MAX_PAGES + 40);

      const result = await extractTextFromPdf(Buffer.from('%PDF'), 1);

      const asked = (getText.mock.calls[0]?.[0] as { partial: number[] }).partial;
      expect(asked).toHaveLength(PDF_TEXT_MAX_PAGES);
      expect(asked.at(-1)).toBe(PDF_TEXT_MAX_PAGES);
      expect(result.text).toContain(
        `[Text cut: the document has ${String(PDF_TEXT_MAX_PAGES + 40)} pages, only the first ${String(PDF_TEXT_MAX_PAGES)} were read]`,
      );
    });

    it('does not touch a document at or under the page cap', async () => {
      getInfo.mockResolvedValue({ total: PDF_TEXT_MAX_PAGES });
      answer([{ num: 1, text: 'one' }], PDF_TEXT_MAX_PAGES);

      const result = await extractTextFromPdf(Buffer.from('%PDF'), 1);

      expect(getText).toHaveBeenCalledWith();
      expect(result.text).toBe('one');
    });

    it('clamps an explicit range to the page cap', async () => {
      answer([], 9000);

      await extractTextFromPdf(Buffer.from('%PDF'), 1, { from: 1, to: 9000 });

      const asked = (getText.mock.calls[0]?.[0] as { partial: number[] }).partial;
      expect(asked).toHaveLength(PDF_TEXT_MAX_PAGES);
    });

    it('caps returned characters, in the text and in the pages together', async () => {
      const big = 'x'.repeat(DOCUMENT_TEXT_MAX_CHARS);
      answer(
        [
          { num: 1, text: big },
          { num: 2, text: big },
        ],
        2,
      );

      const result = await extractTextFromPdf(Buffer.from('%PDF'), 1);

      expect(result.text).toContain('[Text cut: the document is longer than');
      expect(result.text.length).toBeLessThan(DOCUMENT_TEXT_MAX_CHARS + 200);
      expect(result.pages.reduce((sum, page) => sum + page.text.length, 0)).toBe(
        DOCUMENT_TEXT_MAX_CHARS,
      );
    });

    describe('wall-clock budget', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });
      afterEach(() => {
        vi.useRealTimers();
      });

      it('stops waiting on a parser that never answers and frees the parser once', async () => {
        getText.mockReturnValue(new Promise(() => {}));

        const outcome = extractTextFromPdf(Buffer.from('%PDF'), 1).catch((error: unknown) => error);
        await vi.advanceTimersByTimeAsync(PDF_TEXT_TIMEOUT_MS + 1);
        const error = await outcome;

        expect(error).toBeInstanceOf(PdfExtractionTimeoutError);
        expect((error as PdfExtractionTimeoutError).code).toBe('PDF_EXTRACTION_TIMEOUT');
        expect((error as PdfExtractionTimeoutError).getStatus()).toBe(422);
        expect(destroy).toHaveBeenCalledTimes(1);
      });

      it('leaves no timer behind after a normal read', async () => {
        answer([{ num: 1, text: 'one' }], 1);

        await extractTextFromPdf(Buffer.from('%PDF'), 1);

        expect(vi.getTimerCount()).toBe(0);
      });
    });
  });
});
