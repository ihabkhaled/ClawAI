import { create } from 'zustand';

import { QUOTE_MAX_COUNT } from '@/constants/chat-quote.constants';
import type { QuoteDraftStore } from '@/types';
import { clampQuoteText, quoteKey } from '@/utilities/message-quote.utility';

/**
 * Quotes waiting to be sent, per thread.
 *
 * The selection happens in the transcript and the send happens in the
 * composer — siblings, not parent and child — so the hand-off is a small
 * client store rather than a prop chain through the page. Keyed by thread so a
 * quote picked in one conversation never rides along in another.
 */
export const useQuoteDraftStore = create<QuoteDraftStore>()((set, get) => ({
  byThread: {},
  addQuote: (threadId, quote) => {
    const current = get().byThread[threadId] ?? [];
    const text = clampQuoteText(quote.text);
    const key = quoteKey(quote.sourceMessageId, text);
    if (text.length === 0 || current.some((existing) => existing.key === key)) {
      return true;
    }
    if (current.length >= QUOTE_MAX_COUNT) {
      return false;
    }
    set((state) => ({
      byThread: {
        ...state.byThread,
        [threadId]: [...current, { sourceMessageId: quote.sourceMessageId, text, key }],
      },
    }));
    return true;
  },
  removeQuote: (threadId, key) => {
    set((state) => ({
      byThread: {
        ...state.byThread,
        [threadId]: (state.byThread[threadId] ?? []).filter((quote) => quote.key !== key),
      },
    }));
  },
  clearQuotes: (threadId) => {
    set((state) => ({
      byThread: Object.fromEntries(
        Object.entries(state.byThread).filter(([id]) => id !== threadId),
      ),
    }));
  },
}));
