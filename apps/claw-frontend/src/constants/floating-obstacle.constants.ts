/**
 * The floating-element registry, as a DOM contract rather than a list.
 *
 * A hardcoded list of obstacles goes stale the moment somebody adds a floating
 * button, and it cannot know whether that button is on screen right now, how
 * tall it is at this breakpoint, or which side it sits on in Arabic. So an
 * element declares itself instead: it carries the attribute below, and the
 * clearance is *measured*.
 *
 * Add `data-floating-obstacle` to any element that floats above the page in the
 * region where toasts stack, and the toast column will make room for it.
 */
export const FLOATING_OBSTACLE_ATTRIBUTE = 'data-floating-obstacle';
export const FLOATING_OBSTACLE_SELECTOR = '[data-floating-obstacle]';

/**
 * The custom property the toast viewport reads.
 *
 * A CSS variable rather than a computed class: Tailwind scans source text, so a
 * class assembled at runtime is one it never generates. The viewport keeps one
 * static `calc()` and the number inside it moves.
 */
export const FLOATING_CLEARANCE_VARIABLE = '--toast-obstacle-clearance';

/** Air between the tallest obstacle and the first toast. */
export const FLOATING_CLEARANCE_GAP_PX = 12;

/**
 * Clearance is capped so a full-height floating panel cannot push toasts off the
 * top of the screen. Past this, overlapping is the lesser failure.
 */
export const FLOATING_CLEARANCE_MAX_RATIO = 0.5;
