import { BlockKind } from '../enums/document-node.enum';
import type { TableBlock } from '../types/markdown-document.types';
import { flattenBlocks, inlineText, parseMarkdownDocument } from './markdown-document.utility';

/**
 * The first Markdown table in the text as rows of plain-text cells, header
 * first, or null when there is none. Tables inside lists and quotes count.
 */
export function firstTableRows(markdown: string): string[][] | null {
  const table = flattenBlocks(parseMarkdownDocument(markdown)).find(
    (block): block is TableBlock => block.kind === BlockKind.TABLE,
  );
  return table === undefined ? null : tableRows(table);
}

/** A table as rows of plain-text cells, header first, padded to one width. */
export function tableRows(table: TableBlock): string[][] {
  const columns = Math.max(table.header.length, ...table.rows.map((row) => row.length), 1);
  const toRow = (cells: TableBlock['header']): string[] =>
    Array.from({ length: columns }, (_, index) => inlineText(cells[index] ?? []).trim());
  return [...(table.header.length > 0 ? [toRow(table.header)] : []), ...table.rows.map(toRow)];
}
