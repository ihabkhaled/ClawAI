import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { publicMarkdownComponents } from '@/components/chat-shares/public-markdown-components';
import { PUBLIC_MESSAGE_MAX_RENDER_CHARS } from '@/constants/public-share-render.constants';
import type { PublicMarkdownRendererProps } from '@/types';

/**
 * Renders one published message body.
 *
 * Three deliberate differences from the in-chat renderer:
 *
 * - **No `rehype-raw`.** react-markdown escapes HTML by default, so `<script>`,
 *   `<iframe>`, `onerror=`, inline `style`, and SVG payloads arrive as visible
 *   text. There is no sanitiser here because nothing unsanitised is ever parsed —
 *   which is a stronger guarantee than trusting a sanitiser's block-list.
 * - **No `rehype-highlight`.** Syntax highlighting walks every token of every code
 *   block; on a server-rendered page with a long conversation that is unbounded
 *   work on a request path a stranger can trigger. Code blocks stay readable
 *   without it.
 * - **A hard character cap.** A message containing a megabyte of nested emphasis
 *   is a denial-of-service against our own SSR, not just a slow page. Content past
 *   the cap is dropped and the truncation is stated, rather than silently losing
 *   text.
 *
 * This is a server component: no `'use client'`, no `memo`. Crawlers and
 * screen readers must receive the actual conversation text in the HTML response,
 * not an empty shell that hydrates later.
 */
export function PublicMarkdownRenderer({
  content,
  truncatedLabel,
}: PublicMarkdownRendererProps): React.ReactElement {
  const isTruncated = content.length > PUBLIC_MESSAGE_MAX_RENDER_CHARS;
  const body = isTruncated ? content.slice(0, PUBLIC_MESSAGE_MAX_RENDER_CHARS) : content;

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={publicMarkdownComponents}>
        {body}
      </ReactMarkdown>
      {isTruncated ? (
        <p className="text-muted-foreground mt-1 text-xs italic">{truncatedLabel}</p>
      ) : null}
    </>
  );
}
