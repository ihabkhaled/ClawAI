# ADR-173: Threads assumes a conservative window for an unknown model and fails only on overflow

**Status:** Accepted

**Date:** 2026-10-13

Supersedes the sentence "unknown or oversized windows fail closed without truncation" in [ClawAI Threads architecture](../03-architecture/clawai-threads-architecture.md). Builds on [ADR-159](adr-159-clawai-threads-two-service-architecture.md) and [ADR-167](adr-167-thread-generation-progress-is-an-owner-only-step-log.md); same lesson as [rule 51](../../rules/51-router-candidates-and-model-window-fit.md).

## Context

Production, 2026-10-13: every Threads generation failed at the first author step in under 30 ms with `MODEL_CONTEXT_UNAVAILABLE`, three times, and spent about 45 s of retries on it. `ModelContextClient` threw whenever routing-service answered `contextWindowTokens: null`. Catalog rows for OLLAMA, OPENROUTER and GROQ models carry no window unless an enrichment job filled it, and the shared table had no rows for those providers, so a normal role selection (for example OLLAMA `glm-5.3`, GROQ `openai/gpt-oss-120b`) could never start. Three different faults (catalog unreachable, catalog said no, window unknown) shared one code, and every one was retried although only the first can heal.

## Decision

- **An unknown window is assumed, not fatal.** When routing-service returns no window and the shared table has none either, `ModelContextClient` returns `{ tokens: 32768, source: 'assumed' }` (`THREADS_ASSUMED_WINDOW_TOKENS`, the same conservative default chat-service uses). A window from the catalog or the shared table is `source: 'known'`.
- **Never truncate stays absolute.** The complete prompt plus the output reserve is still checked against the window. If it does not fit, the role fails before any model call, with its own message: "exceeds the model window" for a known window, "exceeds the assumed model window" for an assumed one. The prompt is never shortened.
- **Lookups are cached.** An in-memory map per process, keyed by provider and model, 5 minute TTL, 200 entries (oldest dropped first). Assumed windows are cached too; failures never are.
- **The shared window table gains `GROQ`, `OPENROUTER` and `OLLAMA` rows for the gpt-oss family only** (131,072, the number already in the table for OPENAI). No number is added for glm, qwen or mistral: the repository states none, so they use the assumed default until a catalog sync fills a real value.
- **Four failures, four codes.** `MODEL_CATALOG_UNREACHABLE` (network error, 5xx, 408/425/429), `MODEL_CATALOG_REJECTED` (any other 4xx: a wrong token or route), `CONTEXT_WINDOW_EXCEEDED` (known window, prompt too large) and `CONTEXT_WINDOW_ASSUMED` (assumed window, prompt too large). The broad "Model context" fragment is gone. `MODEL_CONTEXT_UNAVAILABLE` is no longer emitted but stays in the frontend map so steps stored before this change still read.
- **Deterministic failures are not retried.** `DeterministicGenerationError` (a `ServiceUnavailableException`) marks a failure a retry cannot fix: the prompt does not fit, a role configuration is invalid, the catalog rejected the lookup. A role is deterministic only when every candidate (primary and fallbacks) failed deterministically; one transient failure keeps it retryable. Among several failed authors a transient one decides. `retryOrFail(jobId, attempt, summary, retryable)` then moves the job straight to FAILED on attempt 1 and the budget is released as before. Unreachable catalog, 5xx and gateway errors still retry (3 attempts, 15 s then 30 s).

## Consequences

- A role with an unenriched catalog row works if its prompt fits 32k, and fails fast with a plain reason if not. A model that really has a larger window but is unknown to us is limited to 32k until its row is enriched; that costs a failed job for very large sources, never a truncated or wrong draft.
- An owner who picks models that cannot hold the source sees the cause on the first attempt instead of after about 45 s.
- A wrong inter-service token now fails once with `MODEL_CATALOG_REJECTED` instead of three times.
- The in-memory cache is per process; a restart or a second replica asks routing-service again, at most once per model per five minutes.
- Chat surfaces are untouched: chat-service already failed open on an unknown window.

## Addendum 2026-10-13: the picker's catalog is the first window source

A second production round showed GROQ (`openai/gpt-oss-120b`, 131,072) and OPENROUTER (`mistralai/mistral-small-2603`, 262,144) still falling to the assumed 32k although the model picker shows their real windows. The picker reads connector-service's `ConnectorModel.maxContextTokens`; the router registry has no rows for GROQ, OPENROUTER, NVIDIANIM, HUGGINGFACE or AI_HORDE, and the shared table covers only a few families. Threads asked the router, never the picker's source.

- **Order is now: connector catalog window, then router registry, then the shared static table, then the assumed 32,768.** The first source that states a positive window wins and is `source: 'known'`.
- **The catalog source is connector-service's `GET /api/v1/internal/connectors/public-catalog`** (service token, the existing internal pattern). It is built with `findExposedForCatalog`, the same query that fills the in-app picker, so what a user sees is what Threads uses. No connector-service change was needed. `ConnectorCatalogWindowClient` reads it once, indexes `PROVIDER/modelKey` to window for 5 minutes, and shares one in-flight read between concurrent lookups.
- **The catalog source fails open.** A network error, non-2xx, wrong shape or refused URL answers "no window", so the router is asked next; a failed read is not retried for 30 seconds so a down connector-service costs one wait of at most 4 seconds, not one per role. The router keeps its ADR-173 failure codes (`MODEL_CATALOG_UNREACHABLE`, `MODEL_CATALOG_REJECTED`) unchanged. A catalog hit never calls the router, so an unreachable router no longer blocks a model the picker knows.
- **Limit.** The catalog lists only exposed, active chat models, which is exactly what a user can pick. A model outside that set (unexposed, or a custom key) still resolves through the router, the shared table, then the assumed default.
- **Config.** `CONNECTOR_SERVICE_URL` (already in the shared `.env`; default `http://connector-service:4003`). No new variable.

## Addendum 2026-10-13: tolerant output parsing and per-call spend

Production rounds showed Gemini and some Ollama models answering with a code fence, markdown or prose around the JSON, which failed steps as `OUTPUT_INVALID`, and `spentMicroCredits` staying 0 although real calls were made (nothing ever wrote it).

- Role replies are read by `parseModelJson`: bare JSON, one fence, or the first balanced object in prose (string-aware), preferring the object the role schema accepts. Truncated or JSON-free replies still fail `OUTPUT_INVALID`. The existing schemas still validate; no repair re-ask is added.
- The job total is the sum of the gateway-reported `costMicroUsd` (integer micro-USD) of every call, added right after each call, including unusable and cut-short replies. No price is computed in this service. The field is optional on the wire, so a chat-service that does not send it leaves the total at 0 and nothing breaks.
