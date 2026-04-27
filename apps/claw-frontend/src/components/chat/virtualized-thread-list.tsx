'use client';

import { Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { ThreadListItem } from '@/components/chat/thread-list-item';
import { useTranslation } from '@/lib/i18n';
import type { VirtualizedThreadListProps } from '@/types';

export function VirtualizedThreadList({
  threads,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onEndReached,
  onPin,
  onArchive,
  isPinPending,
  isArchivePending,
  search,
}: VirtualizedThreadListProps): React.ReactElement {
  const { t } = useTranslation();
  const itemContent = useCallback(
    (index: number): React.ReactElement => {
      const thread = threads[index];
      if (!thread) {
        return <div />;
      }
      return (
        <div className="pb-2">
          <ThreadListItem
            thread={thread}
            onPin={onPin}
            onArchive={onArchive}
            isPinPending={isPinPending}
            isArchivePending={isArchivePending}
          />
        </div>
      );
    },
    [threads, onPin, onArchive, isPinPending, isArchivePending],
  );

  const footerContent = useCallback((): React.ReactElement | null => {
    if (isFetchingNextPage) {
      return (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ms-2 text-xs text-muted-foreground">{t('chat.loadingMoreThreads')}</span>
        </div>
      );
    }
    if (!hasNextPage && threads.length > 0) {
      return null;
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, threads.length, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ms-2 text-sm text-muted-foreground">{t('chat.loadingThreads')}</span>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {search ? t('chat.noMatchingThreads') : t('chat.noThreads')}
      </div>
    );
  }

  return (
    <Virtuoso
      style={{ height: '100%' }}
      data={threads}
      totalCount={threads.length}
      itemContent={itemContent}
      endReached={onEndReached}
      overscan={200}
      components={{
        Footer: footerContent,
      }}
    />
  );
}
