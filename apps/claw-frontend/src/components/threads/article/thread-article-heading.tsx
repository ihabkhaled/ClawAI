import type { ReactElement } from 'react';

import { ThreadHeadingCopyLink } from '@/components/threads/article/thread-heading-copy-link';
import { cn } from '@/lib/utils';
import type { ThreadArticleHeadingProps } from '@/types/thread-article.types';

/** An H2 or H3 of the article body: an anchor id, a scroll offset under the header, a copy link. */
export function ThreadArticleHeading({
  level,
  id,
  labels,
  children,
}: ThreadArticleHeadingProps): ReactElement {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <Tag
      id={id}
      className={cn(
        'group scroll-mt-24 font-semibold tracking-tight text-balance',
        level === 2 ? 'mt-10 mb-3 border-b pb-2 text-2xl' : 'mt-8 mb-2 text-xl',
      )}
    >
      {children}
      {id ? (
        <ThreadHeadingCopyLink id={id} label={labels.copyLink} copiedLabel={labels.linkCopied} />
      ) : null}
    </Tag>
  );
}
