# ADR-037 — `LLAMACPP` is a distinct connector provider type

**Status:** Accepted
**Date:** 2026-04-26
**Authors:** Backend Lead

## Context

`claw-connector-service` currently registers providers via the `Provider` enum (`OPENAI`, `ANTHROPIC`, `GEMINI`, `AWS_BEDROCK`, `DEEPSEEK`, `OLLAMA`, `GROK`). The OpenAI-compatible inference proxy at `/api/v1/llamacpp/v1/chat/completions` could be modeled as `OPENAI_COMPATIBLE` — many self-hosted inference servers do that.

But routing decisions hinge on **runtime locality**. A privacy-tagged prompt routes differently to "OpenAI compatible at example.com" vs "OpenAI compatible at 127.0.0.1". Routing must distinguish them.

## Decision

Add `LLAMACPP` as a distinct value in the `Provider` enum. The connector adapter for `LLAMACPP`:

- `healthCheck()` → GET `${baseUrl}/api/v1/llamacpp/health`
- `listModels()` → returns `[loadedModel]` if any
- `chat()` → forwards to `${baseUrl}/api/v1/llamacpp/v1/chat/completions`

The routing service treats `LLAMACPP` connectors as **always local** (privacy-equivalent to `OLLAMA`), regardless of `baseUrl`.

## Rationale

- **Privacy correctness.** Routing rules read `provider` to decide whether a prompt may leave the machine. `OPENAI_COMPATIBLE` is ambiguous; `LLAMACPP` is unambiguously local.
- **UI clarity.** Model selector groups providers — "Frontier Local" deserves its own section, separate from cloud providers and Ollama.
- **Future-proofing.** When `ik_llama.cpp` and `KTransformers` arrive (v1.1), the existing `LLAMACPP` provider type accommodates them; we don't need to introduce `IK_LLAMACPP`, `KTRANSFORMERS`, etc.
- **Audit clarity.** Audit ledger entries say `provider=LLAMACPP` — operators don't have to inspect baseUrl to know whether data left the machine.

## Consequences

- **Migration:** `claw-connector-service` Prisma schema gets a new enum value (`LLAMACPP`). Backwards-compatible (no rows have it on day one).
- **One more adapter file** in `claw-connector-service/src/modules/connectors/managers/adapters/llamacpp.adapter.ts`.
- **Routing service** must consider `LLAMACPP` in privacy-class branches alongside `OLLAMA`.

## Alternatives considered

- **Reuse OPENAI_COMPATIBLE.** Rejected — privacy decisions become ambiguous; routing rules grow case-by-case `if baseUrl.startsWith('http://localhost')` checks.
- **Add a separate `runtime` field to Connector.** Rejected — duplicates the provider taxonomy and creates two sources of truth for "is this local".
