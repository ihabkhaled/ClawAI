# 40 — Chat Surface Layout and the Composer

## Purpose

On a conversation page, height is the scarce resource and the conversation is
what it should be spent on. Every element that takes a fixed slice of it is
taking that slice from the answer the user is reading.

The chat thread page lost that argument once already. The composer was a
200 px panel at every viewport with a drag handle that could take it to half
the window; the header carried eight labelled actions under a 30 px title.
On a 1366×768 laptop the message list received roughly a third of the page,
and the two controls that could change that — the drag handle and browser zoom
— were respectively invisible on touch and not a design.

This rule is the shape that replaced it, written so the next surface that needs
a composer does not re-derive it. See
[ADR-088](../docs/13-adr/adr-088-composer-auto-height-replaces-drag-resize.md).

## Applies to

Every full-height conversation surface in `claw-frontend`: `/chat/[threadId]`
today, and any future page built as header + transcript + input.

## Mandatory rules

1. **The transcript is the only element that grows.** The page column is
   `flex flex-col` with a definite height; the header and the composer are
   `shrink-0`; the transcript is `flex-1 min-h-0 overflow-hidden`. `min-h-0` is
   not optional — without it a flex child refuses to shrink below its content
   and the transcript pushes the composer off the bottom instead of scrolling.

2. **No element on a conversation surface carries a fixed pixel height.** Not
   the composer, not the header, not the transcript. A fixed height is a number
   something other than the content had to choose, and nothing on the page is
   in a position to choose it well. Bound growth in _rows_ or in `dvh`, never in
   `px`.

3. **The composer's height comes from its content, between two row bounds.**
   `COMPOSER_MIN_ROWS` / `COMPOSER_MAX_ROWS` in
   `constants/chat.constants.ts`. At the ceiling the textarea scrolls
   internally; it never grows further and it is never left in a state the user
   cannot leave by typing.

4. **Autosize has exactly one implementation.** `useRichPromptTextarea`, via
   the `RichPromptTextarea` component. Do not write a second hook that measures
   `scrollHeight`. A composer that needs different bounds passes different
   `minRows`/`maxRows`; a composer that must not be drag-resized passes
   `resize-none` in `className`, which `cn()` merges over the component's
   `resize-y` default.

5. **A composer that looks like a floating card stays in normal flow.** Rounded,
   bordered and shadowed is styling. `position: fixed` is a layout decision that
   costs a measured bottom clearance on the scroll container, and
   [rule 36](36-floating-ui-and-toast-clearance.md) names a hardcoded version of
   that clearance as a prohibited pattern. If a conversation composer ever does
   have to leave flow, it uses `useFloatingObstacleClearance` and amends rule
   36 §5's registry list in the same commit.

6. **`dvh`, never `vh`, on any cap that has to survive a mobile keyboard.** The
   dynamic viewport unit shrinks when the on-screen keyboard opens, so a cap
   expressed in it follows the keyboard down instead of pushing controls under
   it.

7. **A header row is one row at every width.** Actions past the fourth go into
   an overflow `…` menu; labels are shown only where there is room
   (`lg:` and up) with `aria-label` and `title` carrying the name otherwise.
   A header that wraps is a header that has stopped being compact.

   **Below `sm`, every action goes into the menu.** Count the row before
   designing it: the global touch rule floors each control at 44px, so a 375px
   row holds four of them and the title. Seven left the title 2px wide, and it
   wrapped one character per line into a 926px header with a 2px conversation
   under it.

8. **A heading that truncates needs `clamp-title` as well as `truncate`.**
   `globals.css` deliberately neutralises `.truncate` under the touch query — a
   clipped string on a phone has no hover to reveal it — so a bare `truncate`
   heading wraps without bound there. `clamp-title` caps that wrap at two lines.
   A control label wants `truncate-fixed` instead; prose wants neither.

9. **A control variant is chosen by `useMediaQuery`, not by rendering both.**
   A Tailwind prefix can hide a mounted component; it cannot pick between an
   icon-only trigger and a labelled one. Mounting a mobile row and a desktop row
   side by side with `md:hidden` / `hidden md:flex` mounts every picker, popover
   and query behind them twice. `MEDIA_QUERY_SM_UP` (header actions) and
   `MEDIA_QUERY_LG_UP` (composer labels) exist for this.

10. **The reading column is bounded by a shared token.** Transcript and composer
    both take `.chat-content-column` (`--chat-content-max`), so they cannot drift
    apart, and a line of prose does not run the width of a 2560 px monitor. The
    bound is set wide enough that it does not bind on a 1366 px laptop — a gutter
    where there is no room to spare is the opposite failure.

## Prohibited patterns

- A pixel height, or a ratio-of-window height, for a composer or a transcript.
- A drag-to-resize affordance that is pointer-only, unpersisted, or has no way
  back to a sane state.
- A second `scrollHeight` autosize implementation.
- `position: fixed` on a composer without going through
  `useFloatingObstacleClearance`.
- A flex transcript without `min-h-0`.
- Two control rows rendered at once and hidden by breakpoint.
- `100vh` on a surface a mobile keyboard can open over.
- A header that wraps to a second row at any tested width.
- A truncating heading with no `clamp-title` beside it.
- More controls on a phone header row than 44px each will fit beside the title.

## Enforcement

| Mechanism            | What it checks                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit test**        | `apps/claw-frontend/src/components/chat/__tests__/chat-surface-layout-contract.test.ts` reads the shell, composer and toolbar source and fails on an arbitrary pixel/vh height, an inline `height:`, a missing `min-h-0` on the transcript, a missing `chat-content-column`, twin breakpoint-hidden control rows, a missing `resize-none`, or a missing `data-rail-obstacle`. |
| **Unit test**        | `hooks/chat/__tests__/use-message-composer.test.tsx` asserts the composer is bounded in rows and that the variant is resolved once, not rendered twice.                                                                                                                                                                                                                       |
| **Review checklist** | Rules 6, 7 and 9 have no automatable form — a wrapped header and a keyboard-shrunk viewport are only visible in a browser. `skills/verify-responsive-layout-in-browser.md` is the procedure, and its evidence is the check.                                                                                                                                                   |

## Definition of done

- [ ] The transcript is the only `flex-1` element and carries `min-h-0`.
- [ ] No new pixel height was introduced on the surface.
- [ ] The composer uses `RichPromptTextarea` with row bounds from
      `constants/chat.constants.ts`.
- [ ] The composer is still a normal-flow child, or rule 36 §5 was amended.
- [ ] The header holds one row at 375, 768, 1024, 1366 and 1920 px wide, and
      the title is never narrower than about a third of the row.
- [ ] Every action that existed before the redesign is still reachable, on the
      row or in the overflow menu.
- [ ] Verified in a browser at the sizes in
      [`skills/verify-responsive-layout-in-browser.md`](../skills/verify-responsive-layout-in-browser.md),
      not only in tests.

## See also

- [`docs/02-business-product/chat-thread-page-spec.md`](../docs/02-business-product/chat-thread-page-spec.md) — decisions and acceptance criteria
- [`docs/05-frontend/chat-surface-layout.md`](../docs/05-frontend/chat-surface-layout.md) — the implementation contract, file by file
- [`docs/13-adr/adr-088-composer-auto-height-replaces-drag-resize.md`](../docs/13-adr/adr-088-composer-auto-height-replaces-drag-resize.md)
- [`rules/36-floating-ui-and-toast-clearance.md`](36-floating-ui-and-toast-clearance.md)
- [`rules/03-frontend-rules.md`](03-frontend-rules.md) — TSX is render-only, so every measurement above lives in a hook
