# 36 — Floating UI and Toast Clearance

## Purpose

Toasts stack from the bottom edge. So does the mobile bottom nav, the chat
"new thread" FAB, the global feedback launcher, and the PWA install prompt. Every
one of those was written by somebody who reasonably assumed their corner was
theirs.

The result, measured in the running app at 929×861: the toast column occupies
x 509–929 rising from y 845, the feedback launcher sits at 861–913 × 797–837, and
the install prompt at 209–721 × 670–829. Toasts covered both. On a phone the
column starts at exactly `nav height + 1rem` — which is exactly where the chat
FAB begins.

The viewport had reserved space for precisely one obstacle, the mobile bottom
nav, as a hardcoded height. It knew nothing about anything else, and it could not:
a constant cannot know whether a button is on screen right now, how tall it is at
this breakpoint, or which side it sits on in Arabic.

## Applies to

Every element in `claw-frontend` that is `position: fixed` (or otherwise floats
above the page) in the region where toasts stack, and the toast viewport itself.

## Mandatory rules

1. **A floating element declares itself.** Add `data-floating-obstacle` to any
   element that floats over the page near the bottom edge.
   `useFloatingObstacleClearance` measures the real box and the toast column
   moves out of the way. Nothing else is required of the element.

2. **Never hardcode a clearance.** `bottom-20`, `bottom-[5rem]` and
   `nav height + 1rem` are how the collision happened. The offset is
   `--toast-obstacle-clearance`, written from a live measurement.

3. **A computed Tailwind class is a class that does not exist.** Tailwind scans
   source text, so `` `bottom-[${offset}]` `` generates nothing. Anything dynamic
   goes through a CSS custom property with a static `calc()` or `var()` in the
   class string, with a fallback so the element renders before the first
   measurement.

4. **Two features pinning a control to the same corner share a rail.**
   `FLOATING_ACTION_RAIL_SLOT_ONE`/`_TWO` in
   `constants/floating-action.constants.ts` own the mobile bottom-end stack. A
   third control takes the next slot; it does not invent an offset.

5. **There are two registries, and they are not interchangeable.** The toast
   column clears floating controls (`data-floating-obstacle`). The rail clears
   bottom-anchored page furniture (`data-rail-obstacle`) — a composer, a
   persistent action bar. Merging them would ask the launcher to dodge itself,
   and would let page furniture push toasts around for no reason. The chain runs
   one way: furniture → rail → toast column, each measured from the one below.

   The composer is the case that made this necessary. On a thread page the
   feedback launcher sat squarely on top of it, covering the "Preview context"
   button whole (measured at 390×844: launcher 322–374 × 648–692, composer
   25–365 × 635–755) and clipping the message box. Both slot classes now take
   `max(nav floor, --rail-obstacle-clearance)`.

6. **A measurement has to survive a remount and a breakpoint change.** Two
   failures, both silent:

   - A cleanup that cancels a queued frame must also clear the handle. Leaving a
     cancelled id behind makes the scheduler believe a measurement is already
     pending, and the hook never measures again — the toast column stopped
     dodging anything after the first route change.
   - A box that _moves_ without _resizing_ fires neither a mutation nor a resize
     entry, so the single pass a window resize triggers can read the old
     position and keep it. The measurement re-runs while its own answer keeps
     changing, bounded by `FLOATING_CLEARANCE_SETTLE_PASSES`.

7. **Reason about overlap, not about sides.** `left`/`right` tests need a second
   code path in Arabic and Persian and will be wrong in one of them. The
   clearance rule asks whether an obstacle overlaps the toast column's measured
   horizontal span, which holds in both directions with no branch.

8. **The sheet primitive has physical sides only.** `SheetContent` accepts
   `top | bottom | left | right`. Pick with
   `dir === Direction.RTL ? 'right' : 'left'`, as the marketing mobile menu and
   the chat thread drawer both do. Do not hand it `start`.

9. **`.safe-bottom` and `.safe-top` assign padding, so they beat `p-*`.** They
   live in `@layer utilities` and are declared later, so an element carrying both
   `p-5` and `safe-bottom` ends up with the inset alone — 0px on desktop. Pair
   them with a base class (`safe-bottom-base-5`, `safe-bottom-base-nav`).

10. **Cap any computed clearance.** A tall floating panel must not be able to push
    toasts off the top of the screen. `FLOATING_CLEARANCE_MAX_RATIO` is half the
    viewport; past that, overlapping is the lesser failure.

## Prohibited patterns

- A `fixed` element near the bottom edge with no `data-floating-obstacle`.
- A bottom-anchored composer or action bar with no `data-rail-obstacle`.
- A cleanup that cancels a pending frame without clearing its handle.
- A magic-number bottom offset that encodes another component's height.
- A Tailwind class assembled by template interpolation.
- A left/right test where an overlap test would do.
- Reserving space for an element that is not currently visible — measure, do not
  assume.

## Definition of done

- [ ] Every new floating element carries `data-floating-obstacle`.
- [ ] Every new bottom-anchored page element the rail would land on carries
      `data-rail-obstacle`.
- [ ] No new hardcoded clearance encodes another component's height.
- [ ] The behaviour is asserted in
      `utilities/__tests__/floating-obstacle-clearance.utility.test.ts`, which
      tests the pure decision — including the RTL case and the off-screen case —
      without a browser.

## See also

- `apps/claw-frontend/src/constants/floating-obstacle.constants.ts` — the DOM
  contract and the tuning constants.
- `apps/claw-frontend/src/utilities/floating-obstacle-clearance.utility.ts` — the
  pure decision.
- [`rules/03-frontend-rules.md`](03-frontend-rules.md) — TSX is render-only, so
  the measurement lives in a hook and the decision in a utility.
