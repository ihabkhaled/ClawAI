# Chat surface layout — the implementation contract

> How `/chat/[threadId]` is built, file by file. The product decisions behind it
> live in
> [`docs/02-business-product/chat-thread-page-spec.md`](../02-business-product/chat-thread-page-spec.md);
> the enforceable constraints in
> [`rules/40-chat-surface-layout-and-composer.md`](../../rules/40-chat-surface-layout-and-composer.md).

## The height chain

Percentage and `flex-1` heights only work if every ancestor has a definite one.
The chain, top to bottom, is:

| Element                                     | File                                       | What it contributes                                                                               |
| ------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `div.h-dvh`                                 | `components/layout/portal-shell.tsx`       | The definite height everything else divides up. `dvh`, not `vh`, so a mobile keyboard shrinks it. |
| `div.flex-1.flex-col`                       | same                                       | The content column beside the sidebar. Carries the bottom-nav margin on phones.                   |
| `main.flex-1.overflow-y-auto`               | same                                       | Definite height from flex. Its padding is what insets the chat page.                              |
| `div.flex.h-full.min-h-0.flex-col`          | `components/chat/chat-thread-shell.tsx`    | The chat page column.                                                                             |
| header `shrink-0` · column `flex-1 min-h-0` | same                                       | The split. Only the column grows.                                                                 |
| `div.min-h-0.flex-1.overflow-hidden`        | same                                       | The transcript frame.                                                                             |
| `Virtuoso style={{height:'100%'}}`          | `components/chat/virtualized-messages.tsx` | The scroller.                                                                                     |

Break any `min-h-0` in that chain and the symptom is always the same: the
transcript refuses to shrink below its content and pushes the composer off the
bottom of the screen instead of scrolling.

## The composer

`components/chat/message-composer.tsx` is pure render over exactly one hook,
`hooks/chat/use-message-composer.ts`. That hook composes three others
(`useTranslation`, `usePlanFeatures`, `useMessageComposerState`) which the
component used to call itself, and resolves the viewport once through
`useMediaQuery(MEDIA_QUERY_LG_UP)`.

Height comes from `RichPromptTextarea` — the same component the in-thread
compare panel uses — bounded by `COMPOSER_MIN_ROWS` and `COMPOSER_MAX_ROWS`.
There is no autosize code in the composer itself and there must not be; see
[ADR-088](../13-adr/adr-088-composer-auto-height-replaces-drag-resize.md).

Two overrides are passed deliberately in `className`, and `cn()` merges them
over the shared component's defaults:

- `resize-none` beats its `resize-y`. The native handle is what let the old
  composer be left in a state the user could not undo.
- `min-h-0 border-0 bg-transparent shadow-none focus-visible:ring-0` strips the
  shadcn field frame, because the card around the whole composer is the frame.

One text size at every breakpoint (`text-base`, with the base `Textarea`'s
`touch:text-[16px]` handling iOS zoom). `useRichPromptTextarea` measures
line-height once; a responsive font size would leave the row ceiling computed
against a line height that no longer applies.

`components/chat/composer-toolbar.tsx` is the control row, rendered **once**.
Which variant each control takes is a prop from the controller hook, not a
Tailwind prefix — see rule 40 §9 for why. The row scrolls sideways rather than
wrapping, so a long provider name cannot cost the conversation a line, and it
carries `scrollbar-none`: the overflow is typically a couple of pixels and a
classic scrollbar is 15px tall, so the bar cost more height than the overflow it
reported.

Every control in that row is `shrink-0` with a declared width, and none is
`flex-1`. A `flex-1` control shrinks below its own content when the row runs
out of room: once the model trigger started showing a name, the research select
collapsed to `N…` in about 90px on a 375px screen. A control narrower than one
word of its own value is not a smaller control, it is a broken one. Overflow is
the row's problem, and the row scrolls.

Hiding the scrollbar then owes the reader a signal, which
`.scroll-fade-inline-end` supplies: the last 1.5rem fades, so a clipped control
reads as "there is more this way". It costs no height, has an RTL counterpart,
and uses `mask-image` rather than a gradient overlay because an overlay would
need the card's own background colour and that changes with the theme.

The decorative globe beside the research select is hidden below `sm`. It is
`aria-hidden` and the select next to it says "No research" in words; it was
worth 20px of a 375px row.

## The model picker

`components/chat/model-picker.tsx` is render-only over
`hooks/chat/use-model-picker.ts`. The decisions below are recorded in
[ADR-090](../13-adr/adr-090-model-picker-opens-at-the-current-choice.md).

**It is shared, so read this as seven screens and not one.** Besides the
composer's `model-selector.tsx`, the picker is used by
`advanced-module-model-selector.tsx`, `compare-critic-controls.tsx`,
`compare-judge-controls.tsx`, `image-error-state.tsx`,
`image-generation-bubble.tsx` and
`orchestration/orchestration-single-model-select.tsx`. All of them inherit the
seeded highlight, the `value`→`keywords` swap and the bounded popover height.
Only the trigger label differs, because `useShortTriggerLabel` is opt-in.

The hook exists for one behaviour that cannot live in the view.

**cmdk's `value` is the HIGHLIGHT, not the selection.** The picker never set it,
so a list of ~180 models opened at scroll position zero every time and a model
near the bottom had to be scrolled back to on every visit. The hook seeds the
highlight from the current selection **when the picker opens**, and cmdk scrolls
that row into view for us. It has to be state and not a fixed prop, because
after opening the highlight belongs to the keyboard: arrow keys and typing move
it, and pinning it to the selection would break both.

