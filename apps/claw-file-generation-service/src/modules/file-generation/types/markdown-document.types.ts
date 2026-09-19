import type MarkdownIt from 'markdown-it';

import type { BlockKind, InlineKind, TableAlign } from '../enums/document-node.enum';

export type MarkdownToken = ReturnType<InstanceType<typeof MarkdownIt>['parse']>[number];

/** The parser's position in markdown-it's flat token list. */
export type TokenCursor = { tokens: MarkdownToken[]; index: number };

/**
 * A Markdown answer parsed once, so every format renders the same document
 * (F3, ADR-107). Renderers never see Markdown syntax, only these nodes.
 */

export type InlineMarks = {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strike: boolean;
};

export type TextNode = { kind: InlineKind.TEXT; text: string; marks: InlineMarks };
export type LinkNode = { kind: InlineKind.LINK; href: string; children: InlineNode[] };
export type BreakNode = { kind: InlineKind.BREAK };
export type InlineNode = TextNode | LinkNode | BreakNode;

export type HeadingBlock = { kind: BlockKind.HEADING; level: number; content: InlineNode[] };
export type ParagraphBlock = { kind: BlockKind.PARAGRAPH; content: InlineNode[] };
export type ListBlock = {
  kind: BlockKind.LIST;
  ordered: boolean;
  start: number;
  items: DocumentBlock[][];
};
export type CodeBlock = { kind: BlockKind.CODE; language: string | null; text: string };
export type QuoteBlock = { kind: BlockKind.QUOTE; blocks: DocumentBlock[] };
export type TableBlock = {
  kind: BlockKind.TABLE;
  aligns: TableAlign[];
  header: InlineNode[][];
  rows: InlineNode[][][];
};
export type RuleBlock = { kind: BlockKind.RULE };
export type DocumentBlock =
  HeadingBlock | ParagraphBlock | ListBlock | CodeBlock | QuoteBlock | TableBlock | RuleBlock;

/** What a renderer needs besides the blocks. */
export type DocumentMeta = {
  title: string;
  /** The document's main direction, from its first strong letters. */
  rtl: boolean;
};
