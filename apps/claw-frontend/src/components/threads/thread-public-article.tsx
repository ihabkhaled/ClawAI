import type { ReactElement } from 'react';

import { PublicMarkdownRenderer } from '@/components/chat-shares/public-markdown-renderer';
import type { ThreadPublicArticleProps } from '@/types/thread-publication.types';
import { safeThreadCitationUrl } from '@/utilities/thread-citation.utility';

export function ThreadPublicArticle({
  publication,
  truncatedLabel,
  citationsLabel,
  publishedLabel,
  viewsLabel,
}: ThreadPublicArticleProps): ReactElement {
  const citations = publication.content.citations
    .map((citation) => ({ ...citation, safeUrl: safeThreadCitationUrl(citation.url) }))
    .filter((citation) => citation.safeUrl !== null);

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
      <div className="thread-publication-content min-w-0 break-words">
        <PublicMarkdownRenderer
          content={publication.content.markdown}
          truncatedLabel={truncatedLabel}
        />
      </div>
      {citations.length > 0 ? (
        <section aria-labelledby="thread-public-citations-title" className="mt-8 border-t pt-5">
          <h2 id="thread-public-citations-title" className="mb-3 text-lg font-semibold">
            {citationsLabel}
          </h2>
          <ol className="list-inside list-decimal space-y-2">
            {citations.map(({ url, safeUrl }) => (
              <li key={url} className="break-all">
                <a
                  href={safeUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
