import { useCallback, useEffect, useRef, useState } from 'react';

import { STICKY_BOTTOM_THRESHOLD_PX } from '@/constants';
import type { UseStickyBottomScrollParams, UseStickyBottomScrollReturn } from '@/types';

/**
 * Pins the scroll container to its sentinel (last child) while the user is at
 * (or within `threshold` px of) the bottom AND new content arrives. When the
 * user scrolls up beyond the threshold, auto-scroll is paused so the user can
 * read history without being yanked back down. When they scroll back into the
 * threshold band, auto-scroll resumes on the next contentSignal change.
 *
 * Wiring:
 *   - attach `scrollRef` to the `overflow-y: auto` container
 *   - render `<div ref={sentinelRef} />` as the LAST child of that container
 *   - pass any value that changes when content grows (e.g. messages.length
 *     combined with streaming text length) as `contentSignal`
 *
 * Implementation notes:
 *   - IntersectionObserver on the sentinel is the primary signal — when the
 *     sentinel is fully visible inside the scroll root, we know the user is at
 *     the bottom.
 *   - Scroll listener on the container is the back-up signal and lets us
 *     detect the "within threshold" band even before the sentinel scrolls
 *     into view (matters when very long footer content is being rendered).
 *   - ResizeObserver on the sentinel's parent element re-evaluates the bottom
 *     state on every height change. Without it a fast token stream could
 *     race the scroll listener.
 *   - The actual scrollIntoView write is wrapped in rAF so React renders
 *     finish flushing before we mutate scrollTop — this is what prevents
 *     layout thrash and the visible "jumping" you get from synchronous writes.
 */
export function useStickyBottomScroll({
  contentSignal,
  threshold = STICKY_BOTTOM_THRESHOLD_PX,
}: UseStickyBottomScrollParams): UseStickyBottomScrollReturn {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Mirror state in a ref so the contentSignal effect can read the latest
  // value without re-subscribing on every flip — that would defeat the
  // purpose of throttling auto-scroll to "only when user is at bottom".
  const isAtBottomRef = useRef(true);
  const rafIdRef = useRef<number | null>(null);

  const updateAtBottom = useCallback((): void => {
    const scroller = scrollRef.current;
    if (!scroller) {
      return;
    }
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const next = distanceFromBottom <= threshold;
    if (next !== isAtBottomRef.current) {
      isAtBottomRef.current = next;
      setIsAtBottom(next);
    }
  }, [threshold]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto'): void => {
    const scroller = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!scroller) {
      return;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (sentinel) {
        sentinel.scrollIntoView({ block: 'end', behavior });
      } else {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior });
      }
      isAtBottomRef.current = true;
      setIsAtBottom(true);
    });
  }, []);

  // Wire scroll + IntersectionObserver + ResizeObserver on the scroll
  // container and sentinel. Re-runs only when the threshold or the
  // observer-target identity changes — refs are stable so this effect
  // attaches once per mount and tears down on unmount.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const scroller = scrollRef.current;
    if (!scroller) {
      return;
    }

    const handleScroll = (): void => {
      updateAtBottom();
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });

    let intersectionObserver: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const sentinel = sentinelRef.current;
    if (sentinel && typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) {
            return;
          }
          if (entry.isIntersecting) {
            isAtBottomRef.current = true;
            setIsAtBottom(true);
          } else {
            updateAtBottom();
          }
        },
        { root: scroller, threshold: 0, rootMargin: `0px 0px ${threshold}px 0px` },
      );
      intersectionObserver.observe(sentinel);
    }

    // Observing the sentinel's parent catches content growth (the streaming
    // text is rendered as siblings *before* the sentinel inside the same
    // container — when their height grows, the parent's box grows too).
    const observeTarget = sentinel?.parentElement ?? scroller;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateAtBottom();
        if (isAtBottomRef.current) {
          scrollToBottom('auto');
        }
      });
      resizeObserver.observe(observeTarget);
    }

    // Run once on mount so isAtBottom reflects the actual starting position
    // (which is `true` by default, but the scroller may have been restored
    // mid-thread by the host framework).
    updateAtBottom();

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [threshold, updateAtBottom, scrollToBottom]);

  // Content-driven sticky scroll: whenever the caller signals that content
  // changed (new message, new streaming token batch), auto-scroll IFF the
  // user is at the bottom. Reads isAtBottomRef so we don't re-subscribe.
  useEffect(() => {
    if (!isAtBottomRef.current) {
      return;
    }
    scrollToBottom('auto');
  }, [contentSignal, scrollToBottom]);

  return {
    scrollRef,
    sentinelRef,
    isAtBottom,
    scrollToBottom,
  };
}
