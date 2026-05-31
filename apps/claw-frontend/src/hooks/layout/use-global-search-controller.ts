import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

import { ROUTES } from '@/constants';
import { useGlobalThreadSearch } from '@/hooks/chat/use-global-thread-search';
import { useKeyboardShortcut } from '@/hooks/ui/use-keyboard-shortcut';
import type { UseGlobalSearchControllerReturn } from '@/types';
import { logger } from '@/utilities';

export function useGlobalSearchController(): UseGlobalSearchControllerReturn {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { threads, isLoading, search, setSearch, isOpen, handleOpenChange } =
    useGlobalThreadSearch();

  const handleToggle = useCallback((): void => {
    handleOpenChange(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, handleOpenChange]);

  // Cmd/Ctrl+K opens the search popover and focuses the input. We bind this
  // once at the controller level so it's wired regardless of where the
  // GlobalSearch component is mounted (currently the Topbar). preventDefault
  // is true by default, which swallows Chrome/Firefox's address-bar focus.
  useKeyboardShortcut('mod+k', () => {
    if (!isOpen) {
      handleOpenChange(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      inputRef.current?.focus();
    }
  });

  const handleSelect = useCallback(
    (threadId: string): void => {
      logger.info({
        component: 'layout',
        action: 'search-select-thread',
        message: 'Thread selected from global search',
        details: { threadId },
      });
      handleOpenChange(false);
      router.push(ROUTES.CHAT_THREAD(threadId));
    },
    [handleOpenChange, router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleOpenChange(false);
      }
    },
    [handleOpenChange],
  );

  const showResults = isOpen && search.length > 0;

  return {
    inputRef,
    threads,
    isLoading,
    search,
    setSearch,
    isOpen,
    showResults,
    handleToggle,
    handleSelect,
    handleKeyDown,
    handleOpenChange,
  };
}
