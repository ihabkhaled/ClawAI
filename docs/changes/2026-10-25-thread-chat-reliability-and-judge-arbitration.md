# Change - Thread chat reliability and Judge arbitration

## Files

- `docs/13-adr/adr-190-thread-author-preferences-are-arbitrated-by-the-judge.md` (A)
- `docs/13-adr/adr-191-unavailable-judge-results-are-never-verified.md` (A)
- `docs/13-adr/adr-192-github-repository-crawls-stay-inside-the-requested-repository.md` (A)
- `docs/qa-evidence/2026-10-25-local-thread-chat-reliability.md` (A)
- `docs/05-frontend/threads-buttons-and-publish-banner.md` (M)
- `docs/features/clawai-threads/README.md` (M)
- `apps/claw-chat-service/src/__tests__/judge-referee.manager.spec.ts` (M)
- `apps/claw-chat-service/src/common/enums/judge-decision.enum.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/__tests__/context-assembly.manager.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/constants/narration.constants.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/constants/platform-identity.constants.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/constants/research-grounding.constants.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/__tests__/judge-referee.manager.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/__tests__/research-enricher.manager.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/types/context.types.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/judge-referee.manager.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/managers/research-enricher.manager.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/services/__tests__/research-progress-bridge.service.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/services/research-progress-bridge.service.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/types/judge-referee.types.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/platform-identity.utility.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/research-prompt.utility.spec.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/platform-identity.utility.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/research-prompt.utility.ts` (M)
- `apps/claw-chat-service/src/modules/chat-messages/utilities/video-prompt.utility.ts` (M)
- `apps/claw-frontend/src/components/chat/judge-referee-details.tsx` (M)
- `apps/claw-frontend/src/components/chat/message-bubble.tsx` (M)
- `apps/claw-frontend/src/components/threads/__tests__/thread-publication-detail.test.tsx` (M)
- `apps/claw-frontend/src/components/threads/thread-publication-detail.tsx` (M)
- `apps/claw-frontend/src/enums/judge-response-type.enum.ts` (M)
- `apps/claw-frontend/src/enums/judge-review-decision.enum.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/ar.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/de.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/en.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/es.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/fa.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/fr.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/hi.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/it.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/ja.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/pt.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/ru.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/th.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/thread-review-translations.ts` (M)
- `apps/claw-frontend/src/lib/i18n/locales/zh.ts` (M)
- `apps/claw-frontend/src/types/i18n.types.ts` (M)
- `apps/claw-frontend/src/types/thread-publication.types.ts` (M)
- `apps/claw-frontend/src/utilities/__tests__/judge-review.utility.test.ts` (M)
- `apps/claw-frontend/src/utilities/judge-referee-display.utility.ts` (M)
- `apps/claw-frontend/src/utilities/judge-review.utility.ts` (M)
- `apps/claw-research-service/src/modules/research/managers/__tests__/site-crawl.manager.spec.ts` (M)
- `apps/claw-research-service/src/modules/research/managers/site-crawl.manager.ts` (M)
- `apps/claw-research-service/src/modules/research/types/crawl.types.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/constants/healing-notes.constants.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/constants/review-prompt.constants.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/managers/__tests__/generation-pipeline.manager.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/managers/__tests__/generation-pipeline.steps.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/managers/generation-pipeline.manager.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/managers/role-healer.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/repositories/generation-jobs.repository.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/services/__tests__/generation-jobs.service.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/types/author-consensus.types.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/types/generation-pipeline.types.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/types/healing.types.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/types/revision-review.types.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/__tests__/author-consensus.utility.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/__tests__/healing-ladder.utility.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/__tests__/revision-review.utility.spec.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/author-consensus.utility.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/healing-ladder.utility.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/review-prompt.utility.ts` (M)
- `apps/claw-thread-generation-service/src/modules/generation/utilities/revision-review.utility.ts` (M)
- `apps/claw-threads-service/src/modules/publications/services/__tests__/publication-lifecycle.latest-revision-state.spec.ts` (M)
- `apps/claw-threads-service/src/modules/publications/services/publication-lifecycle.service.ts` (M)
- `apps/claw-threads-service/src/modules/publications/services/threads-generation.client.ts` (M)
- `apps/claw-threads-service/src/modules/publications/types/generation.types.ts` (M)
- `docs/02-business-product/clawai-threads-product-spec.md` (M)
- `docs/02-business-product/drift-log.md` (M)
- `docs/02-business-product/judge-referee-spec.md` (M)
- `docs/02-business-product/requirements-register.md` (M)
- `docs/04-backend/service-guide-chat.md` (M)
- `docs/04-backend/service-guide-research.md` (M)
- `docs/04-backend/service-guide-thread-generation.md` (M)
- `docs/04-backend/service-guide-threads.md` (M)
- `docs/13-adr/adr-189-thread-articles-are-typeset-by-a-guarded-format-stage-and-rendered-as-rich-safe-html.md` (M)
- `docs/13-adr/adr-index.md` (M)
- `docs/CHANGELOG.md` (M)
- `docs/superpowers/specs/2026-10-04-clawai-threads-design.md` (M)
- `memory/known-pitfalls.md` (M)
- `rules/00-master-rules.md` (M)
- `rules/41-web-evidence-truthfulness.md` (M)
- `rules/50-agentic-research-loop-and-narration.md` (M)
- `rules/59-chat-surfaces-are-one-pipeline.md` (M)
- `rules/README.md` (M)
- `skills/00-index.md` (M)
- `skills/debug-a-failed-thread-generation.md` (M)
- `skills/propagate-a-chat-change-to-every-mode.md` (M)
- `skills/verify-the-research-loop-live.md` (M)
- `wiki/Research-and-Web-Crawling.md` (M)
- `wiki/_Sidebar.md` (M)
- `package.json` (M)
- `CHANGELOG.md` (M)
- `.ai/ledger/decision/distil-repeat-files-1b2bcdfa57f2.md` (A)

