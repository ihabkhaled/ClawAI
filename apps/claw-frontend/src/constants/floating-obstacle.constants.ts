import { FloatingClearanceEdge } from '@/enums/floating-clearance-edge.enum';

/**
 * The top-anchored registry: what the toast column has to clear.
 *
 * Toasts stack from the top edge, and the top edge already belongs to the app
 * header — and, when a trial is running, to the banner stacked under it. A
 * column pinned to `top-0` covers the search box, the language picker and the
 * account menu, which is the same collision the bottom edge had, moved.
 *
 * Add `data-top-obstacle` to any band pinned across the top of the page.
 */
export const TOP_OBSTACLE_ATTRIBUTE = 'data-top-obstacle';
export const TOP_OBSTACLE_SELECTOR = '[data-top-obstacle]';

/** The custom property the toast viewport reads. */
export const TOAST_TOP_CLEARANCE_VARIABLE = '--toast-top-clearance';

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

/** What the toast column measures: the bands pinned across the top. */
export const FLOATING_TOAST_CLEARANCE_CONFIG = {
  selector: TOP_OBSTACLE_SELECTOR,
  variable: TOAST_TOP_CLEARANCE_VARIABLE,
  edge: FloatingClearanceEdge.TOP,
} as const;

/** What the rail measures: bottom-anchored page furniture. */
export const FLOATING_RAIL_CLEARANCE_CONFIG = {
  selector: RAIL_OBSTACLE_SELECTOR,
  variable: RAIL_CLEARANCE_VARIABLE,
  edge: FloatingClearanceEdge.BOTTOM,
} as const;

/** Every attribute that puts an element into one of the registries. */
export const FLOATING_MEASURED_ATTRIBUTES: readonly string[] = [
  TOP_OBSTACLE_ATTRIBUTE,
  RAIL_OBSTACLE_ATTRIBUTE,
];
