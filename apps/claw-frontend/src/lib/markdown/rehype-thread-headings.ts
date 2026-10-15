import type { ThreadHastNode } from '@/types/thread-article.types';
import { sameHeadingText } from '@/utilities/thread-article-toc.utility';
import { createHeadingSlugger } from '@/utilities/thread-heading-slug.utility';

const HEADING_TAGS: Readonly<Record<string, number>> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

export function hastText(node: ThreadHastNode): string {
  if (node.type === 'text') {
    return node.value ?? '';
  }
  return (node.children ?? []).map(hastText).join('');
}

export type RehypeThreadHeadingsOptions = {
  /** The page's own H1; a first `# Title` equal to it is removed. */
  title?: string;
};

/**
 * Gives every top-level heading an anchor id in document order and keeps the page outline sane:
 * the first H1 that repeats the page title is dropped (the page already has its one h1), any
 * other H1 becomes an h2. The same rules are applied to the source text by `extractThreadToc`,
 * so the table of contents and the ids cannot disagree (a test walks both over the same inputs).
 */
export function rehypeThreadHeadings(options: RehypeThreadHeadingsOptions = {}) {
  return (tree: ThreadHastNode): void => {
    const slug = createHeadingSlugger();
    let firstHeading = true;
    const kept: ThreadHastNode[] = [];
    for (const node of tree.children ?? []) {
      const level = node.tagName ? HEADING_TAGS[node.tagName] : undefined;
      if (level === undefined) {
        kept.push(node);
        continue;
      }
      const text = hastText(node);
      const isFirst = firstHeading;
      firstHeading = false;
      if (level === 1 && isFirst && sameHeadingText(text, options.title)) {
        continue;
      }
      if (level === 1) {
        node.tagName = 'h2';
      }
      if (level <= 3) {
        node.properties = { ...node.properties, id: slug(text) };
      }
      kept.push(node);
    }
    tree.children = kept;
  };
}
