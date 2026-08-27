'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { IN_THREAD_SEARCH_MIN_LENGTH } from '@/constants';
import { useDebounce } from '@/hooks/common/use-debounce';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseInThreadSearchReturn } from '@/types';

/**
 * Finds matches inside the open conversation.
 *
 * Debounced, because every keystroke would otherwise be a scan over the
 * thread's rows. Disabled below the minimum length rather than sending a query
 * that would match most of the conversation and return a list nobody can use.
 */
export function useInThreadSearch(threadId: string): UseInThreadSearchReturn {
  const [term, setTerm] = useState('');
  const [isOpen, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debouncedTerm = useDebounce(term, 300);
  const isSearchable = debouncedTerm.trim().length >= IN_THREAD_SEARCH_MIN_LENGTH;

  // Focus on open, in an effect rather than with autoFocus: the prop moves
  // focus on every mount including a page load, which is what the a11y rule is
  // about. Here the panel only appears after an explicit click, so directing
  // focus into it is the expected behaviour rather than a surprise.
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const query = useQuery({
    queryKey: queryKeys.threads.search(threadId, debouncedTerm),
    queryFn: () => chatRepository.searchInThread(threadId, debouncedTerm.trim()),
    enabled: isOpen && isSearchable,
  });

  return {
    term,
    setTerm,
    inputRef,
    isOpen,
    open: () => setOpen(true),
    close: () => {
      setOpen(false);
      // Cleared on close so reopening does not show the previous search's
      // results against an empty box.
      setTerm('');
    },
    matches: query.data ?? [],
    isSearching: query.isFetching,
    isSearchable,
  };
}
