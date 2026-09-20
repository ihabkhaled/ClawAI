import { vi } from 'vitest';

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
  destroy: vi.fn(async () => {}),
}));

vi.mock('pdf-parse', () => ({
  PDFParse: class {
    getText = spies.getText;
    destroy = spies.destroy;
  },
}));

const { getText, destroy } = spies;

const answer = (pages: { num: number; text: string }[], total: number): void => {
  getText.mockResolvedValue({ text: pages.map((page) => page.text).join('\n'), pages, total });
};

describe('extractTextFromPdf', () => {
  beforeEach(() => {
    getText.mockReset();
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

  it('still marks a short document as scanned', async () => {
    answer([{ num: 1, text: 'hi' }], 1);

    const result = await extractTextFromPdf(Buffer.from('%PDF'), 100);

    expect(result.isScanned).toBe(true);
  });

  it('releases the parser even when parsing throws', async () => {
    getText.mockRejectedValue(new Error('broken document'));

    await expect(extractTextFromPdf(Buffer.from('%PDF'), 1)).rejects.toThrow('broken document');
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
