'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { ThreadListItem } from '@/components/chat/thread-list-item';
import { THREAD_DATE_GROUP_LABEL_KEYS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { GroupedThreadListProps } from '@/types';
import { groupThreadsByDate } from '@/utilities';

export function GroupedThreadList({
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
}: GroupedThreadListProps): React.ReactElement {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // IntersectionObserver-driven infinite scroll. We watch a sentinel element
  // at the bottom of the scroll container; whenever it becomes visible (and we
  // have more pages and aren't already fetching), we ask the parent to load
  // the next page. This replaces Virtuoso's `endReached` because we render a
  // grouped layout with sticky headers instead of a flat virtual list.
  useEffect(() => {
    const root = containerRef.current;
    const target = sentinelRef.current;
    if (root === null || target === null) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            onEndReached();
          }
        }
      },
      { root, rootMargin: '200px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onEndReached]);

  const groups = useMemo(() => groupThreadsByDate(threads), [threads]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <span className="text-muted-foreground ms-2 text-sm">{t('chat.loadingThreads')}</span>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        {search.length > 0 ? t('chat.noMatchingThreads') : t('chat.noThreads')}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto pe-1">
      {groups.map((group) => (
        <section key={group.id} className="mb-3">
          <h3 className="bg-background/95 text-muted-foreground supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 -mx-1 mb-2 px-1 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur">
            {t(THREAD_DATE_GROUP_LABEL_KEYS[group.id])}
            {/*
              No opacity here. `text-muted-foreground` is tuned to sit just above
              the 4.5:1 floor, so knocking 30% off it put this count at 4.28:1 —
              and at 10px it is small text, which has no relaxed threshold to
              fall back on. Size alone keeps it subordinate to the group label.
            */}
            <span className="touch:text-xs ms-2 text-[10px] font-normal">
              {group.threads.length}
            </span>
          </h3>
          <div className="flex flex-col gap-2">
            {group.threads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                onPin={onPin}
                onArchive={onArchive}
                isPinPending={isPinPending}
                isArchivePending={isArchivePending}
                searchQuery={search}
              />
            ))}
          </div>
        </section>
      ))}
      <div ref={sentinelRef} aria-hidden="true" />
      {isFetchingNextPage ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          <span className="text-muted-foreground ms-2 text-xs">{t('chat.loadingMoreThreads')}</span>
        </div>
      ) : null}
    </div>
  );
}
