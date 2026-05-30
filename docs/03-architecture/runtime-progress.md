# Local-runtime rich-progress architecture

> PR1 — Foundation. Defines the unified `ClawRuntimeProgressEvent` envelope, the
> admin probe contract, the llama.cpp think-tag leak fix, and the frontend
> decomposition. **This work EXTENDS the cloud rich-progress system that already
> ships in `claw-chat-service`. It does NOT build a parallel stack.**

---

## 1. Motivation — the cloud-vs-local perception gap

ClawAI's cloud chat path already streams **lifecycle stages + content deltas +
reasoning deltas + token/cost metrics** end-to-end. A user picking
`claude-sonnet-4` or `gpt-4o-mini` sees a live progress card the instant they
hit send: TTFT, tokens-per-second, partial answer text, partial reasoning,
provider/model badge, fallback chain. That live experience is the contract
defined in `STREAMING_AUDIT.md` and implemented in:

- `apps/claw-chat-service/src/modules/chat-messages/services/chat-stream.service.ts`
  (the per-thread RxJS Subject + replay buffer + monotonic sequence)
- `apps/claw-chat-service/src/modules/chat-messages/managers/provider-stream-executor.manager.ts`
  (the OpenAI-SSE + Ollama-NDJSON normalizer)
- `apps/claw-chat-service/src/modules/chat-messages/controllers/chat-stream.controller.ts`
  (`@Sse('stream/:threadId')` — fetch+ReadableStream from the FE, Bearer auth)
- `apps/claw-chat-service/src/common/enums/ai-stream-stage.enum.ts` /
  `ai-stream-protocol.enum.ts` (the contract)

A user picking a **local** runtime — Ollama, llama.cpp, ComfyUI, SD WebUI —
sees almost none of that. The progress signal stops at the chat-service
boundary: chat-service calls `ollama-service` or `llamacpp-service` over plain
HTTP, gets back a buffered JSON response, and only THEN emits a single
`COMPLETE` lifecycle event. ComfyUI's WebSocket progress events, llama.cpp's
`prompt_eval` timings, Ollama's `eval_count` / `eval_duration`, and SD WebUI's
sampling step progress are all thrown away.

