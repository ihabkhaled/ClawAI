import { useCallback, useMemo, useState } from 'react';

import { useArchiveThread } from '@/hooks/chat/use-archive-thread';
import { useCreateThread } from '@/hooks/chat/use-create-thread';
import { usePinThread } from '@/hooks/chat/use-pin-thread';
import { useVirtualizedThreads } from '@/hooks/chat/use-virtualized-threads';
import { useDebounce } from '@/hooks/common/use-debounce';
import type { ChatPageReturn } from '@/types';
import { logger } from '@/utilities';

export function useChatPage(): ChatPageReturn {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const virtualizedThreads = useVirtualizedThreads({ search: debouncedSearch });
  const { createThread, isPending: isCreating } = useCreateThread();
  const { pinThread, isPending: isPinPending } = usePinThread();
  const { archiveThread, isPending: isArchivePending } = useArchiveThread();
  const [showArchived, setShowArchived] = useState(false);

  const filteredThreads = useMemo(
    () =>
      showArchived
        ? virtualizedThreads.threads
        : virtualizedThreads.threads.filter((t) => !t.isArchived),
    [virtualizedThreads.threads, showArchived],
  );

  const pinnedThreads = useMemo(() => filteredThreads.filter((t) => t.isPinned), [filteredThreads]);

  const unpinnedThreads = useMemo(
    () => filteredThreads.filter((t) => !t.isPinned),
    [filteredThreads],
  );

  const toggleShowArchived = useCallback((): void => {
    setShowArchived((prev) => {
      logger.debug({ component: 'chat', action: 'toggle-archived', message: 'Toggled archived view', details: { showArchived: !prev } });
      return !prev;
    });
  }, []);

  const handleNewChat = useCallback((): void => {
    logger.info({ component: 'chat', action: 'new-chat', message: 'User creating new chat thread' });
    createThread({});
  }, [createThread]);

  const handlePin = useCallback(
    (id: string, isPinned: boolean): void => {
      pinThread({ id, isPinned });
    },
    [pinThread],
  );

  const handleArchive = useCallback(
    (id: string, isArchived: boolean): void => {
      archiveThread({ id, isArchived });
    },
    [archiveThread],
  );

  return {
    pinnedThreads,
    unpinnedThreads,
    allThreads: filteredThreads,
    isLoading: virtualizedThreads.isLoading,
    isFetchingNextPage: virtualizedThreads.isFetchingNextPage,
    hasNextPage: virtualizedThreads.hasNextPage,
    fetchNextPage: virtualizedThreads.fetchNextPage,
    search,
    setSearch,
    showArchived,
    toggleShowArchived,
    handleNewChat,
    isCreating,
    handlePin,
    handleArchive,
    isPinPending,
    isArchivePending,
  };
}
