# Rich Model Streaming Progress

Real-time, provider-agnostic progress for every cloud/local model response in
chat: lifecycle stages, live content + reasoning deltas, progress percent,
metrics (TTFT, tokens/s, token count, elapsed, estimated cost), cancellation,
and partial-output preservation.

> **Design decision (ADR-style):** ClawAI already had a working SSE progress
> channel. We **extended it** rather than building the new `POST /chat/messages/stream`
> endpoint some plans proposed — no duplicate transport. See `STREAMING_AUDIT.md`
> at the repo root for the full grounding.

## Architecture at a glance

```
User sends message
  → POST /api/v1/chat-messages  (USER row, publishes message.created)
  → routing-service → message.routed
  → chat-service handleMessageRouted → ChatExecutionManager.execute
      → invokeProviderWithProgress → (streamable?) streamCandidate
          → streamCloud / streamLlamacpp        (true streaming)
          → simulateOllamaStream                 (buffered → simulated)
              → ProviderStreamExecutor
                  → httpStream (idle-timeout, abortable)
                  → ProviderStreamReader (OpenAI-SSE | Ollama-NDJSON)
                  → ThinkingFragmentScanner (<think> split)
                  → StreamProgressTracker (monotonic %, caps)
                  → ChatStreamService.emit{Lifecycle,ContentDelta,ReasoningDelta,Metrics,Usage}
  → ASSISTANT row persisted (unchanged) + message.completed
Frontend:
  GET /api/v1/chat-messages/stream/:threadId  (SSE, ownership-gated)
  → connectSse (fetch + ReadableStream, Bearer)
  → useChatStream accumulates content/reasoning/metrics → streamLive
  → ThinkingIndicator renders the live card (progress bar, thinking panel, metrics HUD, cancel)
```

## Why only two wire formats (not seven adapters)

Every cloud provider in ClawAI is reached through one **OpenAI-compatible**
`/chat/completions` call (`ChatExecutionManager.callCloudProvider`). Local
Ollama uses native `/api/generate`; the OLLAMA connector uses native `/api/chat`.
So the streaming surface is exactly:

| Protocol | Used by | Reader behaviour |
| --- | --- | --- |
| `OPENAI_SSE` | OpenAI, Anthropic, Gemini, Grok, DeepSeek, Bedrock (all OpenAI-compat base URLs) + llama.cpp | parses `data: {choices[].delta.content}` + `reasoning_content`/`reasoning` + final `usage`, terminates on `[DONE]` |
| `OLLAMA_NDJSON` | OLLAMA connector (`/api/chat`) | one JSON object per line: `message.content`/`response`, `thinking`, final stats |
| `SIMULATED` | local Ollama via ollama-service (no streaming endpoint), and any non-streaming provider | buffered response replayed as chunks; progress labelled estimated |

Provider-native reasoning (`reasoning_content`, Ollama `thinking`) →
`PROVIDER_EXPOSED` / `MODEL_EMITTED`. Model-emitted `<think>…</think>` inside
content is split out by the scanner. **Hidden chain-of-thought is never streamed.**

## Event contract

Events flow over the existing `StreamEvent` type (extended). New `StreamEventType`
members: `LIFECYCLE`, `CONTENT_DELTA`, `REASONING_DELTA`, `METRICS`, `USAGE`.
Enums (backend `apps/claw-chat-service/src/common/enums/`, mirrored on FE
`apps/claw-frontend/src/enums/`): `AiStreamStage`, `AiStreamProgressConfidence`,
`AiReasoningVisibility`, `AiStreamProtocol`.

`delta` / `reasoningDelta` / `metrics` / `usage` fields bypass the 240-char
label sanitizer (they carry the model's real answer); they are rendered as
escaped text on the FE, never HTML.

## Progress engine

`StreamProgressTracker` (one per run):
1. If `maxOutputTokens` known → `45 + 50·(generated/max)` capped 95.
2. Else asymptotic ramp `45 + 50·(1 − e^(−generated/300))` capped 95.
3. Other stages use `STAGE_PROGRESS_FLOOR`.
Progress is **monotonic**, capped at 95 % until generation ends, 99 % while
finalizing, and reaches 100 % only on the explicit `COMPLETE` snapshot. Percent
is labelled `estimated` unless `EXACT`.

Cost: `estimateCostUsd` — local providers are free ($0, available); cloud models
matched by longest pricing-key substring; unknown → "cost unavailable" (never $0).

## Cancellation & security

- `POST /api/v1/chat-messages/stream/:threadId/cancel` — ownership-checked
  (`StreamControlService.assertOwnership`), aborts the provider connection via
  the `AbortController` held in `StreamCancellationService`. Partial output is
  preserved (the accumulated content is still persisted).
- The SSE subscribe route is now **ownership-gated** (was an open gap): a user
  can only subscribe to their own thread; cross-user → 404.

## How to add a new provider stream adapter

1. If the provider speaks OpenAI-compatible `/chat/completions` (streaming),
   nothing to do — `streamCloud` + `OPENAI_SSE` already covers it once the
   connector is configured with the right base URL + key.
2. If it has a bespoke wire format, add a value to `AiStreamProtocol`, extend
   `ProviderStreamReader` with a `parse<Provider>Line` branch that emits
   `NormalizedStreamFragment`s, and route to it from `streamCandidate`.
3. If it cannot stream, route it through `ProviderStreamExecutor.runSimulated`
   (like local Ollama) — it still gets the full rich UI, labelled `SIMULATED`.
4. Add fixtures + a `provider-stream-reader.utility.spec.ts` case.

## Testing

- Backend unit: `apps/claw-chat-service/src/modules/chat-messages/__tests__/`
  — `thinking-fragment-scanner`, `provider-stream-reader`, `stream-progress-tracker`,
  `cost-estimator` (29 tests).
- API: send a forced-Gemini message, subscribe to the SSE route, observe
  `lifecycle → content_delta → metrics → done`.
- UI: the live card (progress bar, reasoning panel, metrics HUD, cancel) renders
  in the chat thread footer while a response streams.

## Files

Backend (`apps/claw-chat-service/src/modules/chat-messages/`):
`managers/provider-stream-executor.manager.ts`, `managers/chat-execution.manager.ts`
(streaming dispatch), `services/{chat-stream,stream-cancellation,stream-control}.service.ts`,
`controllers/chat-stream.controller.ts`, `utilities/{provider-stream-reader,thinking-fragment-scanner,stream-progress-tracker,token-estimator,cost-estimator}.utility.ts`,
`common/utilities/http-client.utility.ts` (`httpStream`).

Frontend (`apps/claw-frontend/src/`):
`hooks/chat/{use-chat-stream,use-cancel-stream}.ts`,
`components/chat/stream/*`, `components/chat/thinking-indicator.tsx`,
`repositories/chat/chat.repository.ts` (`cancelStream`).
