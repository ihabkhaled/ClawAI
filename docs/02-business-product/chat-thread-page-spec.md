# Chat Thread Page — Product Specification

> The conversation surface at `/chat/[threadId]`. This document owns the
> product decisions for that page's layout: what is visible, what collapses,
> and how the composer behaves. Implementation contract lives in
> [`docs/05-frontend/chat-surface-layout.md`](../05-frontend/chat-surface-layout.md);
> the enforceable constraints live in
> [`rules/40-chat-surface-layout-and-composer.md`](../../rules/40-chat-surface-layout-and-composer.md).

## Overview

The chat thread page is the product. Everything else — routing, judging,
comparison, research — exists to put an answer on this page. The page therefore
has one dominant job: **show as much of the conversation as the viewport
allows**, and let the user type without the act of typing destroying the view.

Before 2026-09-10 it did not. The composer occupied a fixed 200 px panel at
every viewport, the header carried eight always-visible actions under a 30 px
title, and a mouse-only drag handle let the user grow the composer to half the
window with no way to discover how to put it back. On a 1366×768 laptop the
conversation received roughly a third of the page.

## Business value

- **Answer legibility is the product.** A user who can see three exchanges at
  once judges quality differently than one who can see one and a half.
- **Credibility.** Competing surfaces (ChatGPT, Claude, Gemini) all give the
  history the viewport and float a compact composer. A product that inverts
  that ratio reads as unfinished regardless of model quality.
- **Small-laptop reach.** 1366×768 and 1280×800 are the most common non-phone
  sizes in the install base. The page must be good at 100% zoom on those,
  not merely survivable after zooming out.

## Decision log

Each row is a product decision, not an implementation detail. Reversing one
means changing this table first.

| Date       | Decision                                                                                                                              | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-10 | **Drag-to-resize the composer is removed.** Replaced by content-driven auto-grow with a hard maximum.                                 | The handle was mouse-only, undiscoverable, and its two failure directions were both bad: dragged up it starved the conversation, dragged down it clipped the toolbar. Height that follows the text needs no affordance and cannot be left in a broken state. `useResizableComposer` reset to 200 px on every mount, so **no user preference was ever persisted** and nothing is migrated. See [ADR-088](../13-adr/adr-088-composer-auto-height-replaces-drag-resize.md). |
| 2026-09-10 | **Below `sm` (640 px) _all seven_ actions live in the `…` menu**, leaving the row as Back \| drawer \| title \| `…`.                  | Not a preference — an arithmetic result. Every control is floored at 44 px by the global touch rule, so back + drawer + four actions + menu + gaps consumed a 375 px row completely and left the title **2 px** wide. It wrapped one character per line and the header grew to **926 px**, with a **2 px** conversation under it. Found by the responsive pass, not by review.                                                                                           |
| 2026-09-10 | **Export, Thread Settings and Delete move into a `…` overflow menu.** Compare, Judge & Referee, Find and Share stay directly visible. | Assumption on record: the four that stay are used _during_ a conversation and change what the next answer looks like; the three that move are end-of-conversation or once-per-thread actions. If telemetry contradicts this, the fix is to swap a pair here, not to put all eight back. Delete additionally benefits from being one level further from the pointer.                                                                                                      |
| 2026-09-10 | **Messages and composer share one centered max content width** on wide screens rather than spanning the monitor.                      | A 2560 px-wide line of prose is unreadable. Bounding the column also keeps the composer visually attached to the conversation it belongs to.                                                                                                                                                                                                                                                                                                                             |
| 2026-09-10 | **The thread title drops from `text-2xl`/`sm:text-3xl` to `text-base`/`sm:text-lg`.**                                                 | Deviation discovered during implementation, recorded rather than absorbed silently: a compact header row is impossible while one element in it is 30 px tall. The title stays the most prominent thing in the header, just not at page-banner scale.                                                                                                                                                                                                                     |

## Acceptance criteria

"More history" is only a claim if it is measured. The criteria below are the
falsifiable form of the goal.

