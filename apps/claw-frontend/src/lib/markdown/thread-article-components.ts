import { createElement } from 'react';
import type { Components } from 'react-markdown';

import { publicMarkdownComponents } from '@/components/chat-shares/public-markdown-components';
import { ThreadArticleCallout } from '@/components/threads/article/thread-article-callout';
import { ThreadArticleHeading } from '@/components/threads/article/thread-article-heading';
import {
  ThreadArticleAnchor,
  ThreadArticleList,
  ThreadArticleOrderedList,
  ThreadArticleParagraph,
  ThreadArticleQuote,
  ThreadArticleRule,
} from '@/components/threads/article/thread-article-prose';
import { ThreadArticleTable } from '@/components/threads/article/thread-article-table';
import type { ThreadArticleLabels, ThreadHastNode } from '@/types/thread-article.types';
import { calloutKindOf } from '@/utilities/thread-callout.utility';

type NodeProps = { node?: unknown; children?: React.ReactNode };

function asHast(node: unknown): ThreadHastNode | undefined {
  return typeof node === 'object' && node !== null ? (node as ThreadHastNode) : undefined;
}

/**
 * The element map for a Thread article. Built on the public-page map (no images, no raw HTML, safe
 * code blocks) with article typography, anchored headings, scrolling tables and callouts. Every
 * element here is a plain function of its props: nothing reads the DOM or the network.
 */
export function createThreadArticleComponents(labels: ThreadArticleLabels): Components {
  return {
    ...publicMarkdownComponents,
    a: ThreadArticleAnchor,
    p: ThreadArticleParagraph,
    ul: ThreadArticleList,
    ol: ThreadArticleOrderedList,
    hr: ThreadArticleRule,
    table: ThreadArticleTable,
    h2: ({ node: _node, children, id }: NodeProps & { id?: string }) =>
      createElement(ThreadArticleHeading, { level: 2, id, labels }, children),
    h3: ({ node: _node, children, id }: NodeProps & { id?: string }) =>
      createElement(ThreadArticleHeading, { level: 3, id, labels }, children),
    blockquote: ({ node, children }: NodeProps) => {
      const kind = calloutKindOf(asHast(node));
      return kind === null
        ? createElement(ThreadArticleQuote, null, children)
        : createElement(ThreadArticleCallout, { kind, labels }, children);
    },
  };
}
