import { Archive, ArchiveRestore, MoreVertical, Pin, PinOff } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import type { ThreadListItemProps } from '@/types';
import { formatRelativeDate } from '@/utilities';

import { RoutingBadge } from './routing-badge';

export function ThreadListItem({
  thread,
  isActive,
  onPin,
  onArchive,
  isPinPending,
  isArchivePending,
}: ThreadListItemProps) {
  const messageCount = thread._count?.messages ?? 0;
  const hasActions = onPin !== undefined || onArchive !== undefined;

  const handlePin = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    onPin?.(thread.id, !thread.isPinned);
  };

  const handleArchive = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    onArchive?.(thread.id, !thread.isArchived);
  };

  return (
    <Link
      href={ROUTES.CHAT_THREAD(thread.id)}
      className={cn(
        'group flex flex-col gap-1 rounded-lg border p-3 transition-colors hover:bg-accent',
        isActive && 'border-primary bg-accent',
        thread.isArchived && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {thread.isPinned ? <Pin className="h-3 w-3 shrink-0 text-primary" /> : null}
          <span className="truncate text-sm font-medium">{thread.title ?? 'Untitled'}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(thread.updatedAt)}
          </span>
          {hasActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label="Thread actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onPin !== undefined ? (
                  <DropdownMenuItem
                    onClick={handlePin}
                    disabled={isPinPending}
                  >
                    {thread.isPinned ? (
                      <>
                        <PinOff className="me-2 h-4 w-4" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="me-2 h-4 w-4" />
                        Pin
                      </>
                    )}
                  </DropdownMenuItem>
                ) : null}
                {onArchive !== undefined ? (
                  <DropdownMenuItem
                    onClick={handleArchive}
                    disabled={isArchivePending}
                  >
                    {thread.isArchived ? (
                      <>
                        <ArchiveRestore className="me-2 h-4 w-4" />
                        Unarchive
                      </>
                    ) : (
                      <>
                        <Archive className="me-2 h-4 w-4" />
                        Archive
                      </>
                    )}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
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
