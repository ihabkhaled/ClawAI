# Stream 11 — Quick Wins Backlog

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/11_quick_wins_backlog.md`

## Mission

10 single-day tickets that move the needle without requiring full streams. Designed to ship safely without dependencies.

---

## 11.1 — Wire `WorkflowKind` to `RoutingDecision`

**Scope:** add `selectedWorkflow` field to RoutingDecision; for now always set `DIRECT_LLM`. Unlocks future R.3 work + UI badge in stream R.5.

**Files:**

- `apps/claw-routing-service/prisma/schema.prisma` — add `selectedWorkflow WorkflowKind?`
- `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` — set `DIRECT_LLM` on every decision
- `apps/claw-frontend/src/types/routing.types.ts` — add field
- `apps/claw-frontend/src/components/routing/routing-decision-row.tsx` — render badge

**Tests:** existing route tests assert `selectedWorkflow=DIRECT_LLM` on response.
**Acceptance:** every new RoutingDecision row has non-null `selectedWorkflow`.
**Rollback:** field is nullable; remove badge from UI; no schema rollback needed.
**Done checklist:** typecheck + lint + test + visual confirm in `/routing`.

---

## 11.2 — Surface `RoutingDecision.explanation` in chat message header

**Scope:** small `ⓘ` icon next to provider/model badge in chat-message bubble; click expands to existing `explanation` text.

**Files:**

- `apps/claw-frontend/src/components/chat/message-bubble.tsx` — add icon + popover
- `apps/claw-frontend/src/hooks/chat/use-message-explanation.ts` — new hook; uses existing decision in props
- i18n keys in 9 locales for "Why this model?"

**Acceptance:** user clicks ⓘ → sees explanation; closes on outside click.
**Rollback:** hide icon via flag.
**Done checklist:** Playwright test for popover open/close + a11y check.

---

## 11.3 — Add `/routing/playground` page (skeleton only)

**Scope:** new page that calls existing `/routing/evaluate` (v1) endpoint with a textarea + submit; renders decision JSON.

**Files:**

- `apps/claw-frontend/src/app/(portal)/routing/playground/page.tsx`
- `apps/claw-frontend/src/hooks/routing/use-playground.ts`
- `apps/claw-frontend/src/components/routing/playground-result-display.tsx`
- i18n keys

**Acceptance:** operator can paste message → see v1 decision; no chat-model call (no cost).
**Note:** v2 / Ollama side-by-side from Stream R.5 lands later. This is the skeleton.
**Rollback:** hide nav entry via flag.

---

## 11.4 — Add YouTube URL detection (regex only, no provider)

**Scope:** detect YouTube URLs in message; set `detectedModality=YOUTUBE_INPUT` on decision; log a TODO line. No actual transcript fetching.

**Files:**

- `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` — single regex check before other detection
- `apps/claw-routing-service/src/modules/routing/constants/youtube-url.constants.ts` — regex (already scaffolded in R.2)

**Acceptance:** YouTube URL → decision has `detectedModalities` including `YOUTUBE_INPUT`; log line says `youtube_detected_workflow_not_implemented`.
**Rollback:** remove regex check.
**Note:** real workflow needs R.2 + R.3.

---

## 11.5 — File-attachment MIME → workflow hint

**Scope:** if request has attachment with `application/pdf` MIME + verb (`summarize|explain`) → set `workflowHint=PDF_EXTRACTION` on decision. No actual PDF extraction wired.

**Files:**

- `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` — single check before AUTO
- Wire attachments into `RoutingContext` (chat-service change required — see Blocker B1)

**Acceptance:** PDF + summarize → decision has `workflowHint=PDF_EXTRACTION`.
**Rollback:** remove check.
**Risk:** Blocker B1 — chat-service must pass attachment metadata in routing context.

---

## 11.6 — Add category filter to `useRoutingDecisions`

**Scope:** add `categoryFilter?: string` query param to `GET /routing/decisions/:threadId`; pipe through to repository.

**Files:**

- `apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts` — accept query param
- `apps/claw-routing-service/src/modules/routing/repositories/routing-decisions.repository.ts` — add WHERE clause
- `apps/claw-frontend/src/hooks/routing/use-routing-decisions.ts` — pass filter
- `apps/claw-frontend/src/app/(portal)/routing/page.tsx` — dropdown filter UI

**Acceptance:** filter by "Coding" → only Coding decisions shown.
**Rollback:** remove filter UI; query param ignored.

---

## 11.7 — Provider+model chart on adaptive-insights

**Scope:** new chart on `/routing/adaptive-insights` showing per-(provider, model) success/failure/latency over 7/30/90-day window.

**Files:**

- `apps/claw-frontend/src/components/routing/provider-model-chart.tsx` — new component using recharts (already in deps)
- `apps/claw-frontend/src/app/(portal)/routing/adaptive-insights/page.tsx` — add the chart
- Backend already exposes this data via existing observability endpoint

**Acceptance:** chart renders with real data; hover shows tooltip.
**Rollback:** hide chart via flag.

---

## 11.8 — Promote 5 confirmed regressions to test fixtures

**Scope:** operational ticket — pick 5 high-value confirmed regressions from Replay Lab, run "Promote to fixture" on each, commit the generated test code.

**Files:**

- `apps/claw-routing-service/test/regression/promoted-fixtures.spec.ts` — appended with 5 new test cases

**Acceptance:** 5 new tests in repo; all pass; PR-blocking on regression.
**Rollback:** revert the commit.

---

## 11.9 — "Rerun decision" button on `/routing` recent list

**Scope:** small refresh icon on each row; clicking re-fires `/routing/evaluate` with the original context; shows old vs new decision in modal.

**Files:**

- `apps/claw-frontend/src/components/routing/routing-decision-row.tsx` — add button
- `apps/claw-frontend/src/hooks/routing/use-rerun-decision.ts` — new mutation hook
- `apps/claw-frontend/src/components/routing/rerun-decision-modal.tsx` — comparison modal

**Acceptance:** click → modal shows old vs new side by side.
**Rollback:** hide button.

---

## 11.10 — Detect non-English text and tag decision

**Scope:** run cheap character-set detector (no lib needed: count non-ASCII chars / total chars > 0.3 → mark as non-EN); save `detectedLanguage='non-en'` flag on decision. Real language detection comes in R.7.

**Files:**

- `apps/claw-routing-service/src/modules/routing/utilities/quick-language-detector.utility.ts` — new pure utility
- `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` — call before other detection

**Acceptance:** Arabic/Spanish/German message → decision has `detectedLanguage='non-en'`; baseline data for R.7 work.
**Rollback:** remove the call.

---

## Activation order (no dependencies)

All 10 are independent; ship in any order. Suggest:

1. 11.1 (workflow on decision) — unlocks UI badges
2. 11.6 (category filter) — easy admin win
3. 11.7 (provider+model chart) — visible improvement
4. 11.2 ("why this model?") — user-visible
5. 11.9 (rerun button) — operator win
6. 11.10 (non-EN tag) — sets up R.7 data
7. 11.4 (YouTube regex) — sets up R.2 data
8. 11.3 (playground skeleton) — sets up R.5
9. 11.8 (promote regressions) — anytime
10. 11.5 (PDF MIME hint) — blocked on chat-service work
