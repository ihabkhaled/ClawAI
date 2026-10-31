import { type RefObject, useEffect, useRef } from 'react';

import {
  THREAD_FOLLOW_BOTTOM_THRESHOLD_PX,
  THREAD_FOLLOW_EASE_TIME_CONSTANT_MS,
  THREAD_FOLLOW_FIRST_FRAME_MS,
  THREAD_FOLLOW_MAX_FRAME_MS,
  THREAD_FOLLOW_STOP_KEYS,
} from '@/constants/thread-generation-progress.constants';
import {
  distanceToEndMarker,
  easedScrollStep,
  findScrollContainer,
} from '@/utilities/scroll-follow.utility';
import { isScrolledToBottom } from '@/utilities/thread-generation-progress.utility';

/**
 * Keeps the page scrolled to the newest update while a Thread job runs, continuously.
 *
 * Updates now arrive as pushes, several a second, and a step's excerpt can keep growing, so the
 * follow is not tied to a change signal. A `ResizeObserver` on the panel and its scroller wakes a
 * `requestAnimationFrame` loop whenever the content grows; the loop eases `scrollTop` toward the
 * bottom (one read and one write per frame, no overlapping smooth-scroll animations) and goes idle
 * when it arrives. `prefers-reduced-motion` jumps instead of easing.
 *
 * It follows until the reader scrolls up on purpose (wheel up, touch drag, PageUp, ArrowUp, Home)
 * and resumes once they are back within a few pixels of the bottom of the scrolling area.
 * `signature` changes with every update and also wakes the loop; `isRunning` stops it once the job
 * settles. Returns the ref for the marker placed after the last update.
 */
export function useThreadFollowBottom(
  signature: string,
  isRunning: boolean,
): RefObject<HTMLDivElement | null> {
  const endRef = useRef<HTMLDivElement | null>(null);
  const following = useRef(true);
  const wake = useRef<(() => void) | null>(null);

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
        const wasStopped = !following.current;
        following.current = true;
        if (wasStopped) {
          wake.current?.();
        }
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
    if (!isRunning || end === null) {
      return undefined;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scroller: Element | null = null;
    let frame = 0;
    let lastTime = 0;

    const step = (time: number): void => {
      frame = 0;
      if (!following.current) {
        lastTime = 0;
        return;
      }
      scroller ??= findScrollContainer(end);
      const distance = distanceToEndMarker(scroller, end);
      if (distance <= 0) {
        lastTime = 0;
        return;
      }
      if (reduceMotion) {
        scroller.scrollTop += distance;
        lastTime = 0;
        return;
      }
      const elapsed =
        lastTime === 0
          ? THREAD_FOLLOW_FIRST_FRAME_MS
          : Math.min(time - lastTime, THREAD_FOLLOW_MAX_FRAME_MS);
      lastTime = time;
      scroller.scrollTop += easedScrollStep(distance, elapsed, THREAD_FOLLOW_EASE_TIME_CONSTANT_MS);
      frame = requestAnimationFrame(step);
    };
    const wakeUp = (): void => {
      if (frame === 0) {
        frame = requestAnimationFrame(step);
      }
    };
    wake.current = (): void => {
      scroller = null;
      wakeUp();
    };

    // Growth inside a step (a long excerpt filling in) never changes the signature.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(wakeUp);
    const watched = new Set<Element>();
    if (end.parentElement !== null) {
      watched.add(end.parentElement);
    }
    const container = findScrollContainer(end);
    watched.add(container);
    if (container.firstElementChild !== null) {
      watched.add(container.firstElementChild);
    }
    for (const node of watched) {
      observer?.observe(node);
    }

    wakeUp();
    return () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
        // The job settled mid-ease: finish at the last update instead of stopping short of it.
        if (following.current && scroller !== null && end.isConnected) {
          scroller.scrollTop += distanceToEndMarker(scroller, end);
        }
      }
      observer?.disconnect();
      wake.current = null;
    };
  }, [isRunning]);

  useEffect(() => {
    wake.current?.();
  }, [signature, isRunning]);

  return endRef;
}
