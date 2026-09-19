import { CsvError, parse } from 'csv-parse/sync';

/**
 * Text that already is CSV, as rows, or null when it is not CSV.
 *
 * csv-parse 7 types a sync parse without `columns` as `string[][]`, so there
 * is no cast, and it exports CsvError: only "this is not CSV" means null. Any
 * other throw is a bug and is not mistaken for plain text.
 */
export function csvRows(content: string): string[][] | null {
  if (!content.includes(',') || !content.includes('\n')) {
    return null;
  }
  try {
    return parse(content, {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error: unknown) {
    if (error instanceof CsvError) {
      return null;
    }
    throw error;
  }
}

/** Every non-empty line as a one-column row. */
export function lineRows(content: string): string[][] {
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => [line]);
}
