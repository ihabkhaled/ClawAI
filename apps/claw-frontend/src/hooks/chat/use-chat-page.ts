import { useMemo, useState, useCallback } from 'react';

import { useArchiveThread } from '@/hooks/chat/use-archive-thread';
import { useCreateThread } from '@/hooks/chat/use-create-thread';
import { usePinThread } from '@/hooks/chat/use-pin-thread';
import { useThreads } from '@/hooks/chat/use-threads';
import type { ChatPageReturn } from '@/types';

export function useChatPage(): ChatPageReturn {
  const { threads, isLoading, search, setSearch } = useThreads();
  const { createThread, isPending: isCreating } = useCreateThread();
  const { pinThread, isPending: isPinPending } = usePinThread();
  const { archiveThread, isPending: isArchivePending } = useArchiveThread();
  const [showArchived, setShowArchived] = useState(false);

  const filteredThreads = useMemo(
    () => (showArchived ? threads : threads.filter((t) => !t.isArchived)),
    [threads, showArchived],
  );

  const pinnedThreads = useMemo(() => filteredThreads.filter((t) => t.isPinned), [filteredThreads]);

  const unpinnedThreads = useMemo(
    () => filteredThreads.filter((t) => !t.isPinned),
    [filteredThreads],
  );

  const toggleShowArchived = useCallback((): void => {
    setShowArchived((prev) => !prev);
  }, []);

  const handleNewChat = useCallback((): void => {
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
    isLoading,
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
