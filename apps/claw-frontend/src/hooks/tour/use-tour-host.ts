import { useCallback, useEffect, useState } from 'react';

import { TOUR_TARGET_POLL_MS, TOUR_TARGET_WAIT_MS } from '@/constants/tour.constants';
import { TOUR_DEFINITIONS } from '@/constants/tours.constants';
import { useTourStore } from '@/stores/tour.store';
import type { TourHostState, TourRect } from '@/types/tour.types';
import { findTourTarget, measureTourTarget } from '@/utilities/tour-target.utility';

/**
 * The running tour's current step, and where its element is on screen.
 *
 * The element may render a moment after the step starts (a query has to resolve first), so the
 * hook looks for it for a short while before deciding it is missing. A missing element is a
 * centered card, not an error: a control can be hidden at a width or by a plan.
 */
export function useTourHost(): TourHostState | null {
  const activeTourId = useTourStore((state) => state.activeTourId);
  const stepIndex = useTourStore((state) => state.stepIndex);
  const tour = TOUR_DEFINITIONS.find((entry) => entry.id === activeTourId) ?? null;
  const step = tour?.steps[stepIndex] ?? null;
  const target = step?.target ?? null;

  const [rect, setRect] = useState<TourRect | null>(null);
  const [isSearching, setIsSearching] = useState(target !== null);

  const measure = useCallback((): boolean => {
    if (target === null) {
      setRect(null);
      return true;
    }
    const element = findTourTarget(target);
    if (element === null) {
      setRect(null);
      return false;
    }
    setRect(measureTourTarget(element));
    return true;
  }, [target]);

  useEffect(() => {
    if (target === null) {
      setRect(null);
      setIsSearching(false);
      return undefined;
    }
    setIsSearching(true);
    let waited = 0;
    let scrolled = false;
    const poll = window.setInterval(() => {
      waited += TOUR_TARGET_POLL_MS;
      const element = findTourTarget(target);
      if (element !== null) {
        if (!scrolled) {
          scrolled = true;
          element.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
        measure();
        setIsSearching(false);
        window.clearInterval(poll);
      } else if (waited >= TOUR_TARGET_WAIT_MS) {
        setRect(null);
        setIsSearching(false);
        window.clearInterval(poll);
      }
    }, TOUR_TARGET_POLL_MS);
    return () => window.clearInterval(poll);
  }, [target, measure]);

  useEffect(() => {
    if (target === null) {
      return undefined;
    }
    const remeasure = (): void => {
      measure();
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [target, measure]);

  if (tour === null || step === null) {
    return null;
  }
  return {
    tour,
    step,
    stepIndex,
    totalSteps: tour.steps.length,
    rect,
    isLast: stepIndex === tour.steps.length - 1,
    isTargetMissing: target !== null && rect === null && !isSearching,
  };
}
