import { existsSync } from 'node:fs';
import { vi } from 'vitest';

import { DOCUMENT_TEXT_MAX_CHARS } from '../../../modules/files/constants/extract-text.constants';
import { documentTextExtension, extractTextFromDocument } from '../document-text.utility';
import { extractTextFromDocx } from '../docx-parser.utility';
import {
  assertOoxmlArchiveWithinBounds,
  extractTextFromPptx,
  extractTextFromXlsx,
} from '../ooxml-parser.utility';

vi.mock('../ooxml-parser.utility', () => ({
  assertOoxmlArchiveWithinBounds: vi.fn(),
  extractTextFromPptx: vi.fn(),
  extractTextFromXlsx: vi.fn(),
}));
vi.mock('../docx-parser.utility', () => ({ extractTextFromDocx: vi.fn() }));

const xlsx = vi.mocked(extractTextFromXlsx);
const pptx = vi.mocked(extractTextFromPptx);
const docx = vi.mocked(extractTextFromDocx);
const bounds = vi.mocked(assertOoxmlArchiveWithinBounds);

describe('documentTextExtension', () => {
  it.each([
    ['Plan.DOCX', '.docx'],
    ['a/b/sheet.xlsx', '.xlsx'],
    ['deck.pptx', '.pptx'],
    ['memo.rtf', '.rtf'],
  ])('names %s as %s', (filename, expected) => {
    expect(documentTextExtension(filename)).toBe(expected);
  });

  it.each(['notes.txt', 'report.pdf', 'archive.docx.zip', 'docx', ''])(
    'does not claim %s',
    (filename) => {
      expect(documentTextExtension(filename)).toBeUndefined();
    },
  );
});

describe('extractTextFromDocument', () => {
  beforeEach(() => {
    xlsx.mockReset();
    pptx.mockReset();
    docx.mockReset();
    bounds.mockReset();
  });

  it('screens a DOCX archive before mammoth reads it, and removes the file', async () => {
    let screened = '';
    bounds.mockImplementation(async (filePath: string) => {
      screened = filePath;
    });
    docx.mockResolvedValue('word text');

    const text = await extractTextFromDocument('.docx', Buffer.from('docx bytes'));

    expect(text).toBe('word text');
    expect(screened.endsWith('.docx')).toBe(true);
    expect(existsSync(screened)).toBe(false);
  });

  it('never gives a DOCX to mammoth when the screen refuses it', async () => {
    bounds.mockRejectedValue(new Error('too many entries'));

    await expect(extractTextFromDocument('.docx', Buffer.from('x'))).rejects.toThrow(
      'too many entries',
    );
    expect(docx).not.toHaveBeenCalled();
  });

  it('cuts text past the cap on a line boundary and says so', async () => {
    const line = 'x'.repeat(99);
    const lines = Array.from({ length: DOCUMENT_TEXT_MAX_CHARS / 100 + 50 }, () => line);
    xlsx.mockResolvedValue(lines.join('\n'));

    const text = await extractTextFromDocument('.xlsx', Buffer.from('x'));

    expect(text.length).toBeLessThan(DOCUMENT_TEXT_MAX_CHARS + 200);
    expect(text).toMatch(/\[Text cut: the document is longer than \d+ characters\]$/u);
    expect(
      text
        .split('\n')
        .slice(0, -1)
        .every((entry) => entry === line),
    ).toBe(true);
  });

  it('leaves text under the cap untouched', async () => {
    xlsx.mockResolvedValue('short sheet');

    expect(await extractTextFromDocument('.xlsx', Buffer.from('x'))).toBe('short sheet');
  });

  it('reads RTF from memory, with no file written', async () => {
    const text = await extractTextFromDocument(
      '.rtf',
      Buffer.from(String.raw`{\rtf1\ansi Hello there}`),
    );

    expect(text).toContain('Hello there');
    expect(xlsx).not.toHaveBeenCalled();
  });

  it('hands a workbook to the parser as a file holding exactly those bytes, then removes it', async () => {
    let seenPath = '';
    let seenBytes = '';
    xlsx.mockImplementation(async (filePath: string) => {
      seenPath = filePath;
      seenBytes = (await import('node:fs')).readFileSync(filePath, 'utf8');
      return 'sheet text';
    });

    const text = await extractTextFromDocument('.xlsx', Buffer.from('workbook bytes'));

    expect(text).toBe('sheet text');
    expect(seenPath.endsWith('.xlsx')).toBe(true);
    expect(seenBytes).toBe('workbook bytes');
    expect(existsSync(seenPath)).toBe(false);
  });

  it('removes the file even when the parser throws', async () => {
    let seenPath = '';
    pptx.mockImplementation(async (filePath: string) => {
      seenPath = filePath;
      throw new Error('corrupt deck');
    });

    await expect(extractTextFromDocument('.pptx', Buffer.from('x'))).rejects.toThrow(
      'corrupt deck',
    );
    expect(seenPath).not.toBe('');
    expect(existsSync(seenPath)).toBe(false);
  });

  it('refuses an extension it has no reader for', async () => {
    await expect(extractTextFromDocument('.odt', Buffer.from('x'))).rejects.toThrow(
      /No document reader/u,
    );
  });
});
