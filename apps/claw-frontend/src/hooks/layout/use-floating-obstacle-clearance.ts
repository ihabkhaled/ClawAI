'use client';

import { useCallback, useEffect, useRef } from 'react';

import {
  FLOATING_CLEARANCE_GAP_PX,
  FLOATING_CLEARANCE_SETTLE_PASSES,
  FLOATING_MEASURED_ATTRIBUTES,
  FLOATING_TOAST_CLEARANCE_CONFIG,
} from '@/constants/floating-obstacle.constants';
import type { FloatingClearanceConfig, UseFloatingObstacleClearanceReturn } from '@/types';
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
 *
 * `config` picks which registry is being measured and which property receives
 * the answer. There are two: the toast column clears floating controls, and the
 * floating rail clears bottom-anchored page furniture. One engine, because the
 * measurement is identical and the second copy is where the two would drift.
 */
export function useFloatingObstacleClearance(
  viewportRef: React.RefObject<HTMLElement | null>,
  config: FloatingClearanceConfig = FLOATING_TOAST_CLEARANCE_CONFIG,
): UseFloatingObstacleClearanceReturn {
  const frameRef = useRef<number | null>(null);
  const boxObserverRef = useRef<ResizeObserver | null>(null);
  const observedRef = useRef<Set<Element>>(new Set());
  const lastValueRef = useRef<number | null>(null);
  const settlePassesRef = useRef(0);
  // Indirection, not a cycle: `measure` asks for another pass and `scheduleMeasure`
  // is defined in terms of `measure`. Naming one from the other directly is a
  // reference before initialisation.
  const settleRef = useRef<(() => void) | null>(null);

  // Keeps the box observer pointed at exactly the elements currently measured.
  //
  // Re-observing on every pass would be simpler and wrong: an observe() call
  // fires the callback again with the initial observation, so disconnect-and-
  // reattach turns into a measurement every frame, forever. Diffing means only
  // a genuinely new obstacle costs a callback, and an obstacle that left the
  // page stops being held.
  const syncBoxObserver = useCallback((elements: Element[]): void => {
    const observer = boxObserverRef.current;
    if (!observer) {
      return;
    }

    const next = new Set(elements);
    for (const element of observedRef.current) {
      if (!next.has(element)) {
        observer.unobserve(element);
      }
    }
    for (const element of next) {
      if (!observedRef.current.has(element)) {
        observer.observe(element);
      }
    }
    observedRef.current = next;
  }, []);

  const measure = useCallback((): void => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const column = viewport.getBoundingClientRect();
    const elements = Array.from(document.querySelectorAll(config.selector))
      // The viewport can match its own selector if a page ever tags it; a column
      // that reserves space for itself would climb the screen on every frame.
      .filter((element) => element !== viewport && !viewport.contains(element));

    // The viewport is observed alongside the obstacles: the column's own width
    // decides which obstacles count as overlapping it.
    syncBoxObserver([...elements, viewport]);

    const clearance = resolveFloatingClearance({
      obstacles: elements.map((element) => element.getBoundingClientRect()),
      columnLeft: column.left,
      columnRight: column.right,
      viewportHeight: window.innerHeight,
      gapPx: FLOATING_CLEARANCE_GAP_PX,
    });

    document.documentElement.style.setProperty(config.variable, `${clearance}px`);

    // A breakpoint change moves boxes without resizing them, so neither the
    // resize observer nor the mutation observer sees it, and the one pass the
    // window resize triggers can land mid-transition. Measuring again while the
    // answer keeps changing costs a frame and converges on its own; the cap is
    // there so a genuinely oscillating layout degrades to a wrong number rather
    // than to a loop that never yields.
    if (clearance === lastValueRef.current) {
      settlePassesRef.current = 0;
      return;
    }
    lastValueRef.current = clearance;
    if (settlePassesRef.current >= FLOATING_CLEARANCE_SETTLE_PASSES) {
      return;
    }
    settlePassesRef.current += 1;
    settleRef.current?.();
  }, [config.selector, config.variable, syncBoxObserver, viewportRef]);

  const scheduleMeasure = useCallback((): void => {
    if (frameRef.current !== null) {
      return;
    }
    // Coalesce to one measurement per frame: a mutation observer on the whole
    // document fires in bursts, and each measure forces layout.
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    settleRef.current = scheduleMeasure;
  }, [scheduleMeasure]);

  useEffect(() => {
    // A box can change without a mutation anyone can see: a font swaps in, a
    // label finishes loading, a rail re-stacks after a breakpoint change. Those
    // fire no attribute change and no window resize, and the clearance was
    // measured against the old box — which is how the mobile rail settled one
    // slot too low until something else forced a second pass.
    boxObserverRef.current = new ResizeObserver(() => scheduleMeasure());
    scheduleMeasure();

    const observer = new MutationObserver(scheduleMeasure);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      // Both registries, not just this hook's: an element joining either one is
      // a childList change here, but an element that *gains* the attribute
      // later is only visible through the filter.
      attributeFilter: ['class', 'style', 'hidden', ...FLOATING_MEASURED_ATTRIBUTES],
    });

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);

    return () => {
      observer.disconnect();
      boxObserverRef.current?.disconnect();
      boxObserverRef.current = null;
      observedRef.current = new Set();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        // Clearing the handle matters as much as cancelling it: `scheduleMeasure`
        // treats a non-null handle as "a measurement is already queued". A
        // cancelled id left behind makes every later call a no-op, so the hook
        // never measures again after a remount.
        frameRef.current = null;
      }
      document.documentElement.style.removeProperty(config.variable);
      lastValueRef.current = null;
      settlePassesRef.current = 0;
    };
  }, [config.variable, scheduleMeasure]);

  return { remeasure: scheduleMeasure };
}
