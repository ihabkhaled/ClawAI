import type { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { THREAD_ARTICLE_MAX_RENDER_CHARS } from '@/constants/thread-article.constants';
import { rehypeThreadHeadings } from '@/lib/markdown/rehype-thread-headings';
import { createThreadArticleComponents } from '@/lib/markdown/thread-article-components';
import type { ThreadArticleMarkdownProps } from '@/types/thread-article.types';

/**
 * Renders a Thread article as rich, safe HTML. Safety is structural, not a blocklist: raw HTML in
 * the source is dropped (`skipHtml`, and no `rehype-raw` anywhere), images are never loaded (an
 * alt-text placeholder renders instead), every link is scheme-checked, and a character cap bounds
 * the work. The page owns the one h1; the body starts at h2.
 */
export function ThreadArticleMarkdown({
  markdown,
  title,
  labels,
  truncatedLabel,
}: ThreadArticleMarkdownProps): ReactElement {
  const truncated = markdown.length > THREAD_ARTICLE_MAX_RENDER_CHARS;
  const body = truncated ? markdown.slice(0, THREAD_ARTICLE_MAX_RENDER_CHARS) : markdown;
  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeThreadHeadings, { title }]]}
        skipHtml
        components={createThreadArticleComponents(labels)}
      >
        {body}
      </ReactMarkdown>
      {truncated ? (
        <p className="text-muted-foreground mt-1 text-xs italic">{truncatedLabel}</p>
      ) : null}
    </>
  );
}
