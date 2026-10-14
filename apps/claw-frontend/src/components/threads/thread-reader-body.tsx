import type { ReactElement } from 'react';

import { PublicMarkdownRenderer } from '@/components/chat-shares/public-markdown-renderer';
import type { ThreadReaderBodyProps } from '@/types/thread-board-reader.types';
import { safeThreadCitationUrl } from '@/utilities/thread-citation.utility';
import { stripUnresolvedSourceMarkers } from '@/utilities/thread-source-marker.utility';

/** The rendered article text and its sources list, shared by the public page and the Board reader. */
export function ThreadReaderBody({
  markdown,
  citations,
  truncatedLabel,
  citationsLabel,
}: ThreadReaderBodyProps): ReactElement {
  const safeCitations = citations
    .map((citation) => ({ ...citation, safeUrl: safeThreadCitationUrl(citation.url) }))
    .filter((citation) => citation.safeUrl !== null);

  return (
    <>
      <div className="thread-publication-content min-w-0 break-words">
        <PublicMarkdownRenderer
          content={stripUnresolvedSourceMarkers(markdown)}
          truncatedLabel={truncatedLabel}
        />
      </div>
      {safeCitations.length > 0 ? (
        <section aria-labelledby="thread-public-citations-title" className="mt-8 border-t pt-5">
          <h2 id="thread-public-citations-title" className="mb-3 text-lg font-semibold">
            {citationsLabel}
          </h2>
          <ol className="list-inside list-decimal space-y-2">
            {safeCitations.map(({ url, safeUrl }) => (
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
    </>
  );
}
