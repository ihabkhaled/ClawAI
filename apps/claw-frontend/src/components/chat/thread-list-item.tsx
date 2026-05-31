import { Archive, ArchiveRestore, MoreVertical, Pin, PinOff } from 'lucide-react';
import Link from 'next/link';

import { HighlightedText } from '@/components/common/highlighted-text';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ThreadListItemProps } from '@/types';
import { buildThreadPreviewSnippet, formatRelativeDate } from '@/utilities';

import { RoutingBadge } from './routing-badge';

export function ThreadListItem({
  thread,
  isActive,
  onPin,
  onArchive,
  isPinPending,
  isArchivePending,
  searchQuery,
}: ThreadListItemProps) {
  const { t } = useTranslation();
  const messageCount = thread._count?.messages ?? 0;
  const hasActions = onPin !== undefined || onArchive !== undefined;
  const title = thread.title ?? t('chat.untitled');
  // The BE doesn't expose a `lastMessage.content` on the thread list payload,
  // so we surface the most recent model identifier (provider/model) as the
  // preview snippet — this is what actually gives the user context about
  // which conversation it is.
  const previewSnippet = buildThreadPreviewSnippet(thread.lastProvider, thread.lastModel);

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
          <span className="truncate text-sm font-medium">
            {searchQuery !== undefined && searchQuery.trim().length > 0 ? (
              <HighlightedText text={title} query={searchQuery} />
            ) : (
              title
            )}
          </span>
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
                  aria-label={t('chat.threadActions')}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onPin !== undefined ? (
                  <DropdownMenuItem onClick={handlePin} disabled={isPinPending}>
                    {thread.isPinned ? (
                      <>
                        <PinOff className="me-2 h-4 w-4" />
                        {t('chat.unpinThread')}
                      </>
                    ) : (
                      <>
                        <Pin className="me-2 h-4 w-4" />
                        {t('chat.pinThread')}
                      </>
                    )}
                  </DropdownMenuItem>
                ) : null}
                {onArchive !== undefined ? (
                  <DropdownMenuItem onClick={handleArchive} disabled={isArchivePending}>
                    {thread.isArchived ? (
                      <>
                        <ArchiveRestore className="me-2 h-4 w-4" />
                        {t('chat.unarchiveThread')}
                      </>
                    ) : (
                      <>
                        <Archive className="me-2 h-4 w-4" />
                        {t('chat.archiveThread')}
                      </>
                    )}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {previewSnippet !== null ? (
        <p className="truncate text-xs text-muted-foreground">{previewSnippet}</p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <RoutingBadge mode={thread.routingMode} />
        <span className="text-xs text-muted-foreground">
          {messageCount} {messageCount === 1 ? 'message' : 'messages'}
        </span>
      </div>
    </Link>
  );
}
