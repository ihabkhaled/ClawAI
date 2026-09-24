'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { MARKDOWN_SANITIZE_SCHEMA } from '@/constants/markdown-sanitize.constants';
import type { MarkdownRendererProps } from '@/types';

import { markdownComponents } from './markdown-components';

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
function MarkdownRendererBase({ content }: MarkdownRendererProps): React.JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA], rehypeHighlight]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererBase);
