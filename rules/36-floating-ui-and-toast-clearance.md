# 36 — Floating UI and Toast Clearance

## Purpose

Anything pinned to an edge is competing for that edge with everything else
pinned to it, and each was written by somebody who reasonably assumed the corner
was theirs.

The bottom edge is the crowded one: the mobile bottom nav, the chat "new thread"
FAB, the global feedback launcher, the PWA install prompt and the composer all
live there. Measured in the running app at 929×861, a toast column rising from
y 845 covered the feedback launcher (861–913 × 797–837) and the install prompt
(209–721 × 670–829); on a phone it started at exactly `nav height + 1rem`, which
is exactly where the chat FAB begins.

**Toasts now stack from the TOP edge** (product decision, 2026-08-28). This
reverses an earlier call that moved them to the bottom for one-handed reach. The
bottom turned out to be where everything else already lives, so the column had
to dodge five different things and landed somewhere different on every page. The
reach and notch objections still stand and are answered by `safe-top` plus the
measured offset, not by moving back.

The top edge is not empty either — the header is pinned there, and a trial
banner stacks under it — so the same measurement applies, just from the other
edge. A constant cannot know whether a band is on screen right now, how tall it
is at this breakpoint, or which side it sits on in Arabic.

## Applies to

Every element in `claw-frontend` that is `position: fixed` (or otherwise floats
above the page) in the region where toasts stack, and the toast viewport itself.

## Mandatory rules

1. **An edge-pinned element declares itself.** Add `data-top-obstacle` to any
   band pinned across the top (headers, banners), and `data-rail-obstacle` to
   bottom-anchored page furniture the floating rail would land on (the
   composer). `useFloatingObstacleClearance` measures the real box and the
   dependent column moves. Nothing else is required of the element.

2. **Never hardcode a clearance.** `bottom-20`, `bottom-[5rem]`,
   `nav height + 1rem` and `top-16` are how the collision happened. The offset
   is a custom property written from a live measurement:
   `--toast-top-clearance` for the toast column, `--rail-obstacle-clearance`
   for the rail.

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
   column clears top-anchored bands (`data-top-obstacle`). The rail clears
   bottom-anchored page furniture (`data-rail-obstacle`). They measure from
   opposite edges — `FloatingClearanceEdge` picks which — and merging them would
   ask each column to dodge things it never touches.

   A third registry, `data-floating-obstacle`, existed while toasts were
   bottom-anchored so the column could dodge the launcher and the FAB. Moving
   toasts to the top left it with no consumer, and it was removed rather than
   left as a tag that looks meaningful and does nothing.

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

- A band pinned across the top edge with no `data-top-obstacle`.
- A bottom-anchored composer or action bar with no `data-rail-obstacle`.
- A cleanup that cancels a pending frame without clearing its handle.
- A magic-number bottom offset that encodes another component's height.
- A Tailwind class assembled by template interpolation.
- A left/right test where an overlap test would do.
- Reserving space for an element that is not currently visible — measure, do not
  assume.

## Definition of done

- [ ] Every new band pinned across the top carries `data-top-obstacle`.
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
