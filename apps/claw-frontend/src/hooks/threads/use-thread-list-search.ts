import { useEffect, useRef, useState } from 'react';

import { THREAD_LIST_SEARCH_DEBOUNCE_MS } from '@/constants/thread-list.constants';

/**
 * The search box text, committed to the address after a pause. The box keeps what was typed;
 * the address (Back button, reload) can still overwrite it when it changes from outside.
 */
export function useThreadListSearch(
  urlValue: string,
  commit: (value: string) => void,
): { value: string; setValue: (value: string) => void; clear: () => void } {
  const [value, setLocal] = useState(urlValue);
  const lastCommitted = useRef(urlValue);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (urlValue !== lastCommitted.current) {
      lastCommitted.current = urlValue;
      setLocal(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === lastCommitted.current) {
      return undefined;
    }
    const timer = setTimeout(() => {
      lastCommitted.current = trimmed;
      commitRef.current(trimmed);
    }, THREAD_LIST_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const clear = () => {
    setLocal('');
    if (lastCommitted.current !== '') {
      lastCommitted.current = '';
      commitRef.current('');
    }
  };

  return { value, setValue: setLocal, clear };
}