## Before

On 2026-10-25, production review showed one Thread already published and a
separate generation failing with “The models could not agree on an answer.”
Its authors had to return identical draft hashes before Judge review. Chat
screenshots showed the Judge marked unavailable beside a green verified badge,
contradictory repository claims, and 181 saved crawl steps. The owner chose
local mocked replay for the reliability measurement. No live provider retry,
production mutation, publication, or deployment was performed in this local
code batch.

## Change

Changed Thread author checks to persist candidate preference votes and let the
Judge select and review a draft in the same round; the Critic reviews that
selection. Preserved content-hash binding, spend caps, citation and safety gates,
and checkpoint reuse. Chat Judge failures and ambiguous output now remain
unavailable. GitHub repo crawls are path-bounded and the model is told not to
claim a complete scan. Per-page crawl ticks remain live but are not persisted in
the narration log. Added conditional mental-health grounding. Added local
regression coverage and updated product, rule, skill, ADR, memory, wiki and
release records.

## Now

The deterministic mocked replay passed 50/50 cases with split, tied and majority
author preferences. Focused Thread, research, Judge, narration and frontend
checks are recorded in `docs/qa-evidence/2026-10-25-local-thread-chat-reliability.md`.
The source changes are local and uncommitted; production remains unchanged.

## Why

Author disagreement is a preference signal and the Judge exists to arbitrate;
it should not trigger repeated full author rounds. Users must not see an
unavailable review as approval, a bounded crawl as a full repository audit, or
every page tick as a lasting reasoning step. Local mock success validates
control flow only and does not establish a live-provider success rate.

## Decision, compatibility and operations

- Chose independent candidate votes plus Judge selection over exact-hash
  unanimity; Judge, Critic, citations and safety remain the readiness gates.
- Chose visible `UNAVAILABLE` over default approval when review output cannot be
  trusted. No new database schema or service boundary is introduced.
- The GitHub crawl remains on `FetchService` and existing SSRF/domain controls;
  the request stays bounded by existing crawl limits.
- No production retry, publication, deployment, commit or push was performed.

## Knowledge delta

- Added ADRs 190–192; updated the Thread spec, requirements register, drift log,
  judge spec, service guides, rule 41/50/59, skills, memory and research wiki.
- Updated both changelogs and added QA evidence; Akinator recorded the
  recurring manager/test pairing as `neither`.
- Root and service routers already route through the rules, skills, ADR and
  service-guide indexes; no router content changed.

## Stale when

A later decision changes the Thread review gates, Judge unavailable semantics,
GitHub crawl boundaries, or narration persistence policy.
