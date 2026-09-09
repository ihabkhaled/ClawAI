'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY,
  FEEDBACK_LAUNCHER_DRAG_EXPAND_THRESHOLD_PX,
} from '@/constants/feedback.constants';
import type { UseFeedbackLauncherCollapseReturn } from '@/types';

/**
 * Whether the feedback launcher is tucked to the screen edge.
 *
 * The auto-clearance system in `useFeedbackLauncher` only reacts to obstacles
 * it can measure — a composer, a FAB. It has no way to know a page author
 * considers some other element important. This is the manual override: a
 * "-" on the launcher tucks it to the edge, leaving a small tab visible, and
 * either tapping that tab or dragging it inward brings the launcher back.
 *
 * Read from `localStorage` on mount rather than during render, so server and
 * first client render agree (no value) and hydration never mismatches; the
 * real preference applies one paint later.
 */
export function useFeedbackLauncherCollapse(): UseFeedbackLauncherCollapseReturn {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      setIsCollapsed(
        window.localStorage.getItem(FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY) === 'true',
      );
    } catch {
      // Storage blocked (private browsing, locked-down profile): stay expanded.
    }
  }, []);

  const persist = useCallback((value: boolean) => {
    setIsCollapsed(value);
    try {
      window.localStorage.setItem(FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY, String(value));
    } catch {
      // The in-memory state above still applies for the rest of this visit.
    }
  }, []);

  const collapse = useCallback(() => persist(true), [persist]);
  const expand = useCallback(() => persist(false), [persist]);

  // Distance is measured as a straight line from the pointer-down point,
  // regardless of direction: the tab sits on the trailing edge in both LTR
  // and RTL, so "which way is inward" flips with the page direction, but
  // "how far has this moved" does not.
  useEffect(() => {
    if (!isCollapsed) {
      return undefined;
    }

    function handlePointerMove(event: PointerEvent): void {
      const start = dragStartRef.current;
      if (!start) {
        return;
      }
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (distance >= FEEDBACK_LAUNCHER_DRAG_EXPAND_THRESHOLD_PX) {
        dragStartRef.current = null;
        expand();
      }
    }

    function handlePointerUp(): void {
      dragStartRef.current = null;
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isCollapsed, expand]);

  const onEdgeTabPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    dragStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  return { isCollapsed, collapse, expand, onEdgeTabPointerDown };
}
