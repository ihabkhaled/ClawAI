import type { MessageCitation } from '@/types';

/** Href prefix the citation plugin writes; the anchor renderer reads it back. */
export const CITATION_HREF_PREFIX = '#cite-';

/**
 * `[n]` in answer text. Up to three digits — the research block never prints
 * more than 50 sources — and nothing else inside the brackets.
 */
export const CITATION_MARKER_PATTERN = /\[(\d{1,3})\]/g;

/**
 * An href the plugin wrote, with or without the `user-content-` prefix the
 * sanitizer may add to fragment links.
 */
export const CITATION_HREF_PATTERN = /^#(?:user-content-)?cite-(\d{1,3})$/;

/** Only these schemes ever become a clickable source. */
export const CITATION_SAFE_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/** AST nodes whose text must never be rewritten (code, existing links). */
export const CITATION_SKIPPED_NODE_TYPES: readonly string[] = [
  'code',
  'inlineCode',
  'link',
  'linkReference',
  'definition',
  'html',
];

/** Shared empty list, so an answer without sources keeps a stable prop. */
export const NO_CITATIONS: readonly MessageCitation[] = [];
