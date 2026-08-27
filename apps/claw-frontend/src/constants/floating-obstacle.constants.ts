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

/**
 * How many extra frames a measurement may chase a still-moving layout.
 *
 * A breakpoint change moves boxes without resizing them — no mutation, no
 * resize entry — so the single pass a window resize triggers can read the old
 * position and keep it. Re-measuring while the answer changes converges in one
 * or two frames; the cap turns a pathological layout into a wrong number rather
 * than a permanent loop.
 */
export const FLOATING_CLEARANCE_SETTLE_PASSES = 4;

/**
 * The second registry: what the floating *rail* has to clear.
 *
 * The two are not the same set and must not share one. The toast column dodges
 * the launcher; the launcher dodges the composer. Merging them would ask the
 * launcher to dodge itself, and the composer — which is page furniture, not a
 * floating control — would start pushing toasts around for no reason.
 *
 * Add `data-rail-obstacle` to a bottom-anchored element that owns its corner:
 * a composer, a persistent action bar. The rail lifts above it.
 */
export const RAIL_OBSTACLE_ATTRIBUTE = 'data-rail-obstacle';
export const RAIL_OBSTACLE_SELECTOR = '[data-rail-obstacle]';

/** The custom property the rail slot classes read. */
export const RAIL_CLEARANCE_VARIABLE = '--rail-obstacle-clearance';

/** What the toast column measures: every registered floating control. */
export const FLOATING_TOAST_CLEARANCE_CONFIG = {
  selector: FLOATING_OBSTACLE_SELECTOR,
  variable: FLOATING_CLEARANCE_VARIABLE,
} as const;

/** What the rail measures: bottom-anchored page furniture. */
export const FLOATING_RAIL_CLEARANCE_CONFIG = {
  selector: RAIL_OBSTACLE_SELECTOR,
  variable: RAIL_CLEARANCE_VARIABLE,
} as const;

/** Every attribute that puts an element into one of the two registries. */
export const FLOATING_MEASURED_ATTRIBUTES: readonly string[] = [
  FLOATING_OBSTACLE_ATTRIBUTE,
  RAIL_OBSTACLE_ATTRIBUTE,
];
