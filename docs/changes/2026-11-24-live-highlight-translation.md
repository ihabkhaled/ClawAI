# Change - Live highlights and summaries reach the viewer's language

## Files

- `apps/claw-live-service/src/modules/processing/managers/summary.manager.ts`
- `apps/claw-live-service/src/modules/processing/managers/__tests__/summary.manager.spec.ts`
- `apps/claw-live-service/src/modules/processing/types/processing.types.ts`
- `apps/claw-live-service/src/modules/processing/workers/run-worker.ts`
- `apps/claw-live-service/src/modules/processing/workers/__tests__/run-worker.spec.ts`
- `apps/claw-live-service/src/common/utilities/language.utility.ts`
- `apps/claw-live-service/src/common/utilities/__tests__/language.utility.spec.ts`
- `apps/claw-live-service/CLAUDE.md`
- `apps/claw-frontend/src/utilities/live-feed-store.utility.ts`
- `apps/claw-frontend/src/types/live.types.ts`
- `apps/claw-frontend/src/constants/live.constants.ts`
- `apps/claw-frontend/src/utilities/__tests__/live-feed-store.utility.test.ts`
- `apps/claw-frontend/src/components/live/__tests__/`
- `apps/claw-frontend/src/hooks/live/__tests__/use-live-modal.test.tsx`
- `apps/claw-frontend/CLAUDE.md`
- `scripts/qa/live-language-matrix.mjs`
- `docs/13-adr/adr-221-live-intelligence-shared-live-stream-analysis.md`
- `docs/04-backend/service-guide-live.md`
- `docs/qa-evidence/2026-11-24-live-highlight-translation.md`

## Before

A viewer who chose English on an Arabic stream read Arabic highlights. Only the summary card was sent for
translation; highlights and the final summary never were. Cards were tagged with the last caption's language, and the
original was published before its translation, so a foreign card could flash in first.

## Change

`SummaryManager` sends every changed card, every new highlight and the FINAL card to translation, tags each by the
language of its own text (`cardLanguage`), and publishes the translations BEFORE the originals. The page keeps a copy
that arrives first (`cardTranslations`, `eventId:version`). The language matrix now fails when a card or highlight in
another script has no copy in the viewer's language.

## Now

Viewer language equals the spoken language: exact words, only other-language parts translated. A different language:
captions, summaries and highlights are all translated, and the original never shows first. Verified: matrix 21/21
(ar→en, mixed ar/en→en, hi→en, es→ar, ar→ar) and a browser run with 0 Arabic frames in 120 samples.

## Why

Owner report 2026-11-24 and the owner's caption rule, applied to every piece of text the feed shows. The batch-5 test
rounds checked caption translation only; the missing check is now part of the matrix.
