# ADR-033 — Memory Suggestion Queue (Memory V2 Flagship)

## Status

Accepted (2026-05-24)

## Context

Memory V1 wrote AI-extracted memories directly to `memory_records` from the `MESSAGE_COMPLETED` consumer. This made the assistant "remember" anything its extraction model produced — including hallucinated facts, sensitive content, and over-eager preference inferences. Users could neither audit nor veto these writes before they happened, only retroactively delete them. The result was eroded trust and avoidable safety incidents.

## Decision

Introduce a **suggestion queue** that intercepts every AI-extracted memory:

1. The `MESSAGE_COMPLETED` handler runs the existing `MemoryExtractionManager`, then writes each extracted item to `memory_suggestions` with status `PENDING`, a confidence score, a sensitivity verdict from `MemorySensitivityManager`, and provenance back to the source thread + message.
2. A new event `MEMORY_SUGGESTED` fires for downstream consumers (audit-service).
3. The user reviews suggestions in `/memory → Suggestions tab` and explicitly approves, edits-and-approves, rejects, or rejects-with-suppression.
4. An auto-approve threshold (default `0.85`, per-user via `memory_preferences.autoApproveThreshold`) lets the system bypass the queue for high-confidence + `NORMAL` sensitivity items. Sensitive content **never** auto-approves.

## Consequences

**Positive**:

- Users own what the assistant remembers; trust complaints drop.
- Sensitive content is gated; regex pre-filter blocks AWS keys, JWTs, SSNs, credit cards, private-key blocks, GitHub/Google/OpenAI tokens.
- Audit log captures every approve/reject decision; replay possible.
- Backward compatible — `memory_records` schema additive only.

**Negative**:

- Users with notification fatigue may ignore the queue; mitigated with auto-approve threshold and a "bulk approve last 24h" action.
- Two-write pattern (suggestion → record) doubles DB writes for AI-extracted items. Acceptable: extraction frequency is bounded by chat completions.

## Alternatives considered

- **Per-message confirmation modal**: rejected — too disruptive to the chat flow.
- **Trust scoring without a queue**: rejected — opaque to users.

## Related

- ADR-034 (scopes + sensitivity)
- Planning pack `.claude/Integrations/memory-context-v2/`
