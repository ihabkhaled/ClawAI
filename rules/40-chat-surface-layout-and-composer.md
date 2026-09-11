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
   heading wraps without bound there. `clamp-title` caps that wrap — **at two
   lines below 640px, and at one line with an ellipsis from 640px up**; see §15
   for why the bound differs. A control label wants `truncate-fixed` instead;
   prose wants neither.

9. **A control variant is chosen by `useMediaQuery`, not by rendering both.**
   A Tailwind prefix can hide a mounted component; it cannot pick between an
   a short trigger label and a full one. Mounting a mobile row and a desktop row
   side by side with `md:hidden` / `hidden md:flex` mounts every picker, popover
   and query behind them twice. `MEDIA_QUERY_SM_UP` (header actions),
   `MEDIA_QUERY_LG_UP` (composer labels) and `MEDIA_QUERY_BELOW_MD` (the model
   picker rendering as a bottom sheet rather than a popover) exist for this.
   Keep that list complete: a fourth query added silently is how two components
   end up disagreeing about where a breakpoint is.

10. **The reading column is bounded by a shared token.** Transcript and composer
    both take `.chat-content-column` (`--chat-content-max`), so they cannot drift
    apart, and a line of prose does not run the width of a 2560 px monitor. The
    bound is set wide enough that it does not bind on a 1366 px laptop — a gutter
    where there is no room to spare is the opposite failure.

11. **A control in the composer row holds its own width; the row scrolls.**
    Every control in the toolbar is `shrink-0` with a declared width, in
    `composer-toolbar.tsx` **and in the components it renders** —
    `model-selector.tsx` and `research-toggle.tsx` build their own trigger
    classes, so a rule that only reads the toolbar file misses them. None of
    them is `flex-1`. A `flex-1` control shrinks below its own content when the
    row runs out of room, which on a 375px screen rendered the research select
    as `N…` in about 90px — a control narrower than one word of its own value is
    not a smaller control, it is a broken one. Overflow is answered by the row
    scrolling sideways, which is the one response that costs the conversation no
    vertical space.

12. **A hidden scrollbar owes the reader a fade.** `.scrollbar-none` is right
    here (a 15px bar to report 2px of overflow drew a grey line across the
    card), but with no bar at all a control clipped at the container edge reads
    as a broken control. `.scroll-fade-inline-end` supplies the signal, costs no
    height, and falls over empty space when the content fits. It has an RTL
    counterpart; use the utility, never a hand-rolled gradient overlay, because
    an overlay needs the card's background colour and that changes with theme.

13. **A narrow trigger is narrow, not empty.** The composer's model trigger
    shows a short label at every width. It used to be a 36px square whose only
    label was `sr-only`, so on a phone — where the header does not repeat it
    either — nothing on screen said which model would answer. Give the name the
    room and let the row scroll; the full name stays on the tooltip, the
    `aria-label` and the sheet the trigger opens.

14. **A long list opens at the current choice.** A picker of ~180 models that
    opens at scroll position zero makes the user scroll back to their own
    selection every single time. With cmdk the mechanism is its _highlight_
    (`Command value`), which is not the selection: seed it when the picker
    opens, then leave it to the keyboard. That also means each item's cmdk
    `value` must be its own identity, with the display label moved to
    `keywords` so search still matches it.

15. **The two-line title clamp is bounded by width, and that is a deliberate
    deviation from [rules/03 §7](03-frontend-rules.md).** `clamp-title` wraps to
    two lines only below 640px; from 640px up it reverts to a one-line ellipsis,
    even on a touch device. Rule 03 §7 says mobile guards are pointer-based, not
    width-based, precisely because a width test misreads a phone in landscape
    (915x412). Here the width test is the correct one, and the landscape phone
    is the reason rather than the casualty: **the clamp trades width for
    height**, and in landscape height is the scarce resource — two lines of
    oversized bold title over a 412px-tall viewport is the failure, not the fix.
    Above 640px the header has room to trim on one line.

    The accepted cost: a landscape phone gets an ellipsis with no hover to
    reveal it. The full title stays reachable through the thread drawer and the
    rename control, so nothing is unreachable — only less convenient. Recorded
    in [ADR-090](../docs/13-adr/adr-090-model-picker-opens-at-the-current-choice.md).

16. **A dead stream says so.** The event stream's health is user-visible state,
    not a log line. A dropped connection used to be indistinguishable from a
    slow answer: the client reconnected in silence, and when it could not,
    nothing on the page changed — the answer simply never arrived, and the user
    waited, which was the one thing that could not help. `StreamHealthNotice`
    renders between the transcript and the composer, and renders **nothing**
    while the connection is healthy, so it costs the conversation no height on
    the normal path.

    Two halves are needed and only one is obvious. Reconnecting covers a
    connection that ENDS. A proxy or a sleeping laptop can hold the socket open
    and stop delivering, and a bare `await reader.read()` then never settles —
    no error, no reconnect, no message. `SSE_STALL_TIMEOUT_MS` (45s, three
    missed 15s heartbeats) races the read against a deadline and turns that
    silence into an ordinary drop, which the reconnect loop already handles.

