# ADR-052: Shared `RichPromptTextarea` + `use-sticky-bottom-scroll` Hook

**Status**: Accepted
**Date**: 2026-05-30
**Deciders**: ClawAI core team

## Context

Two recurring UX problems surfaced during the 2026-05 compare-mode rollout:

1. **Prompt entry consistency**. The main chat composer was a multiline
   shadcn `<Textarea>` with autosize, Enter-to-submit, Shift+Enter-newline,
   and IME-safe composition handling all inlined into `MessageComposer.tsx`.
   The new in-thread compare panel needed the same behaviour for its
   per-lane prompt input but shipped initially with a single-line shadcn
   `<Input>` because reaching into `MessageComposer` would have bloated it
   beyond the 50-line method ceiling. Users complained that pasting a
   multi-paragraph prompt into the compare panel collapsed to one row.

2. **Streaming-token auto-scroll**. The chat thread (and the per-lane
   compare output panel) renders messages with a virtualized list. When
   tokens stream in, the user expects the viewport to auto-scroll IF
   they're at the bottom and to STAY where they are if they've scrolled
   up to read history. The legacy implementation was a `useEffect(() =>
   ref.current?.scrollIntoView())` in the page, which yanked the viewport
   down even while the user was scrolling up. Multiple bug reports
   ("the page keeps fighting me when I try to copy mid-response").

The CLAUDE.md frontend rules also explicitly forbid:

- defining sub-components inside `.tsx` files
- using `useState`/`useEffect`/`useCallback` directly in pages
- duplicating logic across feature surfaces

So the fix had to be a real, reusable component + hook pair — not a
copy-paste into each surface.

## Decision

Extract two shared primitives, both designed to be reusable across any
authoring or scroll-following surface in the app:

### 1. `RichPromptTextarea` (`src/components/chat/rich-prompt-textarea.tsx`)

A `forwardRef` shadcn `<Textarea>` wrapper that:

- Autosizes from `minRows` to `maxRows` then enables internal scroll
- Handles Enter → `onSubmit` (when value non-empty after trim AND
  `!disabled`); Shift+Enter inserts a newline
- Tracks `compositionStart`/`compositionEnd` + `nativeEvent.isComposing`
  to never submit while a CJK/IME composition is in flight
- Forwards the inner ref via `useImperativeHandle` so parents can
  imperatively focus

The TSX is pure render composition. All imperative DOM work (autosize
math, key handling, composition tracking) lives in
`use-rich-prompt-textarea` (`src/hooks/chat/use-rich-prompt-textarea.ts`)
per the "TSX = render only" rule.

Adopters today: `MessageComposer` (main chat) + the in-thread compare
panel's per-lane prompt input. Future adopters: any new rich prompt
entry surface (e.g. system-prompt editor, context-pack item editor).

### 2. `use-sticky-bottom-scroll` (`src/hooks/chat/use-sticky-bottom-scroll.ts`)

A hook with the contract:

```typescript
const { scrollRef, sentinelRef, isAtBottom, scrollToBottom } =
  useStickyBottomScroll({ contentSignal, threshold });
```

Wiring:
- Attach `scrollRef` to the `overflow-y: auto` container
- Render `<div ref={sentinelRef} />` as the LAST child of that container
- Pass any value that changes when content grows (typically
  `messages.length + streamingText.length`) as `contentSignal`

Implementation primitives (all in one hook to keep the API surface tiny):

- **IntersectionObserver** on the sentinel — primary "is the user at the
  bottom" signal
- **Scroll listener** on the container — detects the within-`threshold`
  band before the sentinel scrolls into view (needed when long footer
  content is rendered)
- **ResizeObserver** on the sentinel's parent — catches fast token
  streaming growth (parent height jumps before the scroll listener fires)
- **`requestAnimationFrame`** wraps the actual `scrollIntoView` write so
  React renders finish flushing before scrollTop mutates — this is what
  eliminates the visible "jumping" you get from synchronous writes

The UX contract:
- At-bottom: every `contentSignal` change auto-scrolls
- Scrolled up beyond `threshold`: auto-scroll is paused
- Pages render a small "jump to latest" button when `isAtBottom: false`
  and call `scrollToBottom('smooth')` on click

