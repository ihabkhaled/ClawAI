import { Clock } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadArticleMarkdown } from '@/components/threads/article/thread-article-markdown';
import { ThreadArticleToc } from '@/components/threads/article/thread-article-toc';
import { THREAD_TOC_MIN_HEADINGS } from '@/constants/thread-article.constants';
import { cn } from '@/lib/utils';
import type { ThreadArticleBodyProps } from '@/types/thread-article.types';

/**
 * The article text: reading time, the text at a readable measure (about 70 characters) and, for an
 * article with three or more sections, a table of contents (a collapsible block on a phone, a
 * sticky column on a desktop). Layout uses logical properties, so a right-to-left article mirrors.
 */
export function ThreadArticleBody({
  toc,
  readingTimeLabel,
  ...markdown
}: ThreadArticleBodyProps): ReactElement {
  const showToc = toc.length >= THREAD_TOC_MIN_HEADINGS;
  return (
    <div
      className={cn(
        'thread-article min-w-0',
        showToc && 'lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10',
      )}
    >
      {showToc ? <ThreadArticleToc items={toc} label={markdown.labels.toc} /> : null}
      <div className="max-w-[70ch] min-w-0">
        <p className="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm">
          <Clock className="size-4" aria-hidden="true" />
          <span data-testid="thread-reading-time">{readingTimeLabel}</span>
        </p>
        <ThreadArticleMarkdown {...markdown} />
      </div>
    </div>
  );
}
