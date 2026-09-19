import { BlockKind } from '../enums/document-node.enum';
import type { DocumentBlock, TableBlock } from '../types/markdown-document.types';
import { inlineText, parseMarkdownDocument } from './markdown-document.utility';

/**
 * The first Markdown table in the text as rows of plain-text cells, header
 * first, or null when there is none. Tables inside lists and quotes count.
 */
export function firstTableRows(markdown: string): string[][] | null {
  const table = findTable(parseMarkdownDocument(markdown));
  if (table === null) {
    return null;
  }
  const columns = Math.max(table.header.length, ...table.rows.map((row) => row.length));
  const toRow = (cells: TableBlock['header']): string[] =>
    Array.from({ length: columns }, (_, index) => inlineText(cells[index] ?? []).trim());
  return [...(table.header.length > 0 ? [toRow(table.header)] : []), ...table.rows.map(toRow)];
}

function findTable(blocks: DocumentBlock[]): TableBlock | null {
  for (const block of blocks) {
    if (block.kind === BlockKind.TABLE) {
      return block;
    }
    const nested = childBlocks(block);
    const found = nested.length > 0 ? findTable(nested) : null;
    if (found !== null) {
      return found;
    }
  }
  return null;
}

function childBlocks(block: DocumentBlock): DocumentBlock[] {
  if (block.kind === BlockKind.QUOTE) {
    return block.blocks;
  }
  if (block.kind === BlockKind.LIST) {
    return block.items.flat();
  }
  return [];
}
