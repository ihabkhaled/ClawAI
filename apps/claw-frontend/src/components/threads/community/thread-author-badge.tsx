import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ThreadAuthorBadgeProps } from '@/types/thread-community.types';
import { authorInitials } from '@/utilities/thread-mention.utility';

/** An initials circle, the display name and `@username`. A missing author reads as "Member". */
export function ThreadAuthorBadge({
  author,
  compact = false,
}: ThreadAuthorBadgeProps): ReactElement {
  const { t } = useTranslation();
  const name = author?.displayName.trim() || author?.username || t('chat.threadCommunityMember');
  return (
    <span className="inline-flex min-w-0 items-center gap-2" data-testid="thread-author">
      <span
        aria-hidden="true"
        className={cn(
          'bg-primary/10 text-primary flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
          compact ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs',
        )}
      >
        {authorInitials(author)}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span dir="auto" className="truncate text-sm font-medium">
          {name}
        </span>
        {author ? (
          <span dir="ltr" className="text-muted-foreground truncate text-start text-xs">
            @{author.username}
          </span>
        ) : null}
      </span>
    </span>
  );
}
