import { THREAD_FOLLOW_SNAP_PX } from '@/constants/thread-generation-progress.constants';

const SCROLLING_OVERFLOW = ['auto', 'scroll', 'overlay'];

/**
 * The element that really scrolls for `element`: the app scrolls inside `<main>`, not the window.
 * Prefers `<main>`, then the nearest ancestor that scrolls and is already overflowing, then the
 * document.
 */
export function findScrollContainer(element: Element): Element {
  const main = element.closest('main');
  if (main !== null) {
    return main;
  }
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    if (
      SCROLLING_OVERFLOW.includes(getComputedStyle(node).overflowY) &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
  }
  return document.scrollingElement ?? document.documentElement;
}

/**
 * How far to move this frame so the distance shrinks exponentially, independent of the frame rate:
 * `timeConstantMs` covers about 63% of what is left, and the last pixel snaps. Always at least one
 * pixel while there is distance left, so browsers that round scroll positions never stall.
 */
export function easedScrollStep(distancePx: number, dtMs: number, timeConstantMs: number): number {
  if (distancePx <= THREAD_FOLLOW_SNAP_PX) {
    return Math.max(distancePx, 0);
  }
  const step = distancePx * (1 - Math.exp(-dtMs / timeConstantMs));
  return Math.min(distancePx, Math.max(step, THREAD_FOLLOW_SNAP_PX));
}

/**
 * Pixels still to scroll so the end marker's bottom meets the container's bottom: never negative
 * (the follow only moves forward) and never past the true bottom. Content below the marker (a
 * verdict panel that appears when the job settles) is deliberately not part of the target.
 */
export function distanceToEndMarker(container: Element, marker: Element): number {
  const remaining = container.scrollHeight - container.clientHeight - container.scrollTop;
  const isDocument = container === (document.scrollingElement ?? document.documentElement);
  const containerBottom = isDocument
    ? window.innerHeight
    : container.getBoundingClientRect().bottom;
  const toMarker = marker.getBoundingClientRect().bottom - containerBottom;
  return Math.max(0, Math.min(remaining, toMarker));
}
