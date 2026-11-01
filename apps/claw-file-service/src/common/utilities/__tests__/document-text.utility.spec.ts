import { existsSync } from 'node:fs';
import { vi } from 'vitest';

import { documentTextExtension, extractTextFromDocument } from '../document-text.utility';
import { extractTextFromPptx, extractTextFromXlsx } from '../ooxml-parser.utility';

vi.mock('../ooxml-parser.utility', () => ({
  extractTextFromPptx: vi.fn(),
  extractTextFromXlsx: vi.fn(),
}));

const xlsx = vi.mocked(extractTextFromXlsx);
const pptx = vi.mocked(extractTextFromPptx);

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
