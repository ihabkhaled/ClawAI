'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

import type { MarkdownRendererProps } from '@/types';

import { markdownComponents } from './markdown-components';

// Memoized: every MessageBubble in a long thread re-renders on parent state
// changes (typing in the composer, feedback toggle, etc.). Re-parsing markdown
// + re-running rehype-highlight on every keystroke is the dominant cost in
// react-profiler traces of /chat/[threadId]. Re-renders only when `content`
// actually changes (the default shallow-equal compare on a single string
// prop is sufficient).
function MarkdownRendererBase({ content }: MarkdownRendererProps): React.JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererBase);
