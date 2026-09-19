import { stringify } from 'csv-stringify/sync';

import { firstTableRows } from '../utilities/document-table.utility';

/**
 * Text to CSV. A Markdown table in the answer becomes the CSV (header first),
 * with its cells as plain text and quoted as CSV requires (F3, ADR-107).
 * It used to pass the table through with its pipes. Without a table, text that
 * already looks like CSV passes through, and anything else is one column.
 */
export const convertToCsv = (content: string): Buffer => {
  const table = firstTableRows(content);
  if (table !== null) {
    return Buffer.from(stringify(table), 'utf-8');
  }
  if (content.includes(',') && content.includes('\n')) {
    return Buffer.from(content, 'utf-8');
  }
  const records = content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => [line]);
  return Buffer.from(stringify(records), 'utf-8');
};
