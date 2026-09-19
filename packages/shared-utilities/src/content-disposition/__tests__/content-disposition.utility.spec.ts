import { validateHeaderValue } from 'node:http';

import { describe, expect, it } from 'vitest';

import { ContentDispositionType } from '../content-disposition-type.enum';
import { asciiFallbackFilename, contentDispositionHeader } from '../content-disposition.utility';

describe('contentDispositionHeader', () => {
  // Every one of these threw ERR_INVALID_CHAR in file-service and the download
  // was a 500 (found by the F4 file-model matrix, 2026-09-19).
  it.each([
    'Home Wi‑Fi Security Quick Guide.pdf',
    'تقرير الربع الأول.pdf',
    '季度报告.docx',
    '週次ミーティング.pptx',
    'Résumé — final.docx',
    'quote " and \\ backslash.txt',
    'line\r\nbreak.csv',
  ])('is a legal header value for %j', (filename) => {
    const header = contentDispositionHeader(ContentDispositionType.ATTACHMENT, filename);

    expect(() => validateHeaderValue('Content-Disposition', header)).not.toThrow();
  });

  it('keeps the real name in filename* and a readable ASCII one in filename', () => {
    expect(
      contentDispositionHeader(ContentDispositionType.ATTACHMENT, "Home Wi‑Fi (it's) *new*.pdf"),
    ).toBe(
      `attachment; filename="Home Wi-Fi (it's) *new*.pdf"; filename*=UTF-8''Home%20Wi%E2%80%91Fi%20%28it%27s%29%20%2Anew%2A.pdf`,
    );
  });

  it('uses the type it is given', () => {
    expect(contentDispositionHeader(ContentDispositionType.INLINE, 'a.png')).toMatch(/^inline; /);
  });
});

describe('asciiFallbackFilename', () => {
  it('drops accents instead of the letter', () => {
    expect(asciiFallbackFilename('Résumé.docx')).toBe('Resume.docx');
  });

  it('names a file with no ASCII letters "download", keeping the extension', () => {
    expect(asciiFallbackFilename('تقرير.pdf')).toBe('download.pdf');
    expect(asciiFallbackFilename('季度')).toBe('download');
  });

  it('never leaves a quote or backslash that could end the quoted string', () => {
    expect(asciiFallbackFilename('a"b\\c.txt')).toBe('a-b-c.txt');
  });
});
