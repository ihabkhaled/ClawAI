import { firstTableRows } from '../utilities/document-table.utility';

/**
 * Text to JSON. Valid JSON is pretty-printed. A Markdown table becomes an array
 * of objects keyed by its header (F3, ADR-107). Anything else is wrapped as
 * `{ "content": … }`.
 */
export const convertToJson = (content: string): Buffer => {
  try {
    const parsed: unknown = JSON.parse(content);
    return Buffer.from(JSON.stringify(parsed, null, 2), 'utf-8');
  } catch {
    const table = firstTableRows(content);
    if (table !== null) {
      const [header = [], ...rows] = table;
      const records = rows.map((row) =>
        Object.fromEntries(header.map((key, index) => [key, row[index] ?? ''])),
      );
      return Buffer.from(JSON.stringify(records, null, 2), 'utf-8');
    }
    return Buffer.from(JSON.stringify({ content }, null, 2), 'utf-8');
  }
};