Adopters today: the main chat thread view + the in-thread compare per-lane
output panel. Future adopters: any virtualized-content surface that
streams (e.g. log viewer, agent terminal).

## Alternatives considered

**Inline the autosize textarea into the compare panel**. Rejected. The
panel TSX is already approaching the 500-line file ceiling and the
autosize/IME logic alone is ~80 lines of imperative DOM work — copying
it would violate both the file-size discipline rule and the
"no-inline-sub-components" rule.

**Build a third-party-component-based textarea (react-textarea-autosize)**.
Rejected because the shadcn `<Textarea>` is the project standard and we
already control all its styling. Adding a third-party autosize component
introduces a styling drift between the new component and every other
textarea in the app. The custom hook is ~60 lines of imperative DOM —
not a meaningful maintenance burden.

**Use a `MutationObserver` instead of `ResizeObserver` for streaming-token
catch-up**. Rejected because MutationObserver fires on every text-node
edit (1× per token streamed in some chunked SSE setups), causing a
spike-y scroll cadence. ResizeObserver fires when the parent's box
changes height, which batches across token chunks for a smoother scroll.

**`element.scrollIntoView({ behavior: 'smooth' })` on every token**.
Rejected because smooth-scroll cancels on user input — a user trying to
scroll up during a token stream would have their gesture absorbed by an
ongoing programmatic smooth-scroll. Using `behavior: 'auto'` inside `rAF`
finishes the scroll synchronously between frames, leaving the next gesture
free to take over.

**Two separate hooks (one for the sentinel observer, one for the
auto-scroll effect)**. Rejected because the two are inseparable in
practice — the auto-scroll effect needs to read the latest `isAtBottom`
without re-subscribing, which is solved cleanly in one hook by mirroring
the state in a ref. Splitting them would force consumers to wire both
hooks in lock-step, with the same refs threaded through both.

## Consequences

**Positive**
- One implementation of "rich prompt textarea" used everywhere. New
  authoring surfaces inherit autosize + Enter-submit + IME safety for
  free.
- One implementation of "scroll-follow streaming content" used everywhere.
  The fights-the-user scroll bug is gone for every adopter at once.
- Tested in isolation (`rich-prompt-textarea.test.tsx`,
  `use-sticky-bottom-scroll.test.tsx`) instead of being re-verified per
  surface.
- The TSX/hook split matches the project rule — pages and components stay
  pure render composition.

**Negative**
- Two new shared primitives to discover and document. Mitigated by
  adding both to `docs/05-frontend/component-architecture.md` and the
  `RichPromptTextarea` entry in `CLAUDE.md`'s Key Chat Components list.
- Adopters must remember to wire the `sentinelRef` as the LAST child of
  the scroll container — if it's positioned anywhere else, the
  IntersectionObserver fires at the wrong threshold. Captured in the
  hook's JSDoc.
- `useImperativeHandle` adds one render-cycle delay before parents can
  programmatically focus the textarea. Acceptable; only matters in
  test-driven focus assertions.

**Doesn't fix**
- Mobile keyboard quirks (iOS Safari "compositionend doesn't fire on
  voice dictation done") are still vendor bugs. We track them in the
  iOS QA matrix, not in the hook.
- The autosize math measures `scrollHeight` once per keystroke, which is
  O(n) in textarea content length. For >50k-char prompts the input lag
  becomes visible. Acceptable — the DTO maxes content at 100k anyway and
  the bottleneck is the LLM, not the textarea.

## Verification

- `rich-prompt-textarea.test.tsx`: Enter submits, Shift+Enter doesn't,
  IME composition swallows Enter, ref forwarding works.
- `use-sticky-bottom-scroll.test.tsx`: pins at bottom when contentSignal
  changes, pauses when scrolled past threshold, `scrollToBottom`
  reactivates the pin.
- Manual QA: stream a long compare response, scroll up mid-stream,
  confirm viewport stays still; click "jump to latest", confirm scroll
  resumes following tokens.
- Manual QA on iOS Safari + macOS Safari + Chrome + Firefox to confirm
  IME composition handling across browsers.
