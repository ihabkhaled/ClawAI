# ADR-163: Product tours are data, point at `data-tour` elements, and never act for the person

**Status:** Accepted

**Date:** 2026-10-07

## Decision

The portal has a tour library. A tour is one entry in `TOUR_DEFINITIONS` (`constants/tours.constants.ts`): an id, the routes it is offered on, and ordered steps. A step is a stable id plus the `data-tour` value of the element to highlight (or `null` for a centered card). The words live in `constants/tours-content/<locale>.constants.ts`, keyed by the same tour and step ids, in all 13 locales.

Rules the engine keeps:

1. **It never clicks, types or navigates for the person.** It dims the page, cuts a window around the target and shows a card. The person does the real thing.
2. **It never starts by itself.** A first visit shows a small "take a 1-minute tour" offer after a short delay; the person says yes. Every tour is also reachable from the help button in the top bar.
3. **A missing element is not an error.** If the target is not on screen after 1.5 seconds the step shows as a centered card, so a small screen, a hidden control or a plan that lacks a feature never breaks a tour.
4. **Progress is a browser convenience.** Completed tours and dismissed offers are kept in `localStorage` per account (`claw.tours.v1:<userId>`). Blocked or corrupt storage reads as "nothing seen yet". No database, no API.
5. **Escape or Skip leaves at any time.** The card is a labelled dialog; focus lands on Next; arrows move.

Ten tours ship: Threads page, Thread create, Thread review, Chat basics, Choosing models, Research, Adding context, Turn a chat into a Thread, Compare, Context packs.

## Rationale

A hard-coded walkthrough library would need one change per page. Targets by attribute and copy by id keep a tour a few lines of data, and a test (`tours-content-completeness.test.ts`) fails when a step has no text in a locale or points at a `data-tour` that no component carries.

## Consequences

- Adding a tour is data plus attributes: see `skills/add-a-product-tour.md`.
- Removing or renaming a `data-tour` attribute fails the completeness test.
- Because the tour never clicks, the Thread-create steps show centered cards when the create dialog is closed.
- No tour state is shared across devices.

QA: `docs/qa-evidence/2026-10-07-product-tours.md`.
