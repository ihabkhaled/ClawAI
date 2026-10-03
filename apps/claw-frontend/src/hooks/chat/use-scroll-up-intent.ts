import { useCallback, useRef } from 'react';

import { SCROLL_PIN_TOLERANCE_PX, SCROLL_UP_INTENT_DELTA_PX } from '@/constants/chat.constants';
import type { UseScrollUpIntentReturn } from '@/types';

// Tracks whether the reader has deliberately left the bottom of the transcript.
//
// Virtuoso's at-bottom flag is a distance test, so a single tall token batch
// (a code block, an image) pushes the viewport past the threshold and flips it
// to false without the user doing anything — and following stopped for the rest
// of the answer. Intent is different: only the scroll position moving UP is the
// user. Our own scrolls and content growth never decrease scrollTop, so a
// decrease is the one reliable signal, and it covers wheel, touch, keyboard and
// scrollbar drag alike. Reaching the bottom again, or sending, pins again.
export function useScrollUpIntent(): UseScrollUpIntentReturn {
  const pinnedRef = useRef<boolean>(true);
  const detachRef = useRef<(() => void) | null>(null);

  const scrollerRef = useCallback((element: HTMLElement | Window | null): void => {
    detachRef.current?.();
    detachRef.current = null;
    if (element === null || !(element instanceof HTMLElement)) {
      return;
    }
    let lastTop = element.scrollTop;
    const onScroll = (): void => {
      const top = element.scrollTop;
      const distanceToBottom = element.scrollHeight - element.clientHeight - top;
      if (top < lastTop - SCROLL_UP_INTENT_DELTA_PX) {
        pinnedRef.current = false;
      } else if (distanceToBottom <= SCROLL_PIN_TOLERANCE_PX) {
        pinnedRef.current = true;
      }
      lastTop = top;
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    detachRef.current = (): void => element.removeEventListener('scroll', onScroll);
  }, []);

  const pin = useCallback((): void => {
    pinnedRef.current = true;
  }, []);

  return { pinnedRef, scrollerRef, pin };
}
