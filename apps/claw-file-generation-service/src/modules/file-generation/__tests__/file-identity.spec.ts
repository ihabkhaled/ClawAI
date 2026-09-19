import { describe, expect, it } from 'vitest';

import { contentDisposition, unicodeDownloadFilename } from '../utilities/file-asset.utility';
import {
  deriveFileIdentity,
  filenameBase,
  humanTitle,
  titleFromPrompt,
} from '../utilities/file-identity.utility';

describe('deriveFileIdentity', () => {
  it("names a file by the AI's own title and describes it by its first paragraph", () => {
    const identity = deriveFileIdentity(
      '# Q3 Sales: North vs South\n\nRevenue grew 12% in the north while the south stalled.\n\n| a |\n|---|\n| 1 |',
      'make me an excel spreadsheet of sales',
      'XLSX',
    );
    expect(identity).toEqual({
      title: 'Q3 Sales: North vs South',
      description: 'Revenue grew 12% in the north while the south stalled.',
      // ":" is dropped from the name only, not from the title.
      filenameBase: 'Q3 Sales North vs South',
    });
  });

  it('falls back to the request when the file has no heading', () => {
    expect(
      deriveFileIdentity('a,b\n1,2', 'Make me a CSV of 5 fruits and their prices please', 'CSV'),
    ).toEqual({
      title: '5 fruits and their prices please',
      description: null,
      filenameBase: '5 fruits and their prices please',
    });
  });

  it('keeps titles in any script', () => {
    const identity = deriveFileIdentity('# خطة الربع الثالث\n\nنص', 'x', 'PDF');
    expect(identity.title).toBe('خطة الربع الثالث');
    expect(identity.filenameBase).toBe('خطة الربع الثالث');
  });

  it('clips a long description at a word boundary', () => {
    const long = `# T\n\n${'word '.repeat(100)}`;
    const { description } = deriveFileIdentity(long, 'x', 'MD');
    expect(description?.length).toBeLessThanOrEqual(240);
    expect(description?.endsWith('…')).toBe(true);
    expect(description).not.toContain('wor…');
  });

  it('never lets a non-Markdown file be described by its raw data', () => {
    expect(deriveFileIdentity('{"a": 1}', 'json of users', 'JSON').description).toBeNull();
  });
});

describe('humanTitle', () => {
  // Seen live: gpt-oss:120b titled a PDF "Backend_Engineer_Onboarding_Checklist.pdf".
  it.each([
    ['Backend_Engineer_Onboarding_Checklist.pdf', 'Backend Engineer Onboarding Checklist'],
    ['Q3 plan.docx', 'Q3 plan'],
    ['snake_case in a sentence', 'snake_case in a sentence'],
    ['Plan v1.2', 'Plan v1.2'],
  ])('%j → %j', (title, expected) => {
    expect(humanTitle(title)).toBe(expected);
  });
});

describe('titleFromPrompt', () => {
  it.each([
    [
      'Make me an Excel spreadsheet listing 5 fruits with their price per kg',
      'Listing 5 fruits with their price per kg',
    ],
    ['please create a pdf about onboarding.', 'Onboarding'],
    ['make me a file', ''],
    ['اصنع لي ملف عن المبيعات', 'اصنع لي ملف عن المبيعات'],
  ])('%j → %j', (prompt, title) => {
    expect(titleFromPrompt(prompt)).toBe(title);
  });
});

describe('filenames', () => {
  // A title from the model is a filename from the model: nothing in it may
  // leave the download folder or break the header.
  it.each([
    ['../../etc/passwd', 'etc passwd'],
    ['C:\\Windows\\system32', 'C Windows system32'],
    ['a"b<c>d|e?f*g', 'a b c d e f g'],
    [`line${String.fromCharCode(10)}break${String.fromCharCode(0)}`, 'line break'],
    ['...', 'claw-file'],
    ['x'.repeat(200), 'x'.repeat(80)],
  ])('%j → %j', (title, base) => {
    expect(filenameBase(title)).toBe(base);
  });

  it('adds the format extension to the unicode download name', () => {
    expect(unicodeDownloadFilename('خطة الربع.xlsx', 'xlsx')).toBe('خطة الربع.xlsx');
    expect(unicodeDownloadFilename(null, 'pdf')).toBe('claw-file.pdf');
  });

  it('encodes the unicode name so no character can break the header', () => {
    const header = contentDisposition('plan.pdf', `plan"; x=1'().pdf`);
    expect(header).toBe(
      `attachment; filename="plan.pdf"; filename*=UTF-8''plan%22%3B%20x%3D1%27%28%29.pdf`,
    );
    expect(header.split(';')).toHaveLength(3);
  });
});
