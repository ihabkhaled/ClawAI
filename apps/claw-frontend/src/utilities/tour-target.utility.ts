import { TOUR_TARGET_ATTRIBUTE } from '@/constants/tour.constants';
import type { TourRect } from '@/types/tour.types';

/** The visible element carrying `data-tour="<target>"`, or null. A hidden copy does not count. */
export function findTourTarget(target: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    `[${TOUR_TARGET_ATTRIBUTE}="${CSS.escape(target)}"]`,
  );
  for (const element of candidates) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) {
      return element;
    }
  }
  return null;
}

/** An element's rectangle in viewport coordinates. */
export function measureTourTarget(element: HTMLElement): TourRect {
  const box = element.getBoundingClientRect();
  return { top: box.top, left: box.left, width: box.width, height: box.height };
}
