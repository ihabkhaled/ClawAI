import { useCallback, useEffect, useRef, useState } from 'react';

import { TOUR_KEY_BACK, TOUR_KEY_ESCAPE, TOUR_KEY_NEXT } from '@/constants/tour.constants';
import { useTourContent } from '@/hooks/tour/use-tour-content';
import { useTourHost } from '@/hooks/tour/use-tour-host';
import { useTourStore } from '@/stores/tour.store';
import type { TourHostViewController, TourViewport } from '@/types/tour.types';
import {
  computePopoverPosition,
  readTourViewport,
  spotlightRect,
} from '@/utilities/tour-position.utility';
import { interpolateTourText } from '@/utilities/tour-text.utility';

/**
 * Everything the tour card needs: the step's words, where the highlight and the card sit, and
 * the actions. Keyboard: Escape leaves, arrows move, and focus lands on Next so a keyboard user
 * can simply press Enter through the tour.
 */
export function useTourHostView(): TourHostViewController | null {
  const host = useTourHost();
  const content = useTourContent();
  const next = useTourStore((state) => state.next);
  const back = useTourStore((state) => state.back);
  const finish = useTourStore((state) => state.finish);
  const skip = useTourStore((state) => state.skip);
  const [viewport, setViewport] = useState<TourViewport>({ width: 1280, height: 800 });
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  const stepId = host?.step.id;
  const tourId = host?.tour.id;
  const isLast = host?.isLast ?? false;
  const totalSteps = host?.totalSteps ?? 0;

  const goNext = useCallback((): void => {
    if (isLast) {
      finish();
    } else {
      next(totalSteps);
    }
  }, [isLast, finish, next, totalSteps]);

  useEffect(() => {
    if (tourId === undefined) {
      return undefined;
    }
    setViewport(readTourViewport());
    const onResize = (): void => setViewport(readTourViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [tourId]);

  useEffect(() => {
    if (tourId === undefined) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === TOUR_KEY_ESCAPE) {
        skip();
      } else if (event.key === TOUR_KEY_NEXT) {
        goNext();
      } else if (event.key === TOUR_KEY_BACK) {
        back();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tourId, skip, goNext, back]);

  useEffect(() => {
    if (stepId !== undefined) {
      nextRef.current?.focus({ preventScroll: true });
      setCardHeight(popoverRef.current?.offsetHeight);
    }
  }, [stepId, tourId]);

  if (host === null || tourId === undefined || stepId === undefined) {
    return null;
  }
  const tourContent = content.tours[tourId];
  const stepContent = tourContent.steps[stepId];
  const missing = host.isTargetMissing ? ` ${content.ui.missingTarget}` : '';
  return {
    host,
    ui: content.ui,
    title: stepContent?.title ?? tourContent.title,
    body: `${stepContent?.body ?? ''}${missing}`.trim(),
    stepLabel: interpolateTourText(content.ui.stepOf, {
      current: String(host.stepIndex + 1),
      total: String(host.totalSteps),
    }),
    spotlight: host.rect === null ? null : spotlightRect(host.rect, viewport),
    position: computePopoverPosition(host.rect, viewport, cardHeight),
    popoverRef,
    nextRef,
    goNext,
    goBack: back,
    skipTour: skip,
  };
}
