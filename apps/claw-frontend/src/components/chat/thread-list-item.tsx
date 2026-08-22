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
  const previewSnippet = buildThreadPreviewSnippet(thread.lastProvider, thread.lastModel);

  return (
    <div
      className={cn(
        'group relative rounded-lg border transition-colors hover:bg-accent',
        isActive && 'border-primary bg-accent',
        thread.isArchived && 'opacity-60',
      )}
    >
      <Link href={ROUTES.CHAT_THREAD(thread.id)} className="block min-h-11 p-3 pe-14">
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
          <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeDate(thread.updatedAt)}</span>
        </div>
        {previewSnippet !== null ? <p className="mt-1 truncate text-xs text-muted-foreground">{previewSnippet}</p> : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          <RoutingBadge mode={thread.routingMode} />
          <span className="text-xs text-muted-foreground">{messageCount}</span>
        </div>
      </Link>

      {hasActions ? (
        <div className="absolute top-1 end-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                aria-label={t('chat.threadActions')}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onPin !== undefined ? (
                <DropdownMenuItem onClick={() => onPin(thread.id, !thread.isPinned)} disabled={isPinPending}>
                  {thread.isPinned ? <PinOff className="me-2 h-4 w-4" /> : <Pin className="me-2 h-4 w-4" />}
                  {thread.isPinned ? t('chat.unpinThread') : t('chat.pinThread')}
                </DropdownMenuItem>
              ) : null}
              {onArchive !== undefined ? (
                <DropdownMenuItem onClick={() => onArchive(thread.id, !thread.isArchived)} disabled={isArchivePending}>
                  {thread.isArchived ? <ArchiveRestore className="me-2 h-4 w-4" /> : <Archive className="me-2 h-4 w-4" />}
                  {thread.isArchived ? t('chat.unarchiveThread') : t('chat.archiveThread')}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}
