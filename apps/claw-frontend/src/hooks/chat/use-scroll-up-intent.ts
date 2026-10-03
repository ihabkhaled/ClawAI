import { useCallback, useRef } from 'react';

import {
  SCROLL_PIN_TOLERANCE_PX,
  SCROLL_UP_INTENT_DELTA_PX,
  SCROLL_UP_KEYS,
  USER_SCROLL_INPUT_WINDOW_MS,
} from '@/constants/chat.constants';
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
    let lastInputAt = Number.NEGATIVE_INFINITY;
    let pointerDown = false;
    const markInput = (): void => {
      lastInputAt = Date.now();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (SCROLL_UP_KEYS.includes(event.key)) {
        markInput();
      }
    };
    const onPointerDown = (): void => {
      pointerDown = true;
      markInput();
    };
    const onPointerUp = (): void => {
      pointerDown = false;
      markInput();
    };
    const onScroll = (): void => {
      const top = element.scrollTop;
      const distanceToBottom = element.scrollHeight - element.clientHeight - top;
      const userDriven = pointerDown || Date.now() - lastInputAt <= USER_SCROLL_INPUT_WINDOW_MS;
      if (top < lastTop - SCROLL_UP_INTENT_DELTA_PX && userDriven) {
        pinnedRef.current = false;
      } else if (distanceToBottom <= SCROLL_PIN_TOLERANCE_PX) {
        pinnedRef.current = true;
      }
      lastTop = top;
    };
    // Content growth while pinned: stay on the live edge even when Virtuoso's own
    // scrollToIndex lands short on a row whose height is still being measured. The
    // scroller has no children yet when this ref fires, so watch the subtree.
    let frame = 0;
    const stickToBottom = (): void => {
      frame = 0;
      if (pinnedRef.current) {
        element.scrollTop = element.scrollHeight;
      }
    };
    const observer =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver((): void => {
            if (pinnedRef.current && frame === 0) {
              frame = requestAnimationFrame(stickToBottom);
            }
          });
    observer?.observe(element, { childList: true, subtree: true, characterData: true });
    element.addEventListener('scroll', onScroll, { passive: true });
    element.addEventListener('wheel', markInput, { passive: true });
    element.addEventListener('touchmove', markInput, { passive: true });
    element.addEventListener('keydown', onKey);
    element.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    detachRef.current = (): void => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', onScroll);
      element.removeEventListener('wheel', markInput);
      element.removeEventListener('touchmove', markInput);
      element.removeEventListener('keydown', onKey);
      element.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const pin = useCallback((): void => {
    pinnedRef.current = true;
  }, []);

  return { pinnedRef, scrollerRef, pin };
}