This document describes the foundation layer that closes that gap. It does NOT
yet rewire chat-service to consume local-runtime progress (that's PR2). PR1
ships the contract, the probes, and the visible-reasoning fix that the rest of
the work depends on.

---

## 2. Reuse story — extend the cloud rich-progress system

The existing cloud rich-progress system is the foundation. The decision is
deliberate: **extend the same pipeline, do not build a parallel one.**

| Cloud rich-progress (today)                                       | Local rich-progress (PR2+ direction)                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `ChatStreamService` (RxJS Subject per thread)                     | **Reused as-is.** Local runtime adapters publish into the SAME service.                |
| `ProviderStreamExecutor` (OpenAI-SSE / Ollama)                    | **Extended.** New adapters registered per `RuntimeProvider`.                           |
| `AiStreamProtocol` (`OPENAI_SSE` / `OLLAMA_NDJSON` / `SIMULATED`) | **Extended** with `LLAMACPP_NATIVE_COMPLETION`, `COMFYUI_WS`, `SDWEBUI_POLL` variants. |
| `AiStreamStage` (16-stage lifecycle)                              | **Superset** in `RuntimeProgressStage` (20 stages) — image-runtime stages added.       |
| `@Sse('stream/:threadId')` controller                             | **Reused.** Lane-aware fan-out via `laneId` (already present in the audit envelope).   |
| Frontend `useChatStream` + `thinking-indicator`                   | **Decomposed** into `RuntimeProgressPanel` + sub-panels (see §6).                      |

The trade-off: the new envelope (`ClawRuntimeProgressEvent`) is a **strict
superset** of `StreamEvent`. A future PR migrates `StreamEvent` callers to the
new envelope (one-way mapping is loss-free). Until then, the two envelopes
coexist behind a single SSE channel — local-runtime adapters emit
`ClawRuntimeProgressEvent`, cloud paths continue emitting `StreamEvent`, the
frontend handles both.

---

## 3. The unified envelope

Defined in `packages/shared-types/src/runtime-progress/`. Every local-runtime
adapter (Ollama, llama.cpp, ComfyUI, SD WebUI) normalizes its native protocol
into this single envelope shape. The envelope is **transport-agnostic** — it
ships unchanged whether the carrier is HTTP SSE, RabbitMQ, WebSocket, or
RxJS Subject.

### 3.1 Top-level event — `ClawRuntimeProgressEvent`

| Field                        | Type                       | Notes                                                                      |
| ---------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `id`                         | `string`                   | Per-event UUID. Idempotency key for de-dup on reconnect.                   |
| `runId`                      | `string`                   | Per-runtime-call UUID. All events for one inference share this id.         |
| `version`                    | `'runtime-progress-v1'`    | Schema version literal. Enables breaking-change rollout via a new literal. |
| `conversationId`             | `string?`                  | Chat thread id (text modality).                                            |
| `messageId`                  | `string?`                  | The ASSISTANT message id once known.                                       |
| `jobId`                      | `string?`                  | Image-generation job id (image modality).                                  |
| `laneId`                     | `string?`                  | Parallel-compare lane discriminator (PR2 + parallel-compare integration).  |
| `parallelGroupId`            | `string?`                  | Groups N lanes into one compare run.                                       |
| `provider`                   | `RuntimeProvider`          | `OLLAMA` / `LLAMACPP` / `STABLE_DIFFUSION_WEBUI` / `COMFYUI`.              |
| `modality`                   | `RuntimeModality`          | `TEXT` / `IMAGE` / `MULTIMODAL`.                                           |
| `modelId`                    | `string?`                  | The model the runtime is using (e.g. `qwen3:1.7b`, `Kimi-K2-Q4_K_M`).      |
| `runtimeUrl`                 | `string?`                  | The HTTP base URL the runtime is reachable at (probe + debug only).        |
| `eventType`                  | `RuntimeProgressEventType` | The semantic class (`CONTENT_DELTA`, `REASONING_DELTA`, `METRICS`, …).     |
| `stage`                      | `RuntimeProgressStage`     | The lifecycle position. ALWAYS set, even on content deltas.                |
| `createdAtMs`                | `number`                   | Server-side capture time (epoch ms).                                       |
| `sequence`                   | `number`                   | Per-`runId` monotonic counter. Receivers MAY reorder.                      |
| `contentDelta`               | `string?`                  | New visible answer text (never carry the FULL message — only the delta).   |
| `reasoningDelta`             | `string?`                  | New visible reasoning text (delta, never full).                            |
| `visibleReasoningSource`     | `VisibleReasoningSource?`  | Which channel surfaced the reasoning (think-tag, Ollama `thinking`, …).    |
| `nodeId` / `nodeName`        | `string?`                  | ComfyUI workflow-node id + display name when emitting node progress.       |
| `imagePreviewBase64`         | `string?`                  | Optional in-progress preview frame. RFC: cap at 64 KB, NEVER persist.      |
| `artifactId`                 | `string?`                  | Image-runtime: final saved artifact id (file-service).                     |
| `metrics`                    | `RuntimeProgressMetrics?`  | Token/timing/step/queue metrics (see §3.2).                                |
| `rawProviderEventType`       | `string?`                  | Verbatim source-event tag, for debug. Never UI-facing.                     |
| `errorType` / `errorMessage` | enum + `string?`           | Set on `ERROR` events.                                                     |

### 3.2 Metrics — `RuntimeProgressMetrics`

The metric channel carries everything a UI needs to render an HUD: token
counts, TTFT, tokens-per-second, step counts for image runtimes, queue depth,
estimated percent done plus a **confidence label** that says how trustworthy
that percent is.

| Field                                           | Notes                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `startedAtMs`                                   | When the runtime call started. Required.                                             |
| `elapsedMs`                                     | Now − startedAtMs. Required so the FE doesn't compute it locally.                    |
| `timeToFirstByteMs`                             | First HTTP body byte received.                                                       |
| `timeToFirstTokenMs`                            | First content delta after parser stripped think tags.                                |
| `timeToFirstThinkingMs`                         | First reasoning delta (think-tag or Ollama `thinking`).                              |
| `modelLoadMs`                                   | llama.cpp / Ollama: time spent loading weights.                                      |
| `promptEvalMs`                                  | llama.cpp: prefill time. Ollama: `prompt_eval_duration`.                             |
| `generationMs`                                  | Sampling/decoding time so far.                                                       |
| `samplingMs`                                    | Image: time spent in sampler stage (k-diffusion, Euler, etc.).                       |
| `saveMs`                                        | Image: encode+disk save time.                                                        |
| `promptTokens` / `outputTokens` / `totalTokens` | When the runtime reports them.                                                       |
| `tokensPerSecond`                               | Computed by the adapter, NOT the FE.                                                 |
| `currentStep` / `totalSteps`                    | Image runtimes — sampler step counter.                                               |
| `stepsPerSecond`                                | Image runtimes — sampler throughput.                                                 |
| `queuePosition`                                 | When the runtime queues (ComfyUI, llama.cpp single-slot).                            |
| `progressPercent`                               | 0-100. May be EXACT (image step ratio) or HEURISTIC (token-bound estimate).          |
| `progressConfidence`                            | `EXACT` / `RUNTIME_REPORTED` / `TOKEN_BOUND` / `HEURISTIC` / `STAGE_ESTIMATED`.      |
| `bottleneckStage`                               | Set by the adapter when one stage is dominating elapsed time (e.g. `MODEL_LOADING`). |

### 3.3 Enums — the contract surface

All enums live in `packages/shared-types/src/runtime-progress/`:

| Enum                        | Values (count) | Purpose                                                             |
| --------------------------- | -------------- | ------------------------------------------------------------------- |
| `RuntimeProvider`           | 4              | Which local runtime emitted the event.                              |
| `RuntimeModality`           | 3              | `TEXT` / `IMAGE` / `MULTIMODAL`.                                    |
| `RuntimeProgressStage`      | 20             | Lifecycle position. Superset of `AiStreamStage`.                    |
| `RuntimeProgressEventType`  | 11             | Semantic class of the event.                                        |
| `RuntimeProgressConfidence` | 5              | How trustworthy the `progressPercent` is.                           |
| `RuntimeExecutionProfile`   | 7              | `CPU` / `CUDA` / `ROCM` / `VULKAN` / `METAL` / `MIXED` / `UNKNOWN`. |
| `StreamingErrorType`        | 12             | Classified streaming-side failure modes.                            |
| `VisibleReasoningSource`    | 8              | Which channel surfaced the visible reasoning.                       |
| `RuntimeProbeStatus`        | 6              | Reachability status returned by the probe endpoints.                |

---

## 4. The probe contract

Two new admin-only endpoints expose a per-runtime capability snapshot. The
report shape is `RuntimeProbeReport` from `packages/shared-types`. Returning
the same shape from both services means the frontend admin page can reuse one
panel component for every runtime.

| Endpoint                                      | Service                 | Auth                          | Description                                                         |
| --------------------------------------------- | ----------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `GET /api/v1/ollama/runtime-progress/probe`   | `claw-ollama-service`   | ADMIN role                    | Reachability + version + installed models + recent generate events. |
| `GET /api/v1/llamacpp/runtime-progress/probe` | `claw-llamacpp-service` | ADMIN + `ADMIN_MODELS_MANAGE` | Reachability + binary install state + active model + slot state.    |

### 4.1 `RuntimeProbeReport` shape (abbreviated)

```ts
{
  provider: RuntimeProvider,
  runtimeUrl: string,
  status: RuntimeProbeStatus,
  probedAtMs: number,
  latencyMs?: number,
  version?: string,
  models?: RuntimeProbeModel[],          // installed/known models
  activeModelId?: string,                // model currently loaded (llamacpp)
  executionProfile?: RuntimeExecutionProfile,  // CUDA / CPU / METAL
  queueDepth?: number,
  slots?: RuntimeProbeSlot[],            // llama.cpp: parallel slots
  recentEvents?: RuntimeProbeRecentEvent[],
  capabilities?: RuntimeProbeCapabilities, // see below
  errorType?: StreamingErrorType,
  errorMessage?: string,
}
```

### 4.2 `RuntimeProbeCapabilities` — the boolean matrix

```ts
{
  streamingText: boolean,
  thinking: boolean,
  promptProgress: boolean,
  nodeProgress: boolean,
  stepProgress: boolean,
  cancel: boolean,
  metrics: boolean,
}
```

This matrix is what powers the runtime comparison table in the experiment
report (§7). It's how the FE decides which sub-panels to enable per provider
(no point rendering a sampling-step bar for Ollama).

### 4.3 Why admin-only

The probe endpoints expose binary install state, model weights metadata, queue
depth, and GPU detection — all useful for ops/debugging, all sensitive enough
that non-admins should not see them. Both controllers are decorated with the
`@Roles(UserRole.ADMIN)` guard; the llamacpp controller additionally requires
the `ADMIN_MODELS_MANAGE` permission via `@RequirePermissions`.

---

## 5. The llama.cpp think-tag leak fix (Deliverable B)

### 5.1 The bug

`llama-server` emits `<think>…</think>` blocks inline in
`choices[].delta.content` for reasoning models (DeepSeek R1, GLM-Thinking,
QwQ, Qwen-Thinking). Without intervention these blocks would leak verbatim
into the user-visible answer text — the user would see the raw chain-of-thought
mixed into the prose.

This was a documented regression risk in the local-runtime audit synthesis: the
old behavior (pre-PR1) was raw pass-through. Multiple existing users would
have seen the leak immediately on a reasoning-model load.

### 5.2 The fix

`apps/claw-llamacpp-service/src/modules/inference/managers/inference-proxy.manager.ts`
now wraps every `choices[].delta.content` chunk through
`ThinkTagScanner` from `@claw/shared-utilities`. The scanner is a streaming-
safe state machine:

- Buffers across chunk boundaries (so a `<think` split across two SSE frames
  is still detected).
- Emits the inside-of-`<think>` text as `choices[].delta.reasoning_content`
  (a non-OpenAI extension already understood by ClawAI's chat-service parser).
- Emits the outside text as ordinary `choices[].delta.content`.
- On stream end, `flushStreamTail` drains the scanner state and surfaces any
  trailing reasoning fragment.

The scanner is implemented in `packages/shared-utilities/src/think-tag-scanner`
so the same code path can later be used by chat-service (PR2) for Ollama paths
that hit `<think>` tags without the native `thinking` field.

### 5.3 The kill switch

A new env var **`LLAMACPP_REASONING_EXTRACTION_ENABLED`** (default `'true'`)
gates the scanner. Set to `'false'` to restore raw pass-through behavior for
debugging only. Defined in
`apps/claw-llamacpp-service/src/app/config/app.config.ts` as a Zod schema
field, transformed to boolean.

### 5.4 Why this fix lands in PR1

The fix has no dependency on the rest of the local-runtime work, but it's
co-shipped because:

1. The audit identified it as the highest-severity user-visible regression
   risk for any reasoning-model adoption (which is the precise driver for the
   local-runtime initiative).
2. The same `ThinkTagScanner` utility is what PR2 will use to surface visible
   reasoning into `ClawRuntimeProgressEvent.reasoningDelta` events for the
   Ollama and llama.cpp text adapters.

---

## 6. Frontend decomposition

The cloud rich-progress UI is a single 600-line `thinking-indicator.tsx`
component. PR1 decomposes the local-runtime equivalent into focused panels in
`apps/claw-frontend/src/components/chat/runtime-progress/`:

| Component                | Responsibility                                                       |
| ------------------------ | -------------------------------------------------------------------- |
| `RuntimeProgressPanel`   | Top-level orchestrator. Subscribes to one `runId`'s envelope stream. |
| `VisibleReasoningPanel`  | Collapsible reasoning card. Renders `reasoningDelta` accumulation.   |
| `RuntimeMetricsHud`      | TTFT, tokens/s, token counts, progress %, confidence label.          |
| `RuntimeRawEventsDrawer` | Dev-only side drawer that lists raw envelope events for debugging.   |
| `RuntimeStageTimeline`   | Stage progression sparkline. Stub in PR1 — fleshed out in PR3.       |

The existing `thinking-indicator.tsx` keeps its public import path; it now
delegates to `RuntimeProgressPanel` for local-runtime threads while preserving
its existing UI for cloud threads. Both code paths coexist behind one entry
component until PR3 finishes the migration.

The decomposition follows the FE extraction rules in the root `CLAUDE.md`:
zero inline types, zero hooks in `.tsx` (the panels are pure render
composition), all hooks in `src/hooks/runtime-progress/`, all types in
`src/types/runtime-progress.types.ts`.

---

## 7. Probe scripts (`scripts/local-runtime-probes/`)

Four pure-Node `.mjs` scripts that drive a single end-to-end call against each
local runtime and capture both the raw provider stream and a normalized
`ClawRuntimeProgressEvent` stream as JSONL:

| Runtime   | Script               | Output                            |
| --------- | -------------------- | --------------------------------- |
| Ollama    | `probe-ollama.mjs`   | `.local-runtime-probes/ollama/`   |
| llama.cpp | `probe-llamacpp.mjs` | `.local-runtime-probes/llamacpp/` |
| SD WebUI  | `probe-sd-webui.mjs` | `.local-runtime-probes/sd-webui/` |
| ComfyUI   | `probe-comfyui.mjs`  | `.local-runtime-probes/comfyui/`  |

Per-run output:

- `<iso-timestamp>.raw.jsonl` — one JSON object per provider chunk verbatim.
- `<iso-timestamp>.normalized.jsonl` — one `ClawRuntimeProgressEvent` per
  semantically interesting chunk, sequence numbers strictly monotonic per run.

The output directory `.local-runtime-probes/` is gitignored — these are
operator diagnostic dumps. The normalizer logic lives in
`scripts/local-runtime-probes/lib/normalize.mjs` and is the same logic the
chat-service adapters will use (PR2).

Requires Node 22+ (global `WebSocket` for ComfyUI). No `npm install` needed.

---

## 8. Roadmap

### PR2 — Chat-service adapter wiring (extend `ProviderStreamExecutor`)

Wire the four local-runtime adapters into `ProviderStreamExecutor` so a chat
thread targeting Ollama / llama.cpp produces a live token stream end-to-end.
Adds `LLAMACPP_NATIVE_COMPLETION`, `COMFYUI_WS`, `SDWEBUI_POLL` variants to
`AiStreamProtocol`. Lights up `ClawRuntimeProgressEvent` emission from
chat-service over the existing SSE channel. Frontend `useChatStream` consumes
both envelope shapes.

### PR3 — Frontend HUD + stage timeline polish

Finish `RuntimeStageTimeline`, integrate it with `RuntimeMetricsHud`, ship the
progress-confidence badges, add a per-runtime capability indicator in the
model selector dropdown (e.g. dim a model whose runtime doesn't support
streaming).

### PR4 — RabbitMQ event publishing for runtime-progress

Promote the 12 `runtime.progress.*` event patterns (declared in
`packages/shared-constants` today, see §9) from "declared, not yet published"
to fully wired. audit-service consumes them, observability dashboards light
up, server-logs index them.

### PR5 — Image-runtime stage parity

Wire ComfyUI and SD WebUI image-modality progress through the same envelope.
Lights up `currentStep` / `totalSteps` / `samplingMs` / image preview frames
in the image-generation UI.

---

## 9. RabbitMQ event patterns (declared, not yet published)

PR1 declares 12 new event patterns under the `claw.events` topic exchange.
They live in `packages/shared-constants/src/runtime-progress-events.constants.ts`
as a frozen pattern map. **No service publishes them yet** — PR4 wires the
publishers in chat-service and the consumers in audit-service.

| Pattern                                 | Publisher (PR4) | Consumer (PR4) | Purpose                             |
| --------------------------------------- | --------------- | -------------- | ----------------------------------- |
| `runtime.progress.stage_changed`        | chat            | audit          | Lifecycle stage transition.         |
| `runtime.progress.content_delta`        | chat            | audit          | Visible content text delta.         |
| `runtime.progress.reasoning_delta`      | chat            | audit          | Visible reasoning text delta.       |
| `runtime.progress.metrics_tick`         | chat            | audit          | Periodic metric snapshot.           |
| `runtime.progress.usage_final`          | chat            | audit          | Final token-count + cost summary.   |
| `runtime.progress.image_preview`        | chat            | audit          | Optional in-progress preview frame. |
| `runtime.progress.node_progress`        | chat            | audit          | ComfyUI workflow-node progress.     |
| `runtime.progress.step_progress`        | chat            | audit          | Image sampler step progress.        |
| `runtime.progress.prompt_eval_progress` | chat            | audit          | llama.cpp prompt-eval progress.     |
| `runtime.progress.artifact_saved`       | chat            | audit          | Image saved to file-service.        |
| `runtime.progress.error`                | chat            | audit          | Streaming-side classified error.    |
| `runtime.progress.cancelled`            | chat            | audit          | User cancelled mid-stream.          |

Until PR4, the envelope is delivered over the existing SSE channel only.

---

## 10. Open questions and known risks

Carried over from the audit synthesis. Tracked, not resolved in PR1:

1. **`imagePreviewBase64` size policy.** Capped at 64 KB by adapter convention,
   but the cap is not enforced anywhere yet. PR5 must add a hard upper bound
   in the adapter normalizer and document the policy in this file.
2. **`runId` lifecycle across retries.** When chat-service retries a fallback
   provider, does the second attempt get a new `runId` or share the original?
   PR2 must pick one. Current lean: new `runId` per provider attempt,
   `messageId` ties them together.
3. **Probe rate limiting.** The probe endpoints are admin-only but they DO hit
   the runtime over HTTP. Operator dashboards that poll on a 5s interval
   could thrash llama-server. PR3 should add a 30s cache layer per probe.
4. **`ChatStreamService` instance scope.** Today it's in-memory, single-pod.
   When chat-service is scaled horizontally, a thread's SSE stream is pinned
   to one pod. Either accept (sticky session via nginx) or promote the
   subject to Redis-backed (PR6+).
5. **Backpressure on slow consumers.** A slow FE consumer could fill up the
   per-thread replay buffer. PR2 should reuse the existing 100-event cap and
   document the drop policy.
6. **Visible-reasoning persistence.** `reasoningDelta` events stream through
   but are never persisted as part of the `ChatMessage` row today. PR5+
   should decide whether to store the accumulated reasoning text as
   `metadata.visibleReasoning` or leave it ephemeral.

---

## See also

- `STREAMING_AUDIT.md` — Phase 0 audit of the cloud rich-progress system.
- `docs/03-architecture/event-bus.md` — full event-bus topology.
- `docs/03-architecture/message-flow-complete.md` — end-to-end message flow.
- `docs/03-architecture/local-frontier-models.md` — llama.cpp service deep dive.
- `docs/LOCAL_RUNTIME_PROGRESS.md` — user-facing PR1 summary.
- `docs/LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md` — probe capability matrix.
- `docs/LOCAL_RUNTIME_PROGRESS_ADR.md` — the architecture decision record.
