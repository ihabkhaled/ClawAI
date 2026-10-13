import type { ReactElement } from 'react';

import { ThreadReaderBody } from '@/components/threads/thread-reader-body';
import type { ThreadPublicArticleProps } from '@/types/thread-publication.types';

export function ThreadPublicArticle({
  publication,
  truncatedLabel,
  citationsLabel,
  publishedLabel,
  viewsLabel,
}: ThreadPublicArticleProps): ReactElement {
  return (
    <article className="border-border bg-card rounded-xl border p-5 sm:p-8">
      <header className="mb-6 flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{publication.title}</h1>
        <p className="text-muted-foreground text-sm">
          {publishedLabel}{' '}
          <time dateTime={publication.publishedAt}>{publication.publishedAt.slice(0, 10)}</time>
          {' · '}
          <span data-testid="thread-public-views">{viewsLabel}</span>
        </p>
      </header>
      <ThreadReaderBody
        markdown={publication.content.markdown}
        citations={publication.content.citations}
        truncatedLabel={truncatedLabel}
        citationsLabel={citationsLabel}
      />
    </article>
  );
}
