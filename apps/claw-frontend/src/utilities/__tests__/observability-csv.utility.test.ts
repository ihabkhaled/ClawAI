import { describe, expect, it, vi } from 'vitest';

import { userObsRow } from '@/components/observability/pages/__tests__/pages-fixtures';
import {
  buildUsersCsv,
  csvCell,
  downloadCsv,
  microToPlainUsd,
} from '@/utilities/observability-csv.utility';

describe('csvCell', () => {
  it('leaves plain text and numbers alone', () => {
    expect(csvCell('jane')).toBe('jane');
    expect(csvCell(12)).toBe('12');
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(null)).toBe('');
  });

  it('quotes a comma, a quote and a line break, doubling quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('defuses a value a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
});

describe('microToPlainUsd', () => {
  it('prints integer micro-USD as an exact decimal', () => {
    expect(microToPlainUsd('2500000')).toBe('2.500000');
    expect(microToPlainUsd('1')).toBe('0.000001');
    expect(microToPlainUsd('0')).toBe('0.000000');
  });

  it('returns nothing for a value that is not an integer', () => {
    expect(microToPlainUsd('abc')).toBe('');
  });
});

describe('buildUsersCsv', () => {
  it('writes the header then one line per user with the full email', () => {
    const csv = buildUsersCsv([userObsRow()], ['id', 'email']);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe('﻿id,email');
    expect(lines[1]).toBe(
      'user-1,jane.doe@example.com,jane,USER,12,1000,500,100,3,2.500000,PRICED,2026-10-05T11:30:00.000Z',
    );
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('starts with a UTF-8 byte order mark so a spreadsheet reads non-Latin names', () => {
    const csv = buildUsersCsv([userObsRow({ username: 'ياسمين' })], ['id']);
    expect(csv.codePointAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toContain('ياسمين');
  });

  it('falls back to the masked email, then to nothing', () => {
    const masked = buildUsersCsv(
      [userObsRow({ email: null, maskedEmail: 'ja***@example.com' })],
      [],
    );
    expect(masked).toContain('ja***@example.com');
    const none = buildUsersCsv([userObsRow({ email: null, maskedEmail: null })], []);
    expect(none).toContain('user-1,,jane');
  });
});

describe('downloadCsv', () => {
  it('offers the text as a named file and cleans up after itself', () => {
    const createObjectURL = vi.fn(() => 'blob:csv');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadCsv('a,b', 'users.csv');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
    expect(document.querySelector('a[download]')).toBeNull();
    click.mockRestore();
  });
});
