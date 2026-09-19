import type * as CsvSync from 'csv-parse/sync';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { csvRows, lineRows } from '../utilities/csv-rows.utility';

describe('csvRows (csv-parse 7)', () => {
  afterEach(() => {
    vi.doUnmock('csv-parse/sync');
    vi.resetModules();
  });

  it('parses quoted cells with commas and escaped quotes', () => {
    expect(csvRows('name,note\n"Smith, J","said ""hi"""\n')).toEqual([
      ['name', 'note'],
      ['Smith, J', 'said "hi"'],
    ]);
  });

  it('keeps ragged rows instead of failing (relax_column_count)', () => {
    expect(csvRows('a,b\n1,2,3\n4\n')).toEqual([['a', 'b'], ['1', '2', '3'], ['4']]);
  });

  // csv-parse 7 trims ECMAScript whitespace, so a no-break space a model left
  // around a value no longer survives into the cell.
  it('trims every kind of whitespace around a cell', () => {
    expect(csvRows('a,b\n 1 , 2\t\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('is null for text that is not CSV', () => {
    expect(csvRows('just one line, no newline')).toBeNull();
    expect(csvRows('two\nlines without commas')).toBeNull();
  });

  it('is null when the CSV is malformed (CsvError)', () => {
    expect(csvRows('a,b\n"never closed,2\n')).toBeNull();
  });

  it('does not hide a failure that is not a CSV error', async () => {
    vi.doMock('csv-parse/sync', async (importOriginal) => ({
      ...(await importOriginal<typeof CsvSync>()),
      parse: () => {
        throw new TypeError('bug');
      },
    }));
    const { csvRows: isolated } = await import('../utilities/csv-rows.utility');

    expect(() => isolated('a,b\n1,2\n')).toThrow(TypeError);
  });
});

describe('lineRows', () => {
  it('makes each non-empty line a one-column row', () => {
    expect(lineRows('one\n\ntwo\n')).toEqual([['one'], ['two']]);
  });
});
