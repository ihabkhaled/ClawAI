import { useCallback, useMemo, useState } from 'react';

import { COMPOSER_SEED_STORAGE_KEY } from '@/constants/chat.constants';
import { ChatThreadListTab } from '@/enums';
import { useArchiveThread } from '@/hooks/chat/use-archive-thread';
import { useCreateThread } from '@/hooks/chat/use-create-thread';
import { usePinThread } from '@/hooks/chat/use-pin-thread';
import { useVirtualizedThreads } from '@/hooks/chat/use-virtualized-threads';
import { useDebounce } from '@/hooks/common/use-debounce';
import { useTranslation } from '@/lib/i18n';
import type { ChatPageReturn, SuggestedPrompt } from '@/types';
import { logger } from '@/utilities';

export function useChatPage(): ChatPageReturn {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { t } = useTranslation();

  const virtualizedThreads = useVirtualizedThreads({ search: debouncedSearch });
  const { createThread, isPending: isCreating } = useCreateThread();
  const { pinThread, isPending: isPinPending } = usePinThread();
  const { archiveThread, isPending: isArchivePending } = useArchiveThread();
  const [activeTab, setActiveTab] = useState<ChatThreadListTab>(ChatThreadListTab.ALL);

  // `showArchived` is preserved on the return type so existing call-sites
  // and tests stay compatible — under the hood it is now driven entirely by
  // `activeTab === ARCHIVED`. The toggle helper maps onto the tab switch.
  const showArchived = activeTab === ChatThreadListTab.ARCHIVED;

  // Tab-driven filtering. Each tab is a strict subset of all loaded threads:
  //   - ALL: pinned + unpinned (no archived)
  //   - PINNED: only `isPinned` (and not archived)
  //   - ARCHIVED: only `isArchived`
  // The BE response already includes archived threads (the legacy "show
  // archived" toggle was a pure client filter), so this is gated entirely
  // here without changing the network shape.
  const filteredThreads = useMemo(() => {
    const list = virtualizedThreads.threads;
    switch (activeTab) {
      case ChatThreadListTab.PINNED:
        return list.filter((thread) => thread.isPinned && !thread.isArchived);
      case ChatThreadListTab.ARCHIVED:
        return list.filter((thread) => thread.isArchived);
      case ChatThreadListTab.ALL:
      default:
        return list.filter((thread) => !thread.isArchived);
    }
  }, [virtualizedThreads.threads, activeTab]);

  const pinnedThreads = useMemo(() => filteredThreads.filter((t) => t.isPinned), [filteredThreads]);

  const unpinnedThreads = useMemo(
    () => filteredThreads.filter((t) => !t.isPinned),
    [filteredThreads],
  );

  const toggleShowArchived = useCallback((): void => {
    setActiveTab((prev) => {
      const next = prev === ChatThreadListTab.ARCHIVED ? ChatThreadListTab.ALL : ChatThreadListTab.ARCHIVED;
      logger.debug({
        component: 'chat',
        action: 'toggle-archived',
        message: 'Toggled archived tab',
        details: { from: prev, to: next },
      });
      return next;
    });
  }, []);

  const handleNewChat = useCallback((): void => {
    logger.info({ component: 'chat', action: 'new-chat', message: 'User creating new chat thread' });
    createThread({});
  }, [createThread]);

  // Suggested-prompt empty-state buttons. We resolve the prompt body via
  // `t()` so it lands in the right language, then write the seed text to
  // localStorage under `chat:nextComposerSeed` for the new-thread page to
  // consume on first render. Falling back to a thread create with no
  // payload keeps the flow working even if storage is unavailable
  // (private-mode browsers).
  const handleSuggestedPrompt = useCallback(
    (prompt: SuggestedPrompt): void => {
      const seed = t(prompt.prompt);
      try {
        window.localStorage.setItem(COMPOSER_SEED_STORAGE_KEY, seed);
      } catch (error) {
        logger.warn({
          component: 'chat',
          action: 'suggested-prompt-seed',
          message: 'localStorage write failed; suggested prompt seed will be skipped',
          details: { error: (error as Error).message },
        });
      }
      logger.info({
        component: 'chat',
        action: 'suggested-prompt',
        message: 'User selected suggested prompt',
        details: { promptId: prompt.id },
      });
      createThread({});
    },
    [createThread, t],
  );

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
    activeTab,
    setActiveTab,
    handleNewChat,
    handleSuggestedPrompt,
    isCreating,
    handlePin,
    handleArchive,
    isPinPending,
    isArchivePending,
  };
}