17. **Quiet is a size, not a fade.** Secondary text earns its place in the
    hierarchy by being smaller, never by being dimmed below the contrast floor.
    The message timestamp stacked `text-muted-foreground/60` with
    `md:opacity-60` — about a third of full opacity — and Lighthouse failed it
    on contrast. Text that still has to be read is not decoration.

18. **A control that renders a VALUE needs a LABEL.** A Radix `SelectTrigger`
    renders the current value, so without an `aria-label` a screen reader
    announces "No research, combobox" and never says what is being chosen —
    Lighthouse reports it as a button with no accessible name at all.

19. **Never give a button an `aria-label` that differs from its visible text.**
    The accessible name replaces the visible one, so a button reading "Search"
    with `aria-label="Open search"` cannot be activated by someone saying
    "click Search". Label the icon-only variant; leave the labelled one alone.

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
- `flex-1` or `min-w-0` on a composer toolbar control, which lets it shrink
  below its own content instead of letting the row scroll.
- A viewport-relative height (`dvh`, `vh`) on a list inside a dialog or popover.
  It cannot see the header, search box and footer around it, so on a short
  viewport it takes its share and pushes them out. Use `flex-1 min-h-0` against
  a parent that is itself a flex column, and clear any `max-h` the primitive
  ships with.
- A block wrapper around a flex-column child that is meant to fill it. The child
  sizes to its content, overflows, and its last element is silently clipped.
- A picker trigger whose only label is `sr-only`.
- A hardcoded word as a picker's dialog title where the selection belongs.
- An unbounded `await` on a network read. A stream that can stall needs a
  deadline, or the UI waits forever with nothing to show for it.
- Connection health that exists only in a log or a console message.
- Opacity or a colour alpha used to make text quieter than the contrast floor.
- An `aria-label` on a control that already has visible text, unless it STARTS
  with that text.

## Enforcement

| Mechanism            | What it checks                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit test**        | `apps/claw-frontend/src/components/chat/__tests__/chat-surface-layout-contract.test.ts` reads the shell, composer and toolbar source and fails on an arbitrary pixel/vh height, an inline `height:`, a missing `min-h-0` on the transcript, a missing `chat-content-column`, twin breakpoint-hidden control rows, a missing `resize-none`, or a missing `data-rail-obstacle`. |
| **Unit test**        | `hooks/chat/__tests__/use-message-composer.test.tsx` asserts the composer is bounded in rows and that the variant is resolved once, not rendered twice.                                                                                                                                                                                                                       |
| **Unit test**        | `apps/claw-frontend/src/components/chat/__tests__/model-picker.test.tsx` asserts the picker opens with the current choice highlighted, re-seeds on each open, still finds a model by display name after the item value became its id, and shows the short label with the full one on `title`/`aria-label`.                                                                    |
| **Unit test**        | `apps/claw-frontend/src/components/chat/__tests__/stream-health-notice.test.tsx` — renders nothing when healthy, distinguishes reconnecting from lost, and announces politely to a screen reader.                                                                                                                                                                             |
| **Unit test**        | `apps/claw-frontend/src/utilities/__tests__/sse-reconnect.utility.test.ts` — a connection that stays open and goes silent is abandoned and retried, and health transitions are reported.                                                                                                                                                                                      |
| **Unit test**        | `apps/claw-frontend/src/components/chat/__tests__/research-toggle.test.tsx` asserts both research triggers carry a fixed width and `shrink-0`, and never `flex-1`.                                                                                                                                                                                                            |
| **Review checklist** | Rules 6, 7, 9 and 15 have no automatable form — a wrapped header and a keyboard-shrunk viewport are only visible in a browser. `skills/verify-responsive-layout-in-browser.md` is the procedure, and its evidence is the check.                                                                                                                                               |

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
- [ ] No control inside the composer row is `flex-1`; the row is.
- [ ] Any list inside a dialog or popover is bounded by `flex-1 min-h-0`, not by a `dvh` fraction, and its wrapper is a flex column.
- [ ] Every picker trigger renders a visible label, not only an `sr-only` one.
- [ ] Verified in a browser at the sizes in
      [`skills/verify-responsive-layout-in-browser.md`](../skills/verify-responsive-layout-in-browser.md),
      not only in tests.

## See also

- [`docs/02-business-product/chat-thread-page-spec.md`](../docs/02-business-product/chat-thread-page-spec.md) — decisions and acceptance criteria
- [`docs/05-frontend/chat-surface-layout.md`](../docs/05-frontend/chat-surface-layout.md) — the implementation contract, file by file
- [`docs/13-adr/adr-088-composer-auto-height-replaces-drag-resize.md`](../docs/13-adr/adr-088-composer-auto-height-replaces-drag-resize.md)
- [`docs/13-adr/adr-090-model-picker-opens-at-the-current-choice.md`](../docs/13-adr/adr-090-model-picker-opens-at-the-current-choice.md) — the picker highlight, the short trigger label, and the deliberate width guard in `clamp-title`
- [`rules/36-floating-ui-and-toast-clearance.md`](36-floating-ui-and-toast-clearance.md)
- [`rules/03-frontend-rules.md`](03-frontend-rules.md) — TSX is render-only, so every measurement above lives in a hook
