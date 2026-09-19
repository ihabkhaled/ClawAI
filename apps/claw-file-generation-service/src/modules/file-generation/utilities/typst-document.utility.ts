import { DOCUMENT_BODY_FONTS, DOCUMENT_MONO_FONTS } from '../constants/document-render.constants';
import { BlockKind, InlineKind, TableAlign } from '../enums/document-node.enum';
import type {
  DocumentBlock,
  DocumentMeta,
  InlineNode,
  TableBlock,
  TextNode,
} from '../types/markdown-document.types';
import { blockText, isRightToLeft } from './markdown-document.utility';

/**
 * A Typst document for the blocks (F3, ADR-107).
 *
 * Every piece of the answer's text is emitted as a Typst string literal
 * (`#"…"`) and never as markup. The model's output can therefore not become
 * Typst code: `#read`, `#include`, `#import` or a `#set` written in an answer
 * is printed, not run. That is the whole injection defence, so keep it: no
 * text reaches the source any other way.
 */
export function renderTypstDocument(blocks: DocumentBlock[], meta: DocumentMeta): string {
  const preamble = [
    `#set document(title: ${typstString(meta.title)})`,
    '#set page(paper: "a4", margin: 2cm, numbering: "1")',
    `#set text(font: ${typstArray(DOCUMENT_BODY_FONTS)}, size: 11pt${meta.rtl ? ', dir: rtl' : ''})`,
    '#set par(justify: false, leading: 0.7em)',
    `#show raw: set text(font: ${typstArray(DOCUMENT_MONO_FONTS)}, size: 9.5pt)`,
    '#show raw.where(block: true): block.with(fill: luma(245), inset: 8pt, radius: 3pt, width: 100%)',
    '#show link: underline',
    '#set table(stroke: 0.5pt + luma(180), inset: 6pt)',
  ];
  return `${preamble.join('\n')}\n\n${renderBlocks(blocks)}`;
}

/** A Typst string literal holding exactly `value`. */
export function typstString(value: string): string {
  let escaped = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (char === '\\') {
      escaped += '\\\\';
    } else if (char === '"') {
      escaped += '\\"';
    } else if (char === '\n') {
      escaped += '\\n';
    } else if (char === '\t') {
      escaped += '\\t';
    } else if (code < 0x20 || code === 0x7f) {
      // Other control characters have no business in a document.
      continue;
    } else {
      escaped += char;
    }
  }
  return `"${escaped}"`;
}

function typstArray(values: readonly string[]): string {
  return `(${values.map(typstString).join(', ')},)`;
}

function renderBlocks(blocks: DocumentBlock[]): string {
  return blocks.map(renderBlock).join('\n\n');
}

function renderBlock(block: DocumentBlock): string {
  switch (block.kind) {
    case BlockKind.HEADING:
      return directed(
        block,
        `#heading(level: ${String(block.level)})[${renderInline(block.content)}]`,
      );
    case BlockKind.PARAGRAPH:
      return directed(block, `#par[${renderInline(block.content)}]`);
    case BlockKind.LIST: {
      const items = block.items.map((item) => `[${renderBlocks(item)}]`).join(', ');
      return block.ordered ? `#enum(start: ${String(block.start)}, ${items})` : `#list(${items})`;
    }
    case BlockKind.CODE:
      return `#raw(${typstString(block.text)}, block: true${
        block.language === null ? '' : `, lang: ${typstString(block.language)}`
      })`;
    case BlockKind.QUOTE:
      return `#quote(block: true)[${renderBlocks(block.blocks)}]`;
    case BlockKind.TABLE:
      return renderTable(block);
    case BlockKind.RULE:
      return '#line(length: 100%, stroke: 0.5pt + luma(180))';
  }
}

/** A block whose text runs right to left gets its own direction. */
function directed(block: DocumentBlock, markup: string): string {
  return isRightToLeft(blockText(block)) ? `#[#set text(dir: rtl)\n${markup}]` : markup;
}

function renderTable(table: TableBlock): string {
  const columns = Math.max(table.header.length, ...table.rows.map((row) => row.length), 1);
  const cells = (row: InlineNode[][], header: boolean): string[] =>
    Array.from({ length: columns }, (_, index) => {
      const content = renderInline(row[index] ?? []);
      return header ? `[#strong[${content}]]` : `[${content}]`;
    });
  const aligns = Array.from({ length: columns }, (_, index) => typstAlign(table.aligns[index]));
  const header =
    table.header.length > 0 ? `table.header(${cells(table.header, true).join(', ')}), ` : '';
  const body = table.rows.flatMap((row) => cells(row, false)).join(', ');
  return `#table(columns: ${String(columns)}, align: (${aligns.join(', ')},), ${header}${body})`;
}

function typstAlign(align: TableAlign | undefined): string {
  switch (align) {
    case TableAlign.CENTER:
      return 'center';
    case TableAlign.RIGHT:
      return 'end';
    default:
      return 'start';
  }
}

function renderInline(nodes: InlineNode[]): string {
  return nodes.map(renderInlineNode).join('');
}

function renderInlineNode(node: InlineNode): string {
  switch (node.kind) {
    case InlineKind.TEXT:
      return renderText(node);
    case InlineKind.LINK:
      return `#link(${typstString(node.href)})[${renderInline(node.children)}]`;
    case InlineKind.BREAK:
      return '#linebreak()';
  }
}

function renderText(node: TextNode): string {
  let markup = node.marks.code ? `#raw(${typstString(node.text)})` : `#${typstString(node.text)}`;
  if (node.marks.strike) {
    markup = `#strike[${markup}]`;
  }
  if (node.marks.italic) {
    markup = `#emph[${markup}]`;
  }
  if (node.marks.bold) {
    markup = `#strong[${markup}]`;
  }
  return markup;
}
