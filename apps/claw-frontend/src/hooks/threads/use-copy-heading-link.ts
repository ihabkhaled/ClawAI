import { useCallback, useEffect, useRef, useState } from 'react';

import { THREAD_COPIED_RESET_MS } from '@/constants/thread-article.constants';

/** Copies the address of one section (page address plus `#id`) and says so for a moment. */
export function useCopyHeadingLink(id: string): { copied: boolean; copy: () => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const copy = useCallback((): void => {
    const { origin, pathname, search } = window.location;
    navigator.clipboard
      .writeText(`${origin}${pathname}${search}#${id}`)
      .then(() => {
        setCopied(true);
        if (timer.current !== null) {
          clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => {
          setCopied(false);
        }, THREAD_COPIED_RESET_MS);
      })
      .catch(() => {
        // The anchor itself still moved the address bar; nothing else to report.
      });
  }, [id]);

  return { copied, copy };
}
