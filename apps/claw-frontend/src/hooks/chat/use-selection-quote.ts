'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { useQuoteDraftStore } from '@/stores/quote-draft.store';
import type { QuotableSelection, UseSelectionQuoteReturn } from '@/types';
import { readQuotableSelection, showToast } from '@/utilities';

/**
 * Offers "Quote" while the user has text selected inside one message.
 *
 * Reads the document selection on `selectionchange` (mouse, touch handles and
 * Shift+arrow keys all fire it) and on scroll, so the button follows the text.
 * Both listeners are removed on unmount.
 */
export function useSelectionQuote(threadId: string): UseSelectionQuoteReturn {
  const { t } = useTranslation();
  const addQuote = useQuoteDraftStore((state) => state.addQuote);
  const [selection, setSelection] = useState<QuotableSelection | null>(null);

  useEffect(() => {
    const read = (): void => setSelection(readQuotableSelection(document.getSelection()));
    document.addEventListener('selectionchange', read);
    window.addEventListener('scroll', read, true);
    return () => {
      document.removeEventListener('selectionchange', read);
      window.removeEventListener('scroll', read, true);
    };
  }, []);

  const onQuote = useCallback((): void => {
    if (selection === null) {
      return;
    }
    const added = addQuote(threadId, selection);
    if (!added) {
      showToast.error({ description: t('chat.quote.limitReached') });
      return;
    }
    document.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [addQuote, selection, t, threadId]);

  return { selection, onQuote, label: t('chat.quote.action') };
}
