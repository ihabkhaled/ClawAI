import { stringify } from 'csv-stringify/sync';

import { csvRows, lineRows } from '../utilities/csv-rows.utility';
import { firstTableRows } from '../utilities/document-table.utility';
import { csvSafeCell } from '../utilities/spreadsheet-cell.utility';

/**
 * Text to CSV (F3, ADR-107/108).
 * - A Markdown table in the answer becomes the CSV, header first.
 * - Text that already is CSV is parsed and written again.
 * - Anything else becomes one column, a line per row.
 *
 * Every cell passes `csvSafeCell`, so a cell such as `=HYPERLINK(...)` from a
 * model opens as text in a spreadsheet, not as a formula (CSV injection).
 */
export const convertToCsv = (content: string): Buffer => {
  const rows = firstTableRows(content) ?? csvRows(content) ?? lineRows(content);
  return Buffer.from(stringify(rows.map((row) => row.map(csvSafeCell))), 'utf-8');
};
