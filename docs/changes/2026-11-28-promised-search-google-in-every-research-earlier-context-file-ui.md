# Change - Promised search, Google in every research, earlier context, file UI

## Files

- `apps/claw-chat-service/src/modules/chat-messages/__tests__/search-continuation-turn.spec.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/constants/search-continuation.constants.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/managers/__tests__/search-continuation.manager.spec.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/managers/search-continuation.manager.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/types/search-continuation.types.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/earlier-sources.utility.spec.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/pending-search.utility.spec.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/planner-date.utility.spec.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/search-continuation.utility.spec.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/pending-search.utility.ts` (A)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/search-continuation.utility.ts` (A)
- `apps/claw-frontend/src/components/chat/__tests__/file-name-label.test.tsx` (A)
- `apps/claw-frontend/src/components/chat/file-name-label.tsx` (A)
- `apps/claw-frontend/src/types/file-name.types.ts` (A)
- `apps/claw-frontend/src/utilities/__tests__/search-continuation.utility.test.ts` (A)
- `apps/claw-frontend/src/utilities/search-continuation.utility.ts` (A)
- `apps/claw-research-service/src/modules/research/managers/__tests__/research-google.spec.ts` (A)
- `apps/claw-research-service/src/modules/research/utilities/__tests__/google-budget.utility.spec.ts` (A)
- `apps/claw-research-service/src/modules/research/utilities/__tests__/query-fusion-pages.spec.ts` (A)
- `apps/claw-research-service/src/modules/research/utilities/google-budget.utility.ts` (A)
- `apps/claw-research-service/src/modules/search/adapters/__tests__/serpapi.adapter.spec.ts` (A)
- `apps/claw-research-service/src/modules/search/dto/__tests__/search-provider-public-config.dto.spec.ts` (A)
- `apps/claw-research-service/src/modules/search/dto/search-provider-public-config.dto.ts` (A)
- `apps/claw-research-service/src/modules/search/services/__tests__/search-google.spec.ts` (A)
- `docs/13-adr/adr-227-a-promised-search-is-finished-not-stored.md` (A)
- `docs/13-adr/adr-228-google-in-every-research.md` (A)
- `docs/qa-evidence/2026-11-28-search-continuation-google-files.md` (A)
- `.ai/manifests/governance.json` (M)
- `.ai/manifests/hashes.json` (M)
- `.ai/manifests/services.json` (M)
- `.ai/manifests/tests.json` (M)
- `apps/claw-chat-service/AGENTS.md` (M)
- `apps/claw-chat-service/CLAUDE.md` (M)
- `apps/claw-chat-service/src/common/constants/research-gate.constants.ts` (M)
- `apps/claw-chat-service/src/common/enums/stream-event-type.enum.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/chat-messages.module.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/constants/attachment-awareness.constants.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/constants/message-quotes.constants.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/__tests__/context-assembly-attachment-awareness.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/research-orchestrator.manager.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/services/chat-messages.service.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/services/chat-stream.service.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/services/research-gate.service.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/types/execution.types.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/types/user-message-metadata.types.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/attachment-awareness.utility.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/attachment-awareness.utility.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/conversation-turns.utility.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/harness-council.utility.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/quoted-turn.utility.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/user-message-metadata.utility.ts` (M)
- `apps/claw-frontend/CLAUDE.md` (M)
- `apps/claw-frontend/src/components/chat/archive-attachment-card.tsx` (M)
- `apps/claw-frontend/src/components/chat/attachment-file-preview.tsx` (M)
- `apps/claw-frontend/src/components/chat/attachment-media-preview.tsx` (M)
- `apps/claw-frontend/src/components/chat/attachment-placeholder.tsx` (M)
- `apps/claw-frontend/src/components/chat/attachment-unavailable-card.tsx` (M)
- `apps/claw-frontend/src/components/chat/composer-attachment-tile.tsx` (M)
- `apps/claw-frontend/src/components/chat/composer-pending-attachment-tile.tsx` (M)
- `apps/claw-frontend/src/enums/stream-event-type.enum.ts` (M)
- `apps/claw-frontend/src/hooks/chat/__tests__/use-thread-detail.test.tsx` (M)
- `apps/claw-frontend/src/hooks/chat/use-chat-stream.ts` (M)
- `apps/claw-frontend/src/hooks/chat/use-thread-detail.ts` (M)
- `apps/claw-research-service/AGENTS.md` (M)
- `apps/claw-research-service/CLAUDE.md` (M)
- `apps/claw-research-service/src/common/constants/research-engine.constants.ts` (M)
- `apps/claw-research-service/src/common/constants/search.constants.ts` (M)
- `apps/claw-research-service/src/modules/research/managers/__tests__/research-engine.spec.ts` (M)
- `apps/claw-research-service/src/modules/research/managers/__tests__/research-platforms.spec.ts` (M)
- `apps/claw-research-service/src/modules/research/managers/__tests__/research.manager.spec.ts` (M)
- `apps/claw-research-service/src/modules/research/managers/multi-query-search.manager.ts` (M)
- `apps/claw-research-service/src/modules/research/managers/research.manager.ts` (M)
- `apps/claw-research-service/src/modules/research/types/research-engine.types.ts` (M)
- `apps/claw-research-service/src/modules/research/utilities/query-fusion.utility.ts` (M)
- `apps/claw-research-service/src/modules/research/utilities/research-run-state.utility.ts` (M)
- `apps/claw-research-service/src/modules/search/adapters/serpapi.adapter.ts` (M)
- `apps/claw-research-service/src/modules/search/dto/create-search-provider.dto.ts` (M)
- `apps/claw-research-service/src/modules/search/dto/update-search-provider.dto.ts` (M)
- `apps/claw-research-service/src/modules/search/services/search-execution.service.ts` (M)
- `apps/claw-research-service/src/modules/search/types/search-provider-selection.types.ts` (M)
- `apps/claw-research-service/src/modules/search/types/search.types.ts` (M)
- `apps/claw-research-service/src/modules/search/utilities/expansion-provider.utility.ts` (M)
- `apps/claw-research-service/src/modules/search/utilities/search-cache-key.utility.ts` (M)
- `context/testing-map.md` (M)
- `context/workspace-map.md` (M)
- `docs/04-backend/service-guide-chat.md` (M)
- `docs/04-backend/service-guide-research.md` (M)
- `docs/11-runbooks/runbook-smart-app-control-blocks-native-binaries.md` (M)
- `docs/13-adr/adr-224-evidence-store-multi-query-and-research-rounds.md` (M)
- `docs/13-adr/adr-225-research-platform-registry.md` (M)
- `docs/13-adr/adr-index.md` (M)
- `docs/15-ai-context/ai-context-pack.md` (M)
- `docs/implementation/autonomous-research-engine-plan.md` (M)
- `rules/50-agentic-research-loop-and-narration.md` (M)
- `wiki/Historical-Audits-and-Staleness.md` (M)
- `wiki/Home.md` (M)
- `wiki/Testing-and-QA.md` (M)

## Before

- A model that replied "I will search" had that sentence stored as its answer; a web-tool call with no catalog failed
  the turn.
- Google (SerpAPI) ran only on round 1's primary query, first results page only.
- Follow-ups knew only 3 earlier files (no video) and not the sources earlier answers used; planning prompts had no
  date.
- Long file names broke the composer tile on phones; the sent file card was dark on dark inside the user bubble.

## Change

- ADR-227: the promise is stored as its own message, the search runs once when allowed, the model answers again; the
  page keeps waiting. Earlier files (12, videos as transcripts) and earlier answers' sources stay in later prompts;
  planning prompts state today's date.
- ADR-228: Google in every research run inside a per-depth budget, result pages, `hl`, admin override.
- File UI: one-line clipped names (`FileNameLabel`), cards set their own text colour.

## Now

Knowledge homes: [ADR-227](../13-adr/adr-227-a-promised-search-is-finished-not-stored.md),
[ADR-228](../13-adr/adr-228-google-in-every-research.md), [rules/50](../../rules/50-agentic-research-loop-and-narration.md),
[chat guide](../04-backend/service-guide-chat.md), [research guide](../04-backend/service-guide-research.md),
[QA record](../qa-evidence/2026-11-28-search-continuation-google-files.md).

## Why

Owner reports of 2026-11-28: models stopped after "I will search"; Google must be part of every search; the chat must
know everything sent earlier; three file display bugs on a phone.

## Verification

See the QA record: unit suites, live API runs with log lines, Playwright on desktop and phone in both themes.

## What would make this stale

A change to the research budgets, SerpAPI pricing or terms, the chat stream frames, the attachment tile layout, or the
touch-screen `truncate` rule in globals.css.
