import { useEffect, useRef, useState } from 'react';

import { SEARCH_DEBOUNCE_MS } from '@/constants/observability-explorer.constants';
import type { UrlSearchDraft } from '@/types/observability-pages.types';

/**
 * The text of a search box that is mirrored into the URL after typing pauses.
 * The draft follows the URL only when something ELSE changed it (a filter reset,
 * the Back button). A value this box wrote itself may arrive late, after the
 * user typed on; that older echo must not wipe what they typed since.
 */
export function useUrlSearchDraft(urlQuery: string, write: (next: string) => void): UrlSearchDraft {
  const [draft, setDraft] = useState(urlQuery);
  const written = useRef(urlQuery);
  const inFlight = useRef<string[]>([]);

  useEffect(() => {
    const echoed = inFlight.current.lastIndexOf(urlQuery);
    if (echoed !== -1) {
      inFlight.current = inFlight.current.slice(echoed + 1);
    } else if (urlQuery !== written.current) {
      written.current = urlQuery;
      inFlight.current = [];
      setDraft(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = draft.trim();
      if (next !== written.current) {
        written.current = next;
        inFlight.current.push(next);
        write(next);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, write]);

  return { draft, setDraft };
}
