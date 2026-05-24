# ADR-037 — Unified Retrieval Bundle (Memory + Context Integration V2)

## Status

Accepted (2026-05-24)

## Context

V1 chat-service called memory-service and context-packs-service separately, mashed the results into a prompt with no per-item provenance, and threw away any signal about what influenced which message. The "why did the AI know that?" question was unanswerable.

## Decision

Memory-service exposes a single `POST /internal/memories/retrieve` endpoint that returns a `RetrievalBundle` containing memories (with content, scope, sensitivity, source thread + message, score, reason) and pack items (with itemType, content, score, reason, pinned, tokenCountEstimate). The bundle includes an `assemblyOrder` array, the token budget, the actual budget used, retrieval latency, and a `warnings` array. Chat-service consumes the bundle via the new `RetrievalManager` integration point and writes a per-message receipt (ADR-038) for "why was this used?" introspection.

The bundle is the single source of truth for: chat assembly, the compose-time preview popover, the per-message receipt, and the inspector. Inspector parity (same code path as live retrieval) is non-negotiable.

## Consequences

- One endpoint replaces two; reduces round-trip variance.
- Receipt fidelity guaranteed (no string scraping of the assembled prompt).
- Memory retrieval can now be intent-aware and scope-safe in a single query.

## Related

- ADR-033, ADR-034 (memory V2 foundations)
- ADR-038 (receipt store)
