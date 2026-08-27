'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useChatPage } from '@/hooks/chat/use-chat-page';
import type { UseThreadListDrawerReturn } from '@/types';

/**
 * Open/close state for the mobile thread drawer, over the same data the /chat
 * list uses.
 *
 * Reuses useChatPage rather than re-querying: the thread list, its pagination,
 * its pin and archive mutations and its search are already a controller, and a
 * second copy would drift from the first.
 */
export function useThreadListDrawer(): UseThreadListDrawerReturn {
  const [isOpen, setOpen] = useState(false);
  const pathname = usePathname();
  const chat = useChatPage();

  // Close on navigation. Picking a thread from the drawer is a route change, and
  // a sheet still covering the conversation you just chose is the obvious bug.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return {
    isOpen,
    setOpen,
    threads: chat.allThreads,
    isLoading: chat.isLoading,
    isFetchingNextPage: chat.isFetchingNextPage,
    hasNextPage: chat.hasNextPage,
    fetchNextPage: chat.fetchNextPage,
    search: chat.search,
    setSearch: chat.setSearch,
    handlePin: chat.handlePin,
    handleArchive: chat.handleArchive,
    isPinPending: chat.isPinPending,
    isArchivePending: chat.isArchivePending,
  };
}
