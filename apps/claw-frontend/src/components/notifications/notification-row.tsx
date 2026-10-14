import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { NOTIFICATION_KIND_ICONS } from '@/constants/thread-community.constants';
import { cn } from '@/lib/utils';
import type { NotificationRowProps } from '@/types/notifications-ui.types';

/** One notification: what happened, a line of detail, the Thread's title and when. */
export function NotificationRow({ item, text, onSelect }: NotificationRowProps): ReactElement {
  const isUnread = item.readAt === null;
  const KindIcon = NOTIFICATION_KIND_ICONS[text.kind];
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(item)}
      data-testid="notification-row"
      data-unread={isUnread ? 'true' : 'false'}
      className={cn(
        'h-auto w-full flex-col items-start gap-0.5 rounded-none border-b px-3 py-2.5 text-start whitespace-normal',
        isUnread ? 'bg-primary/5' : '',
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span
          className={cn(
            'flex items-start gap-2 text-sm',
            isUnread ? 'font-semibold' : 'font-medium',
          )}
        >
          <KindIcon className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span dir="auto" className="min-w-0 [overflow-wrap:anywhere] break-words">
            {text.title}
          </span>
        </span>
        {isUnread ? (
          <span
            className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full"
            aria-hidden="true"
            data-testid="notification-unread-dot"
          />
        ) : null}
      </span>
      {text.subject === null ? null : (
        <span className="text-foreground/80 w-full truncate text-xs">{text.subject}</span>
      )}
      <span
        dir="auto"
        className="text-muted-foreground w-full text-xs font-normal [overflow-wrap:anywhere] break-words"
      >
        {text.body}
      </span>
      <span className="text-muted-foreground text-[11px] font-normal">{text.when}</span>
    </Button>
  );
}
