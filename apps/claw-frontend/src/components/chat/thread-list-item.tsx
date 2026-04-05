import Link from 'next/link';

import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import type { ThreadListItemProps } from '@/types';
import { formatRelativeDate } from '@/utilities';

import { RoutingBadge } from './routing-badge';

export function ThreadListItem({ thread, isActive }: ThreadListItemProps) {
  const messageCount = thread._count?.messages ?? 0;

  return (
    <Link
      href={ROUTES.CHAT_THREAD(thread.id)}
      className={cn(
        'flex flex-col gap-1 rounded-lg border p-3 transition-colors hover:bg-accent',
        isActive && 'border-primary bg-accent',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{thread.title ?? 'Untitled'}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeDate(thread.updatedAt)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <RoutingBadge mode={thread.routingMode} />
        <span className="text-xs text-muted-foreground">
          {messageCount} {messageCount === 1 ? 'message' : 'messages'}
        </span>
      </div>
    </Link>
  );
}
