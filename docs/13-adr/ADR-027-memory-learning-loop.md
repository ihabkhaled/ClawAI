# ADR-027 — Memory Learning Loop From Approve / Reject Decisions

**Status:** Accepted (2026-05-01) — v1 with heuristic classifier; LLM upgrade deferred to v1.x
**Stream:** 40

## Context

Without a feedback loop, the suggestion factory's prompt is the same on day 365 as on day 1. Customers who consistently rephrase a draft to be shorter, or reject suggestions that mention internal acronyms, get no benefit from that signal.

## Decision

`apps/claw-workspace-service/src/modules/learning/`:

1. **Consumer** — `AiActionDecisionConsumer` subscribes to four events:
   - `ai_action.approved`
   - `ai_action.auto_approved`
   - `ai_action.rejected`
   - `ai_action.edited`
2. **Classifier** — `PreferenceClassifierManager.classify()` is a pure-function, no-LLM heuristic for v1:
   - EDITED + length-shrunk ≥ 40% → "User prefers shorter {actionKind} drafts"
   - EDITED + length-grown ≥ 50% → "User prefers more detail in {actionKind} drafts"
   - REJECTED + reasonText ≥ 6 chars → "User rejects {actionKind} when: {reason}"
   - APPROVED / AUTO_APPROVED → no preference (weak signal alone)
   - All preferences capped at 240 chars; confidence 0.5–0.6.
3. **Upsert service** — `PreferenceUpsertService` posts each preference to memory-service `POST /api/v1/internal/memories/automation-preference` (new public service-to-service endpoint added in this stream). Failures degrade gracefully — one failed pref doesn't block siblings.
4. **Output event** — `memory.preference.upserted` published per upsert batch, consumed by audit-service for ledger purposes.

The full LLM-backed classifier (planned v1.x) plugs in at the `classify()` boundary without rewriting the consumer or upsert path.

## Consequences

- Day-1 value with no LLM cost: edits → "prefers shorter" memory immediately.
- Failure mode is benign — classifier returning `[]` means "no learning this round", never a crash.
- Cross-user leak risk is bounded by memory-service which already user-scopes every query.
- Memory bloat is the open risk: heuristic v1 produces ~1 preference per edit, so a chatty user could hit 50+ memories per kind. Stream 40 prompt mentions LRU eviction at 50/kind; not implemented in v1 — tracked as tech debt.

## Verification

- 8 unit tests in `preference-classifier.manager.spec.ts` cover all decision types + edge cases.
- Integration: send synthetic `ai_action.edited` to `claw.events` → verify memory-service has new PREFERENCE row scoped to userId.

## Future work (v1.x)

- Replace heuristic with structured-JSON LLM classifier (gemma3:4b) using `LEARNING_CLASSIFIER_MODEL` env var.
- Add LRU eviction at memory cap.
- Add `/workspace/automation-preferences` "What we've learned about you" UI section with visible-confidence + delete button.
- Inject top 10 preferences into `SuggestionFactoryManager` prompt template via `{{learnedPreferences}}` placeholder.
