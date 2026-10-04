# ADR-158: The model list is virtualised and the picker owns its own highlight

- **Status**: Accepted
- **Date**: 2026-10-04
- **Deciders**: Frontend
- **Related**: [ADR-090](adr-090-model-picker-opens-at-the-current-choice.md) ·
  [chat surface layout](../05-frontend/chat-surface-layout.md) ·
  [hook patterns](../05-frontend/hook-patterns-reference.md)

## Context

The shared `ModelPicker` (composer, Compare, judge and critic, orchestration pages, regenerate,
recovery) rendered one cmdk item per model. With the catalogue at roughly 900 models (OpenRouter
alone is 445, plus the custom providers) opening it mounted **899 items and 6,905 DOM nodes**,
took 555-603 ms to appear, and each typed character re-filtered all of them (254-859 ms for a
short query). Compare's multi-select list mapped every model as a button the same way.

## Decision

1. `ModelPicker` renders its list through `lib/virtuoso` (the one allowed Virtuoso import). Only
   the rows near the viewport exist in the DOM. The groups are flattened into heading and option
   rows by `buildModelPickerRows`, filtered by every typed word against label, id and provider name.
2. cmdk is no longer used for the model list: it navigates mounted DOM items, which a virtualised
   list does not have. The picker owns the highlight (a model value). Arrow keys, Home, End and Enter
   move across the **full filtered list** and call Virtuoso's `scrollIntoView`; typing highlights the
   first match; the list opens scrolled to the current choice (ADR-090 still holds, by a different
   mechanism). Semantics: search input with `aria-activedescendant`, `role=listbox`, `role=option`.
3. Row content is produced in the controller hooks (`createElement`), so rows are a stable component
   type and the TSX files stay hook-free.
4. The list height is `min(rows x 36px, 320px, available popover height - 7rem)` using Radix's
   `--radix-popover-content-available-height`; the mobile sheet uses a fixed `50dvh`.
5. Compare's `ParallelModelSelector` uses the same flatten-and-window approach.
6. Tests: `tests/setup.ts` mocks `@/lib/virtuoso` to render every item (jsdom has no layout); a test
   that needs the real wiring mocks it itself.

## Consequences

- Measured on the same 899-model data, same machine: DOM rows 899 -> 36, list nodes 6,905 -> 347,
  open 555-603 ms -> 244-345 ms, typing 254-859 ms -> 103-111 ms.
- Anything that lists catalogue-sized data should go through `lib/virtuoso`, not `.map` over rows.
- Alternatives rejected: virtualising cmdk (breaks its keyboard model), capping the list (hides
  models), server-side search (a network hop per keystroke for data already on the client).
- Would make this stale: a catalogue small enough that windowing costs more than it saves, or a
  cmdk release with first-class virtualisation.
