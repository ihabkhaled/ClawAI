'use client';

import { useCallback, useEffect, useRef } from 'react';

import {
  FLOATING_CLEARANCE_GAP_PX,
  FLOATING_CLEARANCE_VARIABLE,
  FLOATING_OBSTACLE_SELECTOR,
} from '@/constants/floating-obstacle.constants';
import type { UseFloatingObstacleClearanceReturn } from '@/types';
import { resolveFloatingClearance } from '@/utilities/floating-obstacle-clearance.utility';

/**
 * Keeps the toast column clear of whatever is floating over the page right now.
 *
 * The measurement has to be live rather than configured: the same launcher is a
 * different height on a phone, the install prompt appears and disappears, and a
 * page can add its own floating action. So obstacles opt in through a data
 * attribute and this reads their real boxes.
 *
 * The result lands in a CSS variable, not a class. Tailwind scans source text,
 * so a class computed at runtime is one it never generates — the viewport keeps
 * one static `calc()` and this moves the number inside it.
 */
export function useFloatingObstacleClearance(
  viewportRef: React.RefObject<HTMLElement | null>,
): UseFloatingObstacleClearanceReturn {
  const frameRef = useRef<number | null>(null);

  const measure = useCallback((): void => {
    const viewport = viewportRef.current;
    if (!viewport) {return;}

    const column = viewport.getBoundingClientRect();
    const obstacles = Array.from(document.querySelectorAll(FLOATING_OBSTACLE_SELECTOR))
      // The viewport can match its own selector if a page ever tags it; a column
      // that reserves space for itself would climb the screen on every frame.
      .filter((element) => element !== viewport && !viewport.contains(element))
      .map((element) => element.getBoundingClientRect());

    const clearance = resolveFloatingClearance({
      obstacles,
      columnLeft: column.left,
      columnRight: column.right,
      viewportHeight: window.innerHeight,
      gapPx: FLOATING_CLEARANCE_GAP_PX,
    });

    document.documentElement.style.setProperty(FLOATING_CLEARANCE_VARIABLE, `${clearance}px`);
  }, [viewportRef]);

  const scheduleMeasure = useCallback((): void => {
    if (frameRef.current !== null) {return;}
    // Coalesce to one measurement per frame: a mutation observer on the whole
    // document fires in bursts, and each measure forces layout.
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    scheduleMeasure();

    const observer = new MutationObserver(scheduleMeasure);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'data-floating-obstacle'],
    });

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      if (frameRef.current !== null) {window.cancelAnimationFrame(frameRef.current);}
      document.documentElement.style.removeProperty(FLOATING_CLEARANCE_VARIABLE);
    };
  }, [scheduleMeasure]);

  return { remeasure: scheduleMeasure };
}
