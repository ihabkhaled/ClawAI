import type { HtmlMetadata } from '../../../common/types/html-extract.types';

/** What every HTML-producing strategy extracts from a page, before truncation. */
export type PageContent = {
  title: string | null;
  /** Readability Markdown when an article was found, else the plain extracted text. */
  content: string;
  links: string[];
  metadata?: HtmlMetadata;
  /** True when `content` is Readability's article rather than the whole-page text. */
  readable: boolean;
};
