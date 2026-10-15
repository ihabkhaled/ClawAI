import { useEffect, useState } from 'react';

import {
  THREAD_CHANGE_REQUEST_ANCHOR_PREFIX,
  THREAD_CHANGE_REQUEST_HIGHLIGHT_MS,
} from '@/constants/thread-change-requests.constants';

/**
 * The suggestion a notification link points at (`#change-request-<id>`): scrolled into view and
 * highlighted for a few seconds once the list has loaded. Null when the address names none, or
 * names one that is not in the list.
 */
export function useThreadChangeRequestHighlight(ids: ReadonlyArray<string>): string | null {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const idKey = ids.join(',');

  useEffect(() => {
    const hash = globalThis.location?.hash ?? '';
    if (!hash.startsWith(`#${THREAD_CHANGE_REQUEST_ANCHOR_PREFIX}`)) {
      return undefined;
    }
    const wanted = decodeURIComponent(hash.slice(`#${THREAD_CHANGE_REQUEST_ANCHOR_PREFIX}`.length));
    const known = idKey === '' ? [] : idKey.split(',');
    if (!known.includes(wanted)) {
      return undefined;
    }
    setHighlightedId(wanted);
    document
      .getElementById(`${THREAD_CHANGE_REQUEST_ANCHOR_PREFIX}${wanted}`)
      ?.scrollIntoView?.({ block: 'center' });
    const timer = setTimeout(() => setHighlightedId(null), THREAD_CHANGE_REQUEST_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [idKey]);

  return highlightedId;
}