That forced a second change. Each item's cmdk value is now the option's own
`value` rather than its label — the seed matches by identity, and two providers
can ship the same display name. The label moved to `keywords`, which cmdk
searches alongside the value, so typing a model name still finds it.

**The trigger always says something.** Compact mode used to render a 36px square
whose only label was `sr-only`; on a phone, where the header does not repeat it,
nothing on screen said which model would answer. It now shows
`ModelPickerOption.shortLabel` (falling back to `label`) inside a bounded width,
with the full name on `title`, on `aria-label`, and as the sheet's own title —
which previously read the literal word "Auto" whatever was selected.

**The list is `flex-1 min-h-0 max-h-none`, never a `dvh` fraction.** The shadcn
`CommandList` ships `max-h-[min(300px,55dvh)]`, which cannot see the header,
search box and footer around it: on a 500px-tall viewport it claimed its 275px
and pushed the footer out through the bottom of the sheet, so the credit
disclaimer read "Local models draw from" and stopped. The wrapper around the
command box must also be a flex column — as a block it gave the box nothing to
stretch against, so the box sized to its content and had its footer clipped.

## The header

One row, `shrink-0`, sticky, frosted. Left to right: back, thread drawer, title
block, direct actions, overflow menu.

- **Direct** (`sm` and up only): Compare, Judge & Referee, Find, Share.
  Icon-only up to `lg`, where the label appears; `aria-label` and `title` carry
  the name either way. Below `sm` they are not rendered at all — the row becomes
  Back | drawer | title | `…`.
- **Overflow** (`components/chat/chat-thread-header-menu.tsx`): Export, Thread
  Settings, Delete — plus the four above when the row is too narrow for them.
  Radix owns the keyboard contract — arrows move, Escape closes and restores
  focus to the trigger.
- **Title**: `components/chat/editable-title.tsx`. One line on desktop, clamped
  to two on a phone, full text in `title`. It carries **both** `truncate` and
  `clamp-title`: `globals.css` deliberately neutralises `.truncate` under the
  touch query (a clipped string has no hover to reveal it), so without the clamp
  a long title wraps unbounded. Measured at 375px, it wrapped one character per
  line into a 926px header. Its three labels come from `useEditableTitle` rather
  than a second `useTranslation` call in the component.

The seven-controls-at-375px failure is why the header is driven by
`MEDIA_QUERY_SM_UP` from `useThreadDetailPage` rather than by `sm:hidden`: the
row buttons and the menu items are different components, and hiding one with a
prefix would keep both mounted.

## The reading column

`.chat-content-column` in `app/globals.css` reads `--chat-content-max`
(68rem). Both the transcript frame and the composer take it, so they stay
aligned and cannot drift. It is wide enough not to bind on a 1366 px laptop,
where the portal leaves roughly 1060 px between the sidebar and the page
padding.

Message bubbles keep their own `max-w-[88%]`/`sm:max-w-[85%]` inside that
column. Code blocks, tables and long URLs are handled in
`lib/markdown/markdown-components.tsx` (`overflow-x-auto` on `pre` and on the
table wrapper, `break-words` on prose, `max-w-full` on images) — the page body
itself never scrolls sideways.

## Scrolling

Owned by Virtuoso and `hooks/chat/use-virtualized-messages-controller.ts`:

- `followOutput` returns `'smooth'` only when the user is already at the bottom,
  so a user reading history is never yanked forward.
- `atBottomThreshold` is `STICKY_BOTTOM_THRESHOLD_PX`.
- `JumpToLatestButton` appears whenever the user is away from the bottom, with
  an unread count of assistant render-groups accumulated since they scrolled up.
- `useFollowStreamingTokens` keeps the view pinned during a stream, again only
  while the user is at the bottom.

None of that changed in the layout revamp, and none of it needs to know the
composer's height — the transcript shrinks by exactly that height through
ordinary flex layout.

## The title clamp is bounded by width, deliberately

`clamp-title` wraps a thread title to two lines instead of truncating it,
because a clipped title on a 375px header cannot be revealed. That rule lives
inside the touch media query, which catches tablets too — so an iPad with a
900px-wide header rendered two lines of oversized bold text where one line and
an ellipsis would have said the same thing in half the height. From 640px up the
clamp reverts to a single-line ellipsis.

That is a **width** guard inside a **pointer** query, which
[rules/03 §7](../../rules/03-frontend-rules.md) normally forbids: a width test
misreads a phone in landscape (915x412). The deviation is deliberate. The clamp
trades width for height, and in landscape height is the scarce resource — two
lines of oversized bold title over a 412px-tall viewport is the failure this
avoids, not one it causes. The accepted cost is that a landscape phone gets an
ellipsis with no hover; the full title stays reachable through the thread drawer
and the rename control. Recorded in
[rules/40 §15](../../rules/40-chat-surface-layout-and-composer.md) and
[ADR-090](../13-adr/adr-090-model-picker-opens-at-the-current-choice.md).

`touch-layer.test.ts` guards "mobile guards are pointer-based, not width-based"
by scanning TSX for `max-md:`. It does not read CSS, so it would not catch a
future width guard added here by accident.

## What is deliberately absent

- No fixed pixel heights anywhere on the surface.
- No `position: fixed` composer, therefore no clearance custom property to keep
  in step (see [rule 36](../../rules/36-floating-ui-and-toast-clearance.md)).
- No second autosize implementation.
- No duplicated mobile/desktop control rows.

## See also

- [`skills/verify-responsive-layout-in-browser.md`](../../skills/verify-responsive-layout-in-browser.md) — how to check the above in a real browser
- [`docs/05-frontend/component-architecture.md`](component-architecture.md)
- [`docs/05-frontend/styling-guide.md`](styling-guide.md)
