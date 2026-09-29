'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { MARKDOWN_SANITIZE_SCHEMA } from '@/constants/markdown-sanitize.constants';
import { NO_CITATIONS } from '@/constants/message-citation.constants';
import type { MarkdownRendererProps } from '@/types';
import { sameCitations } from '@/utilities/message-citation.utility';

import { CitationsContext } from './citations-context';
import { markdownComponents } from './markdown-components';
import { remarkCitations } from './remark-citations';

// Memoized: every MessageBubble in a long thread re-renders on parent state
// changes (typing in the composer, feedback toggle, etc.). Re-parsing markdown
// + re-running rehype-highlight on every keystroke is the dominant cost in
// react-profiler traces of /chat/[threadId]. Re-renders only when `content`
// actually changes (the default shallow-equal compare on a single string
// prop is sufficient).
//
// Plugin order is load-bearing: rehype-raw parses model-written HTML
// (<details>, <kbd>, …) into elements, rehype-sanitize then applies the
// allowlist in MARKDOWN_SANITIZE_SCHEMA to the WHOLE tree, and only then does
// rehype-highlight add its hljs classes — running it before sanitize would
// have every highlight class stripped. This one renderer serves every chat
// mode (message bubble, compare, parallel, escalation, judge, answer dialog);
// public share pages deliberately use PublicMarkdownRenderer, which parses no
// HTML at all.
function MarkdownRendererBase({
  content,
  citations = NO_CITATIONS,
}: MarkdownRendererProps): React.JSX.Element {
  // `[n]` becomes a link only for a number this answer actually stored
  // (ADR-132). With no citations the plugin list is exactly what it was.
  const remarkPlugins = useMemo(
    () =>
      citations.length === 0
        ? [remarkGfm]
        : [remarkGfm, [remarkCitations, { count: Math.max(...citations.map((c) => c.index)) }]],
    [citations],
  );
  return (
    <CitationsContext.Provider value={citations}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins as Parameters<typeof ReactMarkdown>[0]['remarkPlugins']}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA], rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </CitationsContext.Provider>
  );
}

export const MarkdownRenderer = memo(
  MarkdownRendererBase,
  (previous, next) =>
    previous.content === next.content && sameCitations(previous.citations, next.citations),
);
