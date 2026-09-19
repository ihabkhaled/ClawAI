/** Kinds of inline node in a parsed answer (F3, ADR-107). */
export enum InlineKind {
  TEXT = 'TEXT',
  LINK = 'LINK',
  BREAK = 'BREAK',
}

/** Kinds of block in a parsed answer. */
export enum BlockKind {
  HEADING = 'HEADING',
  PARAGRAPH = 'PARAGRAPH',
  LIST = 'LIST',
  CODE = 'CODE',
  QUOTE = 'QUOTE',
  TABLE = 'TABLE',
  RULE = 'RULE',
}

/** A table column's alignment; NONE when the Markdown gave none. */
export enum TableAlign {
  NONE = 'NONE',
  LEFT = 'LEFT',
  CENTER = 'CENTER',
  RIGHT = 'RIGHT',
}
