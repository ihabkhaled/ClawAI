import MarkdownIt from 'markdown-it';

import {
  ALLOWED_LINK_PROTOCOLS,
  CODE_LANGUAGE_PATTERN,
  DEFAULT_DOCUMENT_TITLE,
  LTR_LETTER,
  MAX_HEADING_LEVEL,
  RTL_LETTER,
} from '../constants/document-render.constants';
import { BlockKind, InlineKind, TableAlign } from '../enums/document-node.enum';
import type {
  DocumentBlock,
  DocumentMeta,
  InlineMarks,
  InlineNode,
  LinkNode,
  MarkdownToken,
  TableBlock,
  TokenCursor,
} from '../types/markdown-document.types';

/**
 * An answer's Markdown as document blocks, parsed once for every format
 * (F3, ADR-107). Raw HTML is never interpreted: it arrives as text.
 */
export function parseMarkdownDocument(markdown: string): DocumentBlock[] {
  const parser = new MarkdownIt({ html: false, linkify: true });
  const cursor: TokenCursor = { tokens: parser.parse(markdown, {}), index: 0 };
  return parseBlocks(cursor, null);
}

/** The title (first heading, else the fallback) and main direction of a document. */
export function documentMeta(blocks: DocumentBlock[], fallbackTitle: string | null): DocumentMeta {
  const heading = blocks.find((block) => block.kind === BlockKind.HEADING);
  const headingText = heading?.kind === BlockKind.HEADING ? inlineText(heading.content).trim() : '';
  const title = headingText.length > 0 ? headingText : (fallbackTitle ?? DEFAULT_DOCUMENT_TITLE);
  return { title, rtl: isRightToLeft(blocks.map(blockText).join(' ')) };
}

/** Whether the first letter that has a direction belongs to a right-to-left script. */
export function isRightToLeft(text: string): boolean {
  for (const char of text) {
    if (RTL_LETTER.test(char)) {
      return true;
    }
    if (LTR_LETTER.test(char)) {
      return false;
    }
  }
  return false;
}

/** The visible text of inline nodes, marks dropped. */
export function inlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case InlineKind.TEXT:
          return node.text;
        case InlineKind.LINK:
          return inlineText(node.children);
        case InlineKind.BREAK:
          return '\n';
      }
    })
    .join('');
}

/** A block's visible text, used to decide direction. */
export function blockText(block: DocumentBlock): string {
  switch (block.kind) {
    case BlockKind.HEADING:
    case BlockKind.PARAGRAPH:
      return inlineText(block.content);
    case BlockKind.LIST:
      return block.items.map((item) => item.map(blockText).join(' ')).join(' ');
    case BlockKind.QUOTE:
      return block.blocks.map(blockText).join(' ');
    case BlockKind.TABLE:
      return [...block.header, ...block.rows.flat()].map(inlineText).join(' ');
    case BlockKind.CODE:
    case BlockKind.RULE:
      return '';
  }
}

/** Blocks with lists and quotes opened up, in reading order. */
export function flattenBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  return blocks.flatMap((block) => {
    if (block.kind === BlockKind.QUOTE) {
      return flattenBlocks(block.blocks);
    }
    if (block.kind === BlockKind.LIST) {
      return flattenBlocks(block.items.flat());
    }
    return [block];
  });
}

