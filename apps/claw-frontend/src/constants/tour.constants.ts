/** localStorage key prefix for what a person has already seen. The account id is appended. */
export const TOUR_STORAGE_KEY_PREFIX = 'claw.tours.v1';

/** How long a step waits for its element to appear (it may render after a query resolves). */
export const TOUR_TARGET_WAIT_MS = 1500;

/** How often the wait looks again. */
export const TOUR_TARGET_POLL_MS = 100;

/** Breathing room around the highlighted element, in pixels. */
export const TOUR_SPOTLIGHT_PADDING_PX = 6;

/** The gap between the highlighted element and the tour card, in pixels. */
export const TOUR_POPOVER_GAP_PX = 12;

/** The card's width, and the room it needs from the viewport edge. */
export const TOUR_POPOVER_WIDTH_PX = 340;
export const TOUR_POPOVER_EDGE_PX = 12;

/** The card is taller than this only for very long copy; used to decide below versus above. */
export const TOUR_POPOVER_ESTIMATED_HEIGHT_PX = 220;

/** After landing on a page, wait this long before offering its tour, so the page can settle. */
export const TOUR_OFFER_DELAY_MS = 2500;

/** The attribute that marks a tour target in the page. */
export const TOUR_TARGET_ATTRIBUTE = 'data-tour';

/** Keys the running tour listens for. */
export const TOUR_KEY_ESCAPE = 'Escape';
export const TOUR_KEY_NEXT = 'ArrowRight';
export const TOUR_KEY_BACK = 'ArrowLeft';
