'use client';

import { useCallback } from 'react';

import { EMPTY_COMPOSER_QUOTES } from '@/constants/chat-quote.constants';
import { useQuoteDraftStore } from '@/stores/quote-draft.store';
import type { UseComposerQuotesReturn } from '@/types';

/** The quotes waiting in this thread's composer, and a way to drop one. */
export function useComposerQuotes(threadId: string): UseComposerQuotesReturn {
  const quotes = useQuoteDraftStore((state) => state.byThread[threadId] ?? EMPTY_COMPOSER_QUOTES);
  const remove = useQuoteDraftStore((state) => state.removeQuote);
  const removeQuote = useCallback((key: string) => remove(threadId, key), [remove, threadId]);
  return { quotes, removeQuote };
}
