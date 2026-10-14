# ADR-175: Threads model calls are bounded by silence, not by the clock

**Status:** Accepted

**Date:** 2026-10-13

Builds on [ADR-159](adr-159-clawai-threads-two-service-architecture.md), [ADR-167](adr-167-thread-generation-progress-is-an-owner-only-step-log.md), [ADR-173](adr-173-threads-unknown-model-window-is-assumed-not-fatal.md) and [ADR-174](adr-174-threads-refuses-what-cannot-succeed-before-it-queues.md). Money rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 46](../../rules/46-token-quota-enforcement-and-window-integrity.md). Chat pipeline: [rule 59](../../rules/59-chat-surfaces-are-one-pipeline.md).

## Context

A Threads generation role call (one author draft, one review) went thread-generation-service to chat-service to the provider as one non-streaming request. Three fixed wall-clock caps raced on it and the smallest won: 180 s on the thread side, 300 s total on chat-service's provider call (`OLLAMA_GENERATE_TIMEOUT_MS`), and the runtime's own 300 s header and body timers. A model that was still answering or thinking was killed at three minutes. Nothing could be "reset on activity" because no byte flowed until the model had finished.

Three more faults sat beside it:

- **Cancel took about a minute.** Cancel was read between steps, never inside a call, so a cancelled job waited out the call in flight, and the paid provider call kept running (and was settled) after the thread side had given up.
- **Reasoning models returned nothing.** `generateOnce` sent the Ollama body with no `think` field, while the chat path forces `think: false` unless asked. Ollama's output budget covers the thinking and the answer, so a model could spend all of it thinking and return empty content, reported as `CLOUD_PROVIDER_EMPTY_RESPONSE`.
- **Spend was not visible.** The settled cost was known to chat-service and dropped before the reply.

The owner's requirement: a model call must not die on a fixed clock while the model is still responding or thinking. Silence is the signal. 300 s of silence means stuck; one call has an absolute ceiling of 600 s; a job attempt has a ceiling of 25 minutes; cancel stops the in-flight call within about two seconds.

## Decision

### The endpoint

chat-service gains `POST /api/v1/internal/chat/generate-stream` (service token, same body and validation as `/internal/chat/generate`, which is unchanged for workspace-service). The answer is `application/x-ndjson`, one JSON object per line:

- `{"type":"activity"}` written only when provider bytes actually arrived (any chunk: answer, thinking, an SSE comment), at most once a second. Never on a timer, because a timer ping would make a stuck model look alive.
- Then exactly one terminal line: `{"type":"result","data":<the /generate JSON plus optional costMicroUsd>}` or `{"type":"error","status":<http status>,"code":"<MACHINE_CODE>","message":"<short text>"}`.

Headers are flushed before the provider is dialled, so every failure after that point, including a credit refusal, is a coded line in a 200 body. Refusals before the handler runs (service token, body validation) stay plain HTTP statuses. The frame schemas are mirrored in each service; no shared package changes.

### The clocks (chat-service)

Protocol constants in `constants/internal-generate.constants.ts`, no environment variables:

| Constant                                     | Value   | Meaning                                                                                     |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `INTERNAL_GENERATE_IDLE_TIMEOUT_MS`          | 300 000 | no provider byte for this long, including the wait for the first byte; reset by every chunk |
| `INTERNAL_GENERATE_MAX_TOTAL_MS`             | 600 000 | absolute ceiling for one call, never reset                                                  |
| `INTERNAL_GENERATE_BUFFERED_MAX_MS`          | 600 000 | ceiling for a provider that cannot stream                                                   |
| `INTERNAL_GENERATE_ACTIVITY_MIN_INTERVAL_MS` | 1 000   | activity lines are throttled to one a second                                                |

`httpStream` already had an idle timer. It gains an optional `maxTotalMs` ceiling and aborts with typed reasons (`StreamIdleTimeoutError`, `StreamCeilingError`); a caller abort passes its own reason through. Existing callers are unchanged: the new option is optional and they pass none.

The ceiling is 600 s because a PAYG hold is reclaimable after `PAYG_RESERVATION_TTL_MS` (15 min) plus the 5-minute sweeper, so a call must finish well inside that or its hold can be swept while it runs.

### The same money flow

`generateOnceStream` shares `prepareInternalGenerate` with `generateOnce`: connector first (a missing key costs nothing), then `reserveCredit`, then the provider call under the hold, then `finalizeCredit` on measured usage, or `releaseCredit` on any failure. The release reason is the true one: `TIMEOUT` for idle and ceiling, `CANCELLED` when the caller went away, `PROVIDER_ERROR` otherwise. `generateOnce` keeps `PROVIDER_ERROR` and its raw errors. The streamed characters seen before a failure are logged: the provider billed those tokens and the hold is released regardless (the existing policy for a failed call), so the loss is measurable. Whether to settle a partial stream instead is an open owner decision; nothing changes silently.

The provider stream is read with the same `ProviderStreamReader` the chat surfaces use (Ollama NDJSON, OpenAI-style SSE) and folded without the chat-thread emission an internal caller has no thread for.

### Cancel