/** A link target a document may keep, or null to show the text only. */
export function safeHref(href: string): string | null {
  try {
    const url = new URL(href);
    return ALLOWED_LINK_PROTOCOLS.includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseBlocks(cursor: TokenCursor, closeType: string | null): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  while (cursor.index < cursor.tokens.length) {
    const token = cursor.tokens[cursor.index];
    cursor.index += 1;
    if (token === undefined || token.type === closeType) {
      return blocks;
    }
    const block = parseBlock(cursor, token);
    if (block !== null) {
      blocks.push(block);
    }
  }
  return blocks;
}

function parseBlock(cursor: TokenCursor, token: MarkdownToken): DocumentBlock | null {
  switch (token.type) {
    case 'heading_open':
      return {
        kind: BlockKind.HEADING,
        level: Math.min(Number(token.tag.slice(1)) || 1, MAX_HEADING_LEVEL),
        content: takeInline(cursor),
      };
    case 'paragraph_open':
      return { kind: BlockKind.PARAGRAPH, content: takeInline(cursor) };
    case 'bullet_list_open':
    case 'ordered_list_open':
      return {
        kind: BlockKind.LIST,
        ordered: token.type === 'ordered_list_open',
        start: Number(attribute(token, 'start') ?? 1) || 1,
        items: parseListItems(cursor, token.type.replace('_open', '_close')),
      };
    case 'fence':
    case 'code_block':
      return {
        kind: BlockKind.CODE,
        language: codeLanguage(token.info),
        text: token.content.replace(/\n$/u, ''),
      };
    case 'blockquote_open':
      return { kind: BlockKind.QUOTE, blocks: parseBlocks(cursor, 'blockquote_close') };
    case 'table_open':
      return parseTable(cursor);
    case 'hr':
      return { kind: BlockKind.RULE };
    default:
      return null;
  }
}

/** The inline token after an opening token, and past its closing token. */
function takeInline(cursor: TokenCursor): InlineNode[] {
  const inline = cursor.tokens[cursor.index];
  cursor.index += 2;
  return parseInline(inline?.children ?? []);
}

function parseListItems(cursor: TokenCursor, closeType: string): DocumentBlock[][] {
  const items: DocumentBlock[][] = [];
  while (cursor.index < cursor.tokens.length) {
    const token = cursor.tokens[cursor.index];
    cursor.index += 1;
    if (token === undefined || token.type === closeType) {
      break;
    }
    if (token.type === 'list_item_open') {
      items.push(parseBlocks(cursor, 'list_item_close'));
    }
  }
  return items;
}

function parseTable(cursor: TokenCursor): TableBlock {
  const table: TableBlock = { kind: BlockKind.TABLE, aligns: [], header: [], rows: [] };
  let row: InlineNode[][] = [];
  let inHead = false;
  while (cursor.index < cursor.tokens.length) {
    const token = cursor.tokens[cursor.index];
    cursor.index += 1;
    if (token === undefined || token.type === 'table_close') {
      break;
    }
    if (token.type === 'thead_open') {
      inHead = true;
    } else if (token.type === 'thead_close') {
      inHead = false;
    } else if (token.type === 'tr_open') {
      row = [];
    } else if (token.type === 'tr_close') {
      if (inHead) {
        table.header = row;
      } else {
        table.rows.push(row);
      }
    } else if (token.type === 'th_open' || token.type === 'td_open') {
      if (inHead) {
        table.aligns.push(cellAlign(attribute(token, 'style')));
      }
      row.push(takeInline(cursor));
    }
  }
  return table;
}

function cellAlign(style: string | null): TableAlign {
  if (style?.includes('center') === true) {
    return TableAlign.CENTER;
  }
  if (style?.includes('right') === true) {
    return TableAlign.RIGHT;
  }
  if (style?.includes('left') === true) {
    return TableAlign.LEFT;
  }
  return TableAlign.NONE;
}

function codeLanguage(info: string): string | null {
  const language = info.trim().split(/\s/u)[0] ?? '';
  return CODE_LANGUAGE_PATTERN.test(language) ? language : null;
}

/**
 * Inline tokens as nodes. Emphasis nests by counting open markers; a link
 * collects its children until it closes.
 */
function parseInline(tokens: MarkdownToken[]): InlineNode[] {
  const root: InlineNode[] = [];
  const containers: InlineNode[][] = [root];
  const links: LinkNode[] = [];
  const depth = { bold: 0, italic: 0, strike: 0 };
  const target = (): InlineNode[] => containers.at(-1) ?? root;
  const marks = (code: boolean): InlineMarks => ({
    bold: depth.bold > 0,
    italic: depth.italic > 0,
    strike: depth.strike > 0,
    code,
  });

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        target().push({ kind: InlineKind.TEXT, text: token.content, marks: marks(false) });
        break;
      case 'code_inline':
        target().push({ kind: InlineKind.TEXT, text: token.content, marks: marks(true) });
        break;
      case 'softbreak':
        target().push({ kind: InlineKind.TEXT, text: ' ', marks: marks(false) });
        break;
      case 'hardbreak':
        target().push({ kind: InlineKind.BREAK });
        break;
      case 'strong_open':
      case 'strong_close':
        depth.bold += token.nesting;
        break;
      case 'em_open':
      case 'em_close':
        depth.italic += token.nesting;
        break;
      case 's_open':
      case 's_close':
        depth.strike += token.nesting;
        break;
      case 'image':
        target().push({ kind: InlineKind.TEXT, text: token.content, marks: marks(false) });
        break;
      case 'link_open': {
        const link: LinkNode = {
          kind: InlineKind.LINK,
          href: attribute(token, 'href') ?? '',
          children: [],
        };
        links.push(link);
        containers.push(link.children);
        break;
      }
      case 'link_close': {
        containers.pop();
        const link = links.pop();
        if (link !== undefined) {
          const href = safeHref(link.href);
          if (href === null) {
            target().push(...link.children);
          } else {
            target().push({ ...link, href });
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return root;
}

/** A token attribute as text (markdown-it types allow numbers). */
function attribute(token: MarkdownToken, name: string): string | null {
  const value = token.attrGet(name);
  return value === null ? null : String(value);
}
