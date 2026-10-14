import type { ReactElement } from 'react';

import { RelativeTime } from '@/components/shared/relative-time';
import { ThreadAuthorBadge } from '@/components/threads/community/thread-author-badge';
import { ThreadReaderBody } from '@/components/threads/thread-reader-body';
import type { ThreadPublicArticleProps } from '@/types/thread-publication.types';
import { threadContentDirection } from '@/utilities/thread-content-direction.utility';

export function ThreadPublicArticle({
  publication,
  truncatedLabel,
  citationsLabel,
  publishedLabel,
  viewsLabel,
}: ThreadPublicArticleProps): ReactElement {
  return (
    <article
      className="border-border bg-card rounded-xl border p-5 sm:p-8"
      lang={publication.contentLocale}
      dir={threadContentDirection(publication.contentLocale)}
    >
      <header className="mb-6 flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{publication.title}</h1>
        {publication.owner ? <ThreadAuthorBadge author={publication.owner} /> : null}
        <p className="text-muted-foreground text-sm">
          {publishedLabel} <RelativeTime value={publication.publishedAt} />
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
