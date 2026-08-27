import { FLOATING_CLEARANCE_MAX_RATIO } from '@/constants/floating-obstacle.constants';
import type { FloatingClearanceInput, FloatingObstacleRect } from '@/types';

/** A zero-area node is display:none or not laid out yet — not an obstacle. */
function isRendered(rect: FloatingObstacleRect): boolean {
  return rect.bottom > rect.top && rect.right > rect.left;
}

/**
 * Only an obstacle that shares horizontal space with the toast column matters.
 *
 * A launcher pinned to the opposite corner is irrelevant, and pushing toasts up
 * for it would look like a bug. Written as an overlap test rather than a
 * left/right test so it holds in Arabic and Persian without a second code path.
 */
function overlapsColumn(rect: FloatingObstacleRect, left: number, right: number): boolean {
  return rect.right > left && rect.left < right;
}

/**
 * How far up from the bottom edge the toast column must start.
 *
 * The toast viewport previously reserved exactly one obstacle — the mobile
 * bottom nav — as a hardcoded height, and knew nothing about the feedback
 * launcher, the chat FAB or the install prompt. Measured against a live layout,
 * a toast column starting at the bottom edge overlapped all three.
 *
 * Returns the distance to the top of the tallest overlapping obstacle, plus a
 * gap. Capped at half the viewport so a tall floating panel cannot push toasts
 * off screen — at that point overlapping is the lesser failure.
 */
export function resolveFloatingClearance(input: FloatingClearanceInput): number {
  const blocking = input.obstacles
    .filter(isRendered)
    .filter((rect) => overlapsColumn(rect, input.columnLeft, input.columnRight))
    // An obstacle entirely above the fold does not sit between the bottom edge
    // and the toasts, so it reserves nothing.
    .filter((rect) => rect.bottom > 0 && rect.top < input.viewportHeight);

  if (blocking.length === 0) {return 0;}

  const highestTop = Math.min(...blocking.map((rect) => rect.top));
  const clearance = input.viewportHeight - highestTop + input.gapPx;

  return Math.max(0, Math.min(clearance, input.viewportHeight * FLOATING_CLEARANCE_MAX_RATIO));
}
