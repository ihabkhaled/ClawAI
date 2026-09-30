'use client';

import type { CitationLinkProps } from '@/types/markdown.types';
import { citationHost, safeCitationUrl } from '@/utilities/message-citation.utility';

/**
 * An inline `[n]` that names its source: a small superscript chip whose
 * tooltip and accessible name carry the title and host. It opens the source
 * in a new tab — and only when the stored URL is http(s); otherwise it stays
 * a labelled, non-clickable chip rather than a link to somewhere unsafe.
 */
export function CitationLink({ citation, children }: CitationLinkProps): React.JSX.Element {
  const url = safeCitationUrl(citation.url);
  const host = citationHost(citation.url);
  const label = `${citation.title ?? host} — ${host}`;
  const chipClass =
    'bg-muted text-muted-foreground ms-0.5 inline-flex min-w-4 items-center justify-center rounded px-1 align-super text-[10px] leading-none font-medium no-underline';
  if (url === null) {
    return (
      <span className={chipClass} title={label} aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`${chipClass} hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`}
    >
      {children}
    </a>
  );
}
