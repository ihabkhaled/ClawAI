import { type RefObject, useEffect, useRef } from 'react';

import {
  THREAD_FOLLOW_BOTTOM_THRESHOLD_PX,
  THREAD_FOLLOW_STOP_KEYS,
} from '@/constants/thread-generation-progress.constants';
import { isScrolledToBottom } from '@/utilities/thread-generation-progress.utility';

/**
 * Keeps the page scrolled to the newest update while a Thread job runs.
 *
 * It follows until the reader scrolls up on purpose (wheel up, touch drag, PageUp, ArrowUp,
 * Home) and resumes once they are back at the bottom of the scrolling area. `signature` changes with every
 * update; `isRunning` stops the following once the job settles. Returns the ref for the
 * marker placed after the last update.
 */
export function useThreadFollowBottom(
  signature: string,
  isRunning: boolean,
): RefObject<HTMLDivElement | null> {
  const endRef = useRef<HTMLDivElement | null>(null);
  const following = useRef(true);

  useEffect(() => {
    const stopFollowing = (): void => {
      following.current = false;
    };
    const onWheel = (event: WheelEvent): void => {
      if (event.deltaY < 0) {
        stopFollowing();
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (THREAD_FOLLOW_STOP_KEYS.includes(event.key)) {
        stopFollowing();
      }
    };
    // The page scrolls inside <main>, not the window, so measure the element that scrolled.
    const onScroll = (event: Event): void => {
      const scroller = event.target instanceof Element ? event.target : document.documentElement;
      if (
        isScrolledToBottom(
          scroller.scrollHeight,
          scroller.scrollTop,
          scroller.clientHeight,
          THREAD_FOLLOW_BOTTOM_THRESHOLD_PX,
        )
      ) {
        following.current = true;
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', stopFollowing, { passive: true });
    window.addEventListener('keydown', onKey);
    // Capture, so a scroll inside any scrolling container (not only the window) is seen.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', stopFollowing);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, []);

  useEffect(() => {
    const end = endRef.current;
    if (!isRunning || !following.current || end === null) {
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    end.scrollIntoView({ block: 'end', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [signature, isRunning]);

  return endRef;
}
