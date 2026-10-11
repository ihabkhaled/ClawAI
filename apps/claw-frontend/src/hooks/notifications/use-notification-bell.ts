import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import {
  NOTIFICATIONS_PAGE_SIZE,
  NOTIFICATIONS_STALE_MS,
  NOTIFICATIONS_UNREAD_POLL_MS,
} from '@/constants/notifications.constants';
import { useTranslation } from '@/lib/i18n';
import { notificationsRepository } from '@/repositories/notifications/notifications.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { UseNotificationBellReturn } from '@/types/notifications-ui.types';
import type { NotificationItem } from '@/types/notifications.types';
import { localisePath } from '@/utilities/locale.utility';
import { buildNotificationRowText } from '@/utilities/notification-text.utility';

/**
 * The bell in the top bar: an unread badge that refreshes while the tab is visible (and on
 * focus), and the list itself, fetched only when the panel is open. Opening a notification marks
 * it read and goes to its page.
 */
export function useNotificationBell(): UseNotificationBellReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [isOpen, setOpen] = useState(false);

  const unread = useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: ({ signal }) => notificationsRepository.list(null, 1, signal),
    enabled: isAuthenticated,
    staleTime: NOTIFICATIONS_STALE_MS,
    // A hidden tab does not poll; a visible one asks once a minute.
    refetchInterval: () =>
      document.visibilityState === 'visible' ? NOTIFICATIONS_UNREAD_POLL_MS : false,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const list = useInfiniteQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ pageParam, signal }) =>
      notificationsRepository.list(pageParam, NOTIFICATIONS_PAGE_SIZE, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated && isOpen,
    retry: 1,
  });

  const refreshAll = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }, [queryClient]);

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsRepository.markRead(id),
    onSuccess: refreshAll,
  });
  const markAll = useMutation({
    mutationFn: () => notificationsRepository.markAllRead(),
    onSuccess: refreshAll,
  });

  const items = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);

  const select = useCallback(
    (item: NotificationItem): void => {
      if (item.readAt === null) {
        markRead.mutate(item.id);
      }
      setOpen(false);
      router.push(localisePath(item.link, locale));
    },
    [markRead, router, locale],
  );

  const loadMore = useCallback((): void => {
    if (list.hasNextPage && !list.isFetchingNextPage) {
      void list.fetchNextPage();
    }
  }, [list]);

  const retry = useCallback((): void => {
    void list.refetch();
  }, [list]);

  const rowText = useCallback(
    (item: NotificationItem) => buildNotificationRowText(item, t, locale, Date.now()),
    [t, locale],
  );

  return {
    unreadCount: unread.data?.unreadCount ?? 0,
    items,
    isOpen,
    isLoading: list.isLoading,
    isError: list.isError,
    hasMore: list.hasNextPage,
    isLoadingMore: list.isFetchingNextPage,
    setOpen,
    select,
    markAllRead: () => markAll.mutate(),
    loadMore,
    retry,
    rowText,
  };
}
