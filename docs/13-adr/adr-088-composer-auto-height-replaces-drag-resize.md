# ADR-088: The chat composer sizes itself, and the drag handle is gone

**Status**: Accepted
**Date**: 2026-09-10
**Deciders**: ClawAI core team
**Slice**: Chat thread surface (`/chat/[threadId]`, `apps/claw-frontend`)

## Context

The composer on `/chat/[threadId]` was a fixed-height panel with a drag handle:

```ts
// apps/claw-frontend/src/constants/chat.constants.ts  (removed by this ADR)
export const COMPOSER_MIN_HEIGHT = 80;
export const COMPOSER_MAX_HEIGHT_RATIO = 0.5;
export const COMPOSER_DEFAULT_HEIGHT = 200;
```

`useResizableComposer` held that number in React state, `ChatThreadShell`
wrote it into a `--composer-h` custom property, and on `md+` the textarea
stretched to fill it — whatever the user had typed, and whatever the viewport
was. Three things followed from that, and all three were bad:

1. **The default was wrong at every size.** 200 px is a quarter of a 768 px-tall
   laptop viewport, spent on an empty text field. The conversation — the thing
   the page exists to show — got what was left over.
2. **Both drag directions failed.** Dragged up, the composer could take half the
   window (`COMPOSER_MAX_HEIGHT_RATIO`) and the message list collapsed. Dragged
   down to the 80 px floor, the toolbar and the textarea competed for a space
   that fit neither.
3. **The user could not undo it.** The handle was `onMouseDown` only, hidden
   below `md` (`className="… hidden … md:flex"`), so a touch user could neither
   create nor repair the state. There was no reset control and no persistence:
   `useState(COMPOSER_DEFAULT_HEIGHT)` meant a reload silently reverted it,
   which is a worse contract than either remembering or not offering it.

The measurement that matters: a fixed height is a number that something other
than the content has to choose. Nothing on the page is in a position to choose
it well.

## Decision

**The composer has no height. It has a row range, and the content picks the
row count.**

```ts
export const COMPOSER_MIN_ROWS = 1;
export const COMPOSER_MAX_ROWS = 10;
```

Concretely:

1. `useResizableComposer`, the three `COMPOSER_*_HEIGHT*` constants, the
   `--composer-h` custom property, the drag handle and its
   `accessibility.resizeInput` string in 13 locales are **deleted**.
2. `MessageComposer` renders the existing `RichPromptTextarea`, which already
   measures `scrollHeight` after every value change and clamps the result
   between `minRows × line-height` and `maxRows × line-height`, switching
   `overflow-y` on at the ceiling. **No new autosize code was written** — a
   second implementation of the same measurement was rejected outright.
3. The textarea is rendered with `resize-none`. `RichPromptTextarea` defaults
   to `resize-y` and its hook latches "the user dragged, stop autosizing" via a
   `ResizeObserver`; that is right for the compare dialog and wrong here, for
   exactly the reasons in the Context above.
4. The composer stays **in normal flow** — a `shrink-0` flex child under a
   `flex-1 min-h-0` message viewport. It is not fixed, not absolute, and not
   floating in the CSS sense despite looking like a card.

## Consequences

**Good.** The conversation gets every pixel the composer does not need. An empty
composer is one row plus a toolbar, roughly 90 px against the old 200 px, which
is the whole of AC-1 in
[the page spec](../02-business-product/chat-thread-page-spec.md). Typing cannot
produce a broken layout, because the only reachable states are "as tall as the
text" and "at the ceiling, scrolling internally". Nothing above the composer
needs to know its height, so there is no value to thread, persist, or migrate.

**Bad, and accepted.** Manual resize is genuinely gone, and the batch it shipped
in also claimed "no functionality lost". Those two statements are reconciled
here rather than left to collide: **auto-grow to 10 rows is the replacement for
manual resize, not an unrelated change**, and it covers the only use the handle
had — writing a long prompt. What it does not cover is a user who wants a tall
composer over a _short_ prompt, which the handle allowed and nothing now does.
No telemetry says anyone did that, and no preference was persisted for anyone to
lose. If it is asked for, the answer is a larger `COMPOSER_MAX_ROWS`, or a
preference row — not a drag handle whose broken states are unreachable to half
the users who can reach the handle.

**Neutral.** Because the composer stays in flow, none of
[rule 36](../../rules/36-floating-ui-and-toast-clearance.md)'s clearance
machinery applies to it, and no third obstacle registry was introduced. It keeps
its `data-rail-obstacle` marker because the floating feedback launcher still has
to dodge it — that registry is about the rail, not about the composer's own
layout.

## Alternatives considered

**Keep the handle, add bounds and persistence.** Rejected. It fixes the two
failure states but not the reason they existed: the user is being asked to solve
a layout problem the layout should not have. It also adds a stored preference —
and a preference with no reset control is how the unreachable state comes back.

**Write a new `use-auto-grow-textarea` hook for the composer.** Rejected at plan
review. `useRichPromptTextarea` already does this, is already paired with a
pure-render component, and is already used by the in-thread compare panel. A
second measurement of `scrollHeight` in the same app is the duplication the
library-wrapper and reuse rules exist to prevent.

**Make the composer `position: fixed` over the conversation, like a true
floating bar.** Rejected. It buys nothing visually that a card in flow does not,
and it costs a measured bottom clearance that has to stay in step with the
composer's changing height — which rule 36 names as the exact shape of the
collision bugs already paid for once.

## Revisit when

- Users ask for a tall composer over a short prompt, with a real reason.
- `COMPOSER_MAX_ROWS` at 10 turns out to clip a common prompt shape.
- The composer ever needs to leave normal flow — at which point rule 36's
  clearance engine is the mechanism, and its §5 registry list must be amended in
  the same commit.

## See also

- [`docs/02-business-product/chat-thread-page-spec.md`](../02-business-product/chat-thread-page-spec.md) — the product decisions and acceptance criteria
- [`docs/05-frontend/chat-surface-layout.md`](../05-frontend/chat-surface-layout.md) — the layout contract this enables
- [`rules/40-chat-surface-layout-and-composer.md`](../../rules/40-chat-surface-layout-and-composer.md) — the enforceable form
- [`rules/36-floating-ui-and-toast-clearance.md`](../../rules/36-floating-ui-and-toast-clearance.md) — why staying in flow was the cheap answer
