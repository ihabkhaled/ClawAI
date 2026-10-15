'use client';

import { Check, Link2 } from 'lucide-react';
import type { ReactElement } from 'react';

import { useCopyHeadingLink } from '@/hooks/threads/use-copy-heading-link';
import type { ThreadHeadingCopyLinkProps } from '@/types/thread-article.types';

/** A permalink on a section heading: it moves the address bar to `#id` and copies the full address. */
export function ThreadHeadingCopyLink({
  id,
  label,
  copiedLabel,
}: ThreadHeadingCopyLinkProps): ReactElement {
  const { copied, copy } = useCopyHeadingLink(id);
  return (
    <a
      href={`#${id}`}
      onClick={copy}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      data-no-print
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring touch:size-11 touch:opacity-70 ms-2 inline-flex size-7 shrink-0 items-center justify-center rounded align-middle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Link2 className="size-4" aria-hidden="true" />
      )}
      <span role="status" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </a>
  );
}
