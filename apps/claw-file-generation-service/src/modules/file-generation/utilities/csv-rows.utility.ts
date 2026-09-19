import { parse } from 'csv-parse/sync';

/** Text that already is CSV, as rows, or null when it is not CSV. */
export function csvRows(content: string): string[][] | null {
  if (!content.includes(',') || !content.includes('\n')) {
    return null;
  }
  try {
    return parse(content, {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];
  } catch {
    return null;
  }
}

/** Every non-empty line as a one-column row. */
export function lineRows(content: string): string[][] {
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => [line]);
}
