# Change - Thread progress page follows the newest update

Date: 2026-10-31. QA: [record](../qa-evidence/2026-10-31-thread-progress-follow-bottom.md).

## Why

While a Thread generates, new steps appear below the fold and the owner had to scroll by hand. Owner request: keep the
page scrolling to the bottom with every update.

## What changed

- Before: no auto-scroll. Now: the panel scrolls to its end marker on every update while the job runs.
- Stops when the reader scrolls up on purpose; resumes at the bottom; stops when the job ends.
- Reduced-motion readers get an instant scroll.

## Files

- `apps/claw-frontend/src/hooks/threads/use-thread-follow-bottom.ts` (+ test)
- `apps/claw-frontend/src/components/threads/thread-generation-progress-panel.tsx`
- `apps/claw-frontend/src/utilities/thread-generation-progress.utility.ts`, `src/constants/thread-generation-progress.constants.ts` (+ tests)
- `apps/claw-frontend/tests/setup.ts` (jsdom stubs for scrollIntoView and matchMedia)
- `apps/claw-frontend/CLAUDE.md`
