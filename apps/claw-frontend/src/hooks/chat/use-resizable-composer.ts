import { useCallback, useEffect, useRef, useState } from 'react';

import { COMPOSER_DEFAULT_HEIGHT, COMPOSER_MAX_HEIGHT_RATIO, COMPOSER_MIN_HEIGHT } from '@/constants';
import { logger } from '@/utilities';

export function useResizableComposer() {
  const [composerHeight, setComposerHeight] = useState(COMPOSER_DEFAULT_HEIGHT);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent): void => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = composerHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    logger.debug({ component: 'chat', action: 'resize-start', message: 'Composer resize started' });
  }, [composerHeight]);

  useEffect(() => {
    // Throttle setComposerHeight to one update per animation frame. Without
    // this, a fast mouse fires ~100 mousemove events / sec, each of which
    // triggers a full ChatThreadShell re-render (messages list + composer +
    // every memoized bubble's prop comparison). Coalescing to rAF caps it
    // at ~60 Hz and the drag feels smooth instead of laggy.
    let rafId: number | null = null;
    let pendingHeight: number | null = null;

    const flushPending = (): void => {
      rafId = null;
      if (pendingHeight !== null) {
        setComposerHeight(pendingHeight);
        pendingHeight = null;
      }
    };

    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) {
        return;
      }
      const delta = startY.current - e.clientY;
      const maxHeight = window.innerHeight * COMPOSER_MAX_HEIGHT_RATIO;
      pendingHeight = Math.min(
        maxHeight,
        Math.max(COMPOSER_MIN_HEIGHT, startHeight.current + delta),
      );
      if (rafId === null) {
        rafId = window.requestAnimationFrame(flushPending);
      }
    };

    const handleMouseUp = (): void => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // Make sure any pending frame still lands so the height matches the
        // final pointer position instead of lagging one frame behind.
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          flushPending();
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return { composerHeight, handleMouseDown };
}
