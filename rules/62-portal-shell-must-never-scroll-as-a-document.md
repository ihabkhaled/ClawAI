# The portal shell is one viewport tall and never scrolls as a document

`PortalShell` is `h-dvh` with `overflow-clip`; only `<main>` scrolls. The document itself must never be taller than the window, or the shell slides up and leaves a blank band under it (observability page, 2026-10-11).

- Keep `relative` on the shell root. `overflow-clip` does not clip absolutely positioned descendants whose containing block is outside it, so an `sr-only` span, a hidden table cell or a popper anchor extended the document.
- Any scroll box that holds `sr-only` or absolutely positioned content is `relative` as well (`ModelExposureTable` had the same defect sideways).
- Never use `overflow-hidden` on a shell: focus and `scrollIntoView` can still scroll it. Use `overflow-clip`.
- Wide content (tables, charts, toolbars) gets its own `overflow-x-auto` box and `min-w-0` parents; it never widens the column.
- Prove it: `node apps/claw-frontend/scripts/responsive-audit/audit.cjs` (see `docs/05-frontend/responsive-audit.md`) fails a page when `scrollHeight > innerHeight` or `scrollWidth > clientWidth`.
