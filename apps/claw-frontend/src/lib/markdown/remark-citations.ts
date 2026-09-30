import {
  CITATION_MARKER_PATTERN,
  CITATION_SKIPPED_NODE_TYPES,
} from '@/constants/message-citation.constants';
import type { MarkdownAstNode, RemarkCitationsOptions } from '@/types/markdown.types';
import { citationHref } from '@/utilities/message-citation.utility';

/** Splits one text node into text and citation links. */
function splitText(node: MarkdownAstNode, count: number): MarkdownAstNode[] {
  const value = node.value ?? '';
  const parts: MarkdownAstNode[] = [];
  let last = 0;
  for (const match of value.matchAll(CITATION_MARKER_PATTERN)) {
    const index = Number(match[1]);
    if (index < 1 || index > count || match.index === undefined) {
      continue;
    }
    if (match.index > last) {
      parts.push({ type: 'text', value: value.slice(last, match.index) });
    }
    parts.push({
      type: 'link',
      url: citationHref(index),
      children: [{ type: 'text', value: String(index) }],
    });
    last = match.index + match[0].length;
  }
  if (parts.length === 0) {
    return [node];
  }
  if (last < value.length) {
    parts.push({ type: 'text', value: value.slice(last) });
  }
  return parts;
}

/** Rewrites `[n]` in text nodes, never inside code or an existing link. */
function rewrite(node: MarkdownAstNode, count: number): void {
  if (node.children === undefined || CITATION_SKIPPED_NODE_TYPES.includes(node.type)) {
    return;
  }
  node.children = node.children.flatMap((child) => {
    if (child.type === 'text') {
      return splitText(child, count);
    }
    rewrite(child, count);
    return [child];
  });
}

/**
 * remark plugin: an inline `[n]` becomes a link to citation n — but only when
 * 1 <= n <= count, i.e. only when the answer actually stored a source with
 * that number. Everything else stays exactly as written, so a model that
 * cites `[7]` with five sources gets plain text, never a fabricated link.
 */
export function remarkCitations(options: RemarkCitationsOptions): (tree: MarkdownAstNode) => void {
  return (tree) => {
    if (options.count > 0) {
      rewrite(tree, options.count);
    }
  };
}