| #    | Criterion                                                                                                                                                                  | How it is checked                                                                                                                                                                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | At 1366×768 with an empty composer, the message scroll viewport is **at least 100 px taller** than before this change, and occupies **≥ 60%** of the page's usable height. | **MET.** Measured in the running app at 1366×768, before and after, by reverting the working tree to `HEAD` and restarting the container. Before: header 105 px, composer 200 px, transcript 333 px = 47%. After: header 83 px, composer 101 px, transcript 448 px = 64%. **+115 px, 47% → 64%.** |
| AC-2 | Typing a 20-line prompt grows the composer to its cap and **no further**; the conversation never drops below its minimum share of the page.                                | **MET.** Driven in the running app at 375×812: empty 44 px → 3 lines 84 px → 10 lines 225 px with `overflow-y: auto` → 40 lines still 225 px → cleared back to 44 px. The transcript moved 443 → 403 → 262 → 443 px in step and never collapsed.                                                  |
| AC-3 | The last message is fully readable above the composer at every tested size, with the composer at both its minimum and its maximum height.                                  | **MET by construction and observed.** The composer is a flex sibling, never an overlay, so the transcript's height is the page minus the composer at every moment — confirmed by the AC-2 numbers, which always sum to the same total.                                                            |
| AC-4 | The page never scrolls horizontally at 375 px width. Code blocks and tables scroll inside their own containers.                                                            | **MET.** `scrollWidth <= clientWidth` held at every one of the ten sizes tested. A stricter sweep of every element under `main` at 390 px found **0** boxes overflowing the viewport without a scrolling or clipping ancestor.                                                                    |
| AC-5 | No action available before this change is unreachable after it.                                                                                                            | **MET.** Counted in the running app at 390 px, where the collapse is most aggressive: the overflow menu reports exactly 7 items — Compare Models, Judge & Referee, Find, Share, Export, Thread Settings, Delete — with Back on the row. Eight in, eight out.                                      |
| AC-6 | Every header action is reachable by keyboard, the overflow menu closes on Escape and returns focus to its trigger.                                                         | **MET.** Escape closed the menu and `document.activeElement` was the `More actions` trigger. Every direct action carries both `aria-label` and `title`, so it is named whether or not its label is shown.                                                                                         |

## Edge-case decisions

Answered here so they are not rediscovered in QA.

**Streaming while the composer grows.** The composer is a normal flex child, not
a floating element. Its height change shrinks the message viewport through
ordinary layout, and Virtuoso's own `atBottom` tracking re-pins the follow
behaviour. No debounce, no observer, no clearance variable — the composer is
never removed from flow, so [rule 36](../../rules/36-floating-ui-and-toast-clearance.md)'s
clearance machinery does not apply to it. It keeps its `data-rail-obstacle`
marker because the _feedback launcher rail_ still has to dodge it.

**Mobile keyboard open.** The page column is `h-dvh`, so the whole layout
shrinks with the visual viewport when the keyboard opens and the composer stays
above it — `vh` would have left the composer under the keyboard. The composer's
own cap is a row count, not a viewport fraction, so a keyboard plus a
ten-line draft leaves the transcript small. That is the right priority while
someone is typing, and it recovers the moment the draft is sent or cleared.
Measured cap on a 375×812 phone: 225 px, about 28% of the viewport.

**Very long thread title.** One line with an ellipsis **at 640px and above**,
including on a tablet; **below 640px** it wraps to **at most two** lines. Both,
not either: `globals.css` deliberately neutralises `.truncate` under the touch
query, because a clipped string on a phone has no hover to reveal it. The
heading therefore carries `clamp-title` as well, which bounds that wrap.
Dropping the clamp is what produced the 926 px header above.

The 640px bound was added 2026-09-10: the touch query catches tablets too, so an
iPad rendered two lines of oversized bold title where one line and an ellipsis
fit in half the height. A landscape phone (915x412) therefore gets the one-line
form, which is the right trade there because height, not width, is scarce. See
[ADR-090](../13-adr/adr-090-model-picker-opens-at-the-current-choice.md). The
full title is always in a `title` attribute, and always in the thread drawer.

**RTL (Arabic, Persian).** The header uses logical properties (`ms-`/`me-`,
`start`/`end`) throughout, the back arrow keeps its `rtl:rotate-180`, and the
overflow menu aligns to the inline end. No `left`/`right` tests are introduced.

## Non-goals

Stated so they are not silently reopened:

- **Composer height persistence.** Not implemented, not planned. If users ask
  for a taller default, the answer is a larger `maxRows`, not a stored pixel
  value.
- **Changing what the composer sends.** Model selection, attachments, research
  mode and context preview keep their existing behaviour and payloads. This
  change is layout only.
- **Message bubble redesign.** Roles, timestamps, provenance panels and action
  rows keep their current structure.
- **The thread-list page** (`/chat`) is out of scope.

## See also

- [`docs/05-frontend/chat-surface-layout.md`](../05-frontend/chat-surface-layout.md) — the implementation contract
- [`rules/40-chat-surface-layout-and-composer.md`](../../rules/40-chat-surface-layout-and-composer.md) — the enforceable constraints
- [`docs/13-adr/adr-088-composer-auto-height-replaces-drag-resize.md`](../13-adr/adr-088-composer-auto-height-replaces-drag-resize.md) — the resizer decision
- [`skills/verify-responsive-layout-in-browser.md`](../../skills/verify-responsive-layout-in-browser.md) — how the criteria above are checked