The controller turns the socket closing before the terminal line into an `AbortController` abort. The signal reaches the provider fetch, so the provider call stops and the hold is released as `CANCELLED`. The thread side aborts its own request when its cancel poll sees a request, so the end-to-end latency is the poll interval plus a socket close.

### Providers that cannot stream

A connector config that says `supportsStreaming: false` gets one buffered call under `INTERNAL_GENERATE_BUFFERED_MAX_MS` and sends no activity: no byte flows until the model finishes, so absolute time is the only guard that exists. A provider that answers `stream: true` with one plain JSON document is read as the buffered reply it is. connector-service does not send `supportsStreaming` yet, so today only the second case applies; the field is read when it arrives. No provider is named in code.

### Reasoning without an answer

- `think` is sent to the Ollama connector as `false` unless the request sets the new optional `thinking: true`, on both endpoints, the same choice and reason as the chat path. Whether a boolean is accepted by every Ollama model (gpt-oss documents levels) is not verified; the chat path has sent it to all Ollama Cloud models.
- Thinking with no answer is its own code, `MODEL_REASONED_NO_ANSWER` (502), on both endpoints. A provider that returned an empty envelope keeps `CLOUD_PROVIDER_EMPTY_RESPONSE`. `parseOllamaChatResponse`, which serves every chat surface, is not changed.
- `ProviderStreamReader` read Ollama's `thinking` only at the top of a frame (the `/api/generate` shape). `/api/chat` puts it in `message.thinking`, so a thinking-only chat stream folded to nothing. The reader now reads both.

### Machine codes

New: `MODEL_IDLE_TIMEOUT` (504), `MODEL_HARD_CEILING` (504), `MODEL_REASONED_NO_ANSWER` (502), `CLIENT_ABORTED` (logged, never written: the socket is gone). Unchanged codes pass through, including the PAYG refusals (402) and `PROVIDER_CREDIT_EXHAUSTED`. A code is `^[A-Z][A-Z0-9_]{2,59}$` or the fixed fallback `INTERNAL_GENERATE_FAILED`. A message that carries a URL or starts as JSON is replaced whole (ADR-124); a failure that is not an HTTP exception (a dropped connection) is `PROVIDER_UNREACHABLE` with a fixed sentence, never the error text.

### Cost on both endpoints

`costMicroUsd` is the settled outcome through `paygDisclosableCost`: present only when auth-service names the user PAYG and the hold was metered, `0` is a real value, absent otherwise, never an estimate.

## Consequences

- A model that keeps sending is never cut by the clock: a 500 s call with a frame every 250 s succeeds; 300 s of silence fails with a code that says so; a call that never goes quiet ends at 600 s.
- A cancelled job stops spending within moments; before, the provider call ran to its own timeout and was settled for an answer nobody read.
- Reasoning models that spent their budget thinking fail fast with a code an operator can act on (raise `maxTokens` or leave thinking off), instead of an empty-response error after a long wait.
- Deploy order: chat-service first (new endpoint, old one untouched), then thread-generation-service, which falls back to the old endpoint on a 404 for one release. A rolling restart of chat-service kills in-flight streams and strands their holds until the sweeper reclaims them (15 to 20 minutes), as it already did for the buffered call.
- Two timeouts do not go away: undici's own 300 s header and body timers are the same figure as the idle limit. The idle clock is armed first and carries a typed reason, but the runtime's timer could fire at exactly 300 s. If streams are ever seen to die at exactly 300 s with an anonymous abort, pass a dispatcher with both set to 0; that needs the `undici` package as a dependency and is not done here.
- Unverified without a live run: whether Ollama Cloud emits frames continuously while a model thinks, or buffers thinking until done. If it buffers, a long think looks silent and the 300 s idle clock would cut it. The live lane in the QA record measures the largest gap between frames.

## Addendum 2026-10-14: a caller who cancels mid-call still pays for what streamed

The open question of this ADR (a cancelled stream released the whole hold, so cancelling late cost nothing for tokens the provider had already generated) is settled.

- On `/internal/chat/generate-stream`, when the caller aborts AFTER at least one chunk arrived, the hold is settled instead of released: `completionTokens = min(ceil(streamedChars / 4), hold ceiling)` and `promptTokens = estimate of the prompt text`, through `finalizeCredit`. `streamedChars` is the wire characters counted by `onActivity`, so the JSON envelope is included; this over-counts slightly and is bounded by the hold. Abort with nothing streamed, idle timeout, ceiling and provider errors still release the whole hold under their own reasons. The response is still `CLIENT_ABORTED`; only the money differs.
- The normal chat path follows the same rule (round-2 O1). Stop used to reject the transport iterator and the text already streamed was thrown away, stored as "no visible final answer" with 0 tokens. `ProviderStreamExecutor.consume` now ends the loop as a cancel when the caller's signal is aborted, keeps the partial content, and `buildExecutorResponse` bills a cancelled run on the prompt estimate plus the provider's count or the estimate from the streamed text, through the same chokepoint (`recordChokepointUsage`, `settlePaygHold`), which releases the unused part of the hold.
- Not done: a `stopped` marker on the stored message (needs `chat-messages.service.ts` `buildAssistantMetadata`, a file with legacy lint debt outside this change).
