# Change trace - Threads Batch 6 owner generation UI

Date: 2026-10-05
Batch: Threads owner generation and private review foundation
Status: Partial Batch 6; browser/UAT and community controls remain open.

## Decision and behavior

The `/threads` owner portal now submits an explicitly selected source chat,
topic, publication type, three author roles, Judge, Critic, idempotency and
correlation IDs, and a required user-entered maximum spend. It displays the
approved public/indexing disclosure before enqueue and records
`threads-public-v1`. It polls the owner-only generation-state route, displays
the private draft and citations, and only exposes owner publish approval when
Threads reports `READY_FOR_REVIEW`. The owner-state response now includes its
publication status so a safety-blocked draft cannot be published from this UI.

No PAYG policy, public reader identity list, chat-share behavior, or chat UI
surface changed. Existing entitlement and credit reservation behavior remains
the generation service's authority.

## Review lenses

Business: the cap remains mandatory and uses existing credits, with no new PAYG
price. CTO: publication data stays in Threads and job data stays in Generation;
the additive owner-state status field crosses the existing authenticated API.
Product: disclosure precedes enqueue, the draft remains private, and publish is
a distinct action gated on `READY_FOR_REVIEW`. Ops: no migration, new secret,
environment variable, queue, or restart order changed. Analyst: the selected
USD amount converts to integer micro-USD and has a focused rounding test. PM:
this is a partial Batch 6 slice; remaining UI and unrun QA lanes stay open. The
release pipeline versions the successful pushed commit automatically, so this
slice leaves that repository release convention unchanged.

## Code paths traced

- `apps/claw-frontend/src/app/(portal)/threads/page.tsx`
- `apps/claw-frontend/src/constants/thread-publication.constants.ts`
- `apps/claw-frontend/src/repositories/threads/thread-publications.repository.ts`
- `apps/claw-frontend/src/types/thread-publication.types.ts`
- `apps/claw-frontend/src/types/i18n.types.ts`
- `apps/claw-frontend/src/types/index.ts`
- `apps/claw-frontend/src/utilities/thread-generation-request.utility.ts`
- `apps/claw-frontend/src/utilities/__tests__/thread-generation-request.utility.test.ts`
- `apps/claw-frontend/src/lib/i18n/locales/{ar,de,en,es,fa,fr,hi,it,ja,pt,ru,th,zh}.ts`
- `apps/claw-threads-service/src/modules/publications/services/publication-lifecycle.service.ts`
- `apps/claw-threads-service/src/modules/publications/services/__tests__/publication-lifecycle.service.spec.ts`
- `docs/02-business-product/clawai-threads-product-spec.md`
- `docs/05-frontend/frontend-architecture.md`
- `context/request-flow-map.md`
- `wiki/Threads.md`
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- `docs/qa-evidence/2026-10-05-threads-generation-owner-ui.md`

`context/chat-surface-parity-map.md` is unchanged: this implementation adds a
separate publication portal and does not alter chat, Compare, Consensus,
Escalation, labs, Judge/Critic, or shared composer surfaces.

## Knowledge and skill delta

Product, frontend architecture, request flow, wiki, implementation plan, and QA
evidence were updated in this batch. Existing prompt-pack, i18n, frontend,
metered-credit, and full-team QA runbooks cover the work; no new skill or rule
was needed. `.ai/**`, workspace `AGENTS.md`, and the inventory snapshot are
regenerated from their canonical sources by repository tooling.

## Verification

See the QA evidence record for focused tests, lint, typecheck, and open lanes.
No Playwright, live API, full device matrix, production build, or complete Batch
6 behavior is claimed by this change.
