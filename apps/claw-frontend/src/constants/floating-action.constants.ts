/**
 * The mobile floating rail, bottom-end corner.
 *
 * Two independent features pin a round button there: the chat page's "new
 * thread" FAB and the global feedback launcher. They were written separately
 * and landed on the same coordinates — `bottom-20` is 5rem, and so is
 * `nav height (4rem) + 1rem` — so on the chats page the feedback button sat
 * exactly on top of the FAB and, being z-40 against z-30, swallowed every tap
 * meant for starting a thread.
 *
 * Slots make the stacking explicit rather than accidental: slot one is the
 * page's own action, slot two is the global launcher above it. A control that
 * joins the rail takes the next slot instead of guessing an offset.
 *
 * The offsets are written out in full rather than composed from a shared
 * fragment: Tailwind scans source text, so a class assembled by template
 * interpolation is a class it never sees and never generates.
 *
 * `end-*` rather than `right-*`: the rail must mirror in Arabic and Persian.
 * The gap between slots is one slot height (3.5rem, the FAB diameter) plus 1rem
 * of air.
 *
 * The rail's floor is `max(bottom navigation, whatever else owns the corner)`.
 * On most pages the second term is 0 and nothing changes; on a thread page the
 * composer is down there, and the launcher used to sit squarely on top of it —
 * hiding the "Preview context" button entirely and clipping the message box.
 * That is the same tap-stealing failure the slots were introduced to end, one
 * layer up.
 *
 * The second term is measured (`--rail-obstacle-clearance`, published by
 * `useFeedbackLauncher`) rather than written down, because a composer's height
 * follows its content: a number copied from it is wrong the moment it grows a
 * row. Registering furniture is one attribute — see
 * `RAIL_OBSTACLE_ATTRIBUTE`.
 */
export const FLOATING_ACTION_RAIL_SLOT_ONE =
  'fixed end-4 bottom-[calc(max(calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)),var(--rail-obstacle-clearance,0px))+1rem)]';

export const FLOATING_ACTION_RAIL_SLOT_TWO =
  'fixed end-4 bottom-[calc(max(calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)),var(--rail-obstacle-clearance,0px))+5.5rem)]';

/**
 * Desktop drops the rail: the bottom navigation is gone and the chat FAB is
 * `md:hidden`, so the launcher is alone and sits in the corner itself.
 */
export const FLOATING_ACTION_DESKTOP_BOTTOM =
  'md:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]';
