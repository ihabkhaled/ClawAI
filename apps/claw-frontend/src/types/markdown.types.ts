import type { MessageCitation } from './chat.types';

export type MarkdownRendererProps = {
  content: string;
  /**
   * The sources the answer was written from, numbered as the model saw them.
   * When present, an inline `[n]` with a matching entry becomes a citation
   * link; any other `[n]` stays plain text.
   */
  citations?: readonly MessageCitation[];
};

/** The slice of the markdown AST the citation plugin reads and writes. */
export type MarkdownAstNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownAstNode[];
};

export type RemarkCitationsOptions = {
  /** Highest `[n]` that may become a link; 0 turns the plugin off. */
  count: number;
};

export type CitationLinkProps = {
  citation: MessageCitation;
  children: React.ReactNode;
};
