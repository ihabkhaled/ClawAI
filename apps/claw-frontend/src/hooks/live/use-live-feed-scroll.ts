import { useCallback, useEffect, useRef } from 'react';

import { LIVE_AUTO_SCROLL_THRESHOLD_PX } from '@/constants/live.constants';
import type { UseLiveFeedScrollResult } from '@/types/live.types';

/** Follows new items only while the reader is at the bottom; scrolling up stops the follow. */
export function useLiveFeedScroll(itemCount: number): UseLiveFeedScrollResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);

  const onScroll = useCallback((): void => {
    const element = containerRef.current;
    if (element !== null) {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
      atBottomRef.current = distance <= LIVE_AUTO_SCROLL_THRESHOLD_PX;
    }
  }, []);
  useEffect(() => {
    const element = containerRef.current;
    if (element !== null && atBottomRef.current && itemCount > 0) {
      element.scrollTop = element.scrollHeight;
    }
  }, [itemCount]);

  return { containerRef, onScroll };
}
