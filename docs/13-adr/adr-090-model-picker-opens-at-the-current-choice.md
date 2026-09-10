# ADR-090: The model picker opens at the current choice, and its trigger always names it

- **Status**: Accepted
- **Date**: 2026-09-10
- **Deciders**: Frontend
- **Related**: [ADR-088](adr-088-composer-auto-height-replaces-drag-resize.md) ·
  [rules/40](../../rules/40-chat-surface-layout-and-composer.md) ·
  [chat surface layout](../05-frontend/chat-surface-layout.md)

## Context

Two complaints about the same control, both reproduced.

**The list opened at the top.** The picker lists every available model — 173 in
the local stack, a 7,901px scroll height. It opened at scroll position zero
whatever was selected, so a user on a model near the bottom scrolled back to it
on every visit, and there was no indication in the open list of what they had
chosen until they got there.

**The trigger said nothing on a phone.** Below `lg` the composer's model control
was a 36px square whose label was `sr-only`. That was a deliberate earlier fix
for a real problem: the touch media query relaxes `.truncate` so a clipped
string stays readable, which rendered "Auto (routing decides)" as six stacked
syllables spilling out of the button. But it over-corrected. On a phone the
header does not repeat the model either, so **nothing on screen said which model
would answer**. The sheet the button opened made it worse: its title was the
hardcoded string "Auto", whatever was selected.

Two smaller faults surfaced while fixing those. On a 500px-tall viewport the
sheet's footer — the pay-as-you-go disclaimer, which exists precisely to be read
while choosing — was clipped mid-sentence. And once the trigger showed a name,
the research select beside it shrank to `N…`.

## Options considered

**Scroll the selected row into view with a ref and `scrollIntoView` on open.**
Rejected. It fights cmdk rather than using it: cmdk already scrolls its
highlighted row into view, so this adds a second scroll authority that has to
win a race with the first, and the row would still not be _highlighted_ — the
keyboard would start from the top while the eye started in the middle.

**Seed cmdk's `Command value` with the selection, as component state.**
**Chosen.** `value` on cmdk's root is the highlight, not the selection, and
highlighting a row is what makes cmdk scroll to it. Seeding on open and then
handing the highlight to `onValueChange` keeps arrow keys and typing working.

**Pass the selection to `Command value` as a fixed prop.** Rejected. It pins the
highlight, so arrow keys and search cannot move it.

**Keep the icon-only trigger and put the name somewhere else** (a line above the
composer, a chip in the header). Rejected: every option costs the conversation
vertical space, which is the thing the whole chat-surface work exists to
protect.

**Show the name and let the row scroll.** **Chosen.** The model is the most
important control in that row, so it takes the width; the row already scrolls
sideways by design, which costs no height.

## Decision

- `useModelPicker` seeds cmdk's highlight from the current value **on open**,
  then lets the keyboard own it.
- Each item's cmdk `value` becomes the option's own value; the display label
  moves to `keywords` so search still matches it.
- `ModelPickerOption` gains `shortLabel`. The trigger shows it (falling back to
  `label`) when `useShortTriggerLabel` is set; the full label stays on `title`,
  on `aria-label`, and as the sheet's title.
- The option list is `flex-1 min-h-0 max-h-none` inside a flex-column wrapper,
  replacing the primitive's `max-h-[min(300px,55dvh)]`.
- Composer toolbar controls are `shrink-0` with declared widths, never `flex-1`;
  the row carries `.scroll-fade-inline-end` so its overflow is legible.

## Consequences

**Good.** The picker opens where the user left it. The selected model is named
on every screen size and in three places a screen reader can reach. The
disclaimer is readable at every tested viewport height.

**Bad, and accepted.**

- **The cmdk item value is no longer human-readable.** Anything that matched on
  it — a future custom `filter`, a test asserting on `data-value` — must use
  `keywords` or the label instead. The regression this would cause (searching a
  model by name finding nothing) is covered by a test.
- **Label collisions are now handled, but silently.** Two providers shipping the
  same display name previously produced an ambiguous highlight; they now
  resolve correctly, and the list still shows two identically-named rows. Making
  those distinguishable is a separate question about `displayName`.
- **The toolbar scrolls sooner on a phone.** The model name costs ~84px, so the
  preview-context button is off-screen at 375px until the row is scrolled. The
  fade says so. The alternative — a control that says nothing — was worse.
- **The decorative globe is hidden below `sm`.** It is `aria-hidden`, and the
  select beside it says "No research" in words, so nothing is lost but the
  decoration.
- **`clamp-title` now differs across the touch query's own range, guarded by
  width inside a pointer query.** Two lines below 640px, one line above.
  [rules/03 §7](../../rules/03-frontend-rules.md) normally forbids a width guard
  for a mobile decision, because a width test misreads a phone in landscape
  (915x412). **This deviation is deliberate**: the clamp trades width for
  height, and in landscape height is the scarce resource — two lines of
  oversized bold title over a 412px-tall viewport is the failure, not the fix.
  The accepted cost is that a landscape phone gets an ellipsis with no hover to
  reveal it; the full title stays reachable through the thread drawer and the
  rename control, so nothing becomes unreachable. `touch-layer.test.ts` guards
  the pointer-not-width property by scanning TSX for `max-md:`, and does not
  read CSS, so it will not catch a future width guard added here by accident.

- **Every other `ModelPicker` consumer inherits all of this.** The component is
  shared by seven call sites, not one: the composer's `model-selector.tsx`,
  `advanced-module-model-selector.tsx`, `compare-critic-controls.tsx`,
  `compare-judge-controls.tsx`, `image-error-state.tsx`,
  `image-generation-bubble.tsx` and
  `orchestration/orchestration-single-model-select.tsx`. All of them now get the
  seeded highlight, the `value`→`keywords` swap and the bounded popover height.
  That is intended — the fault was in the shared component — but it means a
  regression here is six screens wide, and `useShortTriggerLabel` is opt-in so
  the other six are unchanged on the trigger.

## Revisit when

- A model list grows large enough that grouping or a recents section beats
  scroll-to-selection.
- The composer row needs a genuine overflow menu on phones rather than a scroll.
