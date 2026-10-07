import {
  TOUR_POPOVER_EDGE_PX,
  TOUR_POPOVER_ESTIMATED_HEIGHT_PX,
  TOUR_POPOVER_GAP_PX,
  TOUR_POPOVER_WIDTH_PX,
  TOUR_SPOTLIGHT_PADDING_PX,
} from '@/constants/tour.constants';
import { TourPopoverSide } from '@/enums/tour-popover-side.enum';
import type { TourPopoverPosition, TourRect, TourViewport } from '@/types/tour.types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** The highlight box for a target: its rectangle plus a little room, kept inside the viewport. */
export function spotlightRect(rect: TourRect, viewport: TourViewport): TourRect {
  const top = Math.max(rect.top - TOUR_SPOTLIGHT_PADDING_PX, 0);
  const left = Math.max(rect.left - TOUR_SPOTLIGHT_PADDING_PX, 0);
  const bottom = Math.min(rect.top + rect.height + TOUR_SPOTLIGHT_PADDING_PX, viewport.height);
  const right = Math.min(rect.left + rect.width + TOUR_SPOTLIGHT_PADDING_PX, viewport.width);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

/**
 * Where the tour card goes. Without a target it is centered. With one it goes below, or above when
 * there is no room below, and is kept inside the viewport horizontally so it is never cut off at a
 * screen edge, in either text direction.
 */
export function computePopoverPosition(
  rect: TourRect | null,
  viewport: TourViewport,
  popoverHeight: number = TOUR_POPOVER_ESTIMATED_HEIGHT_PX,
): TourPopoverPosition {
  const width = Math.min(TOUR_POPOVER_WIDTH_PX, viewport.width - TOUR_POPOVER_EDGE_PX * 2);
  if (rect === null) {
    return {
      top: Math.max((viewport.height - popoverHeight) / 2, TOUR_POPOVER_EDGE_PX),
      left: Math.max((viewport.width - width) / 2, TOUR_POPOVER_EDGE_PX),
      side: TourPopoverSide.Center,
    };
  }
  const box = spotlightRect(rect, viewport);
  const roomBelow = viewport.height - (box.top + box.height) - TOUR_POPOVER_GAP_PX;
  const roomAbove = box.top - TOUR_POPOVER_GAP_PX;
  const placeBelow = roomBelow >= popoverHeight || roomBelow >= roomAbove;
  const top = placeBelow
    ? box.top + box.height + TOUR_POPOVER_GAP_PX
    : box.top - TOUR_POPOVER_GAP_PX - popoverHeight;
  const centred = box.left + box.width / 2 - width / 2;
  return {
    top: clamp(top, TOUR_POPOVER_EDGE_PX, viewport.height - popoverHeight - TOUR_POPOVER_EDGE_PX),
    left: clamp(centred, TOUR_POPOVER_EDGE_PX, viewport.width - width - TOUR_POPOVER_EDGE_PX),
    side: placeBelow ? TourPopoverSide.Below : TourPopoverSide.Above,
  };
}

/** The current window size. */
export function readTourViewport(): TourViewport {
  return { width: window.innerWidth, height: window.innerHeight };
}
