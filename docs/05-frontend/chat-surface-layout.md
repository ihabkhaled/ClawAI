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
