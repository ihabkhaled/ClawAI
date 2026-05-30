# ADR: Local-runtime rich-progress — extend the cloud rich-progress system

Status: **Accepted** (PR1)
Date: 2026-05-30
Authors: ClawAI core
Supersedes: —
Superseded by: —

---

## Context

ClawAI's cloud chat path already streams rich progress to the user: lifecycle
stages, partial answer text, partial reasoning, TTFT, tokens-per-second,
provider/model badge, fallback chain. The system is documented in
`STREAMING_AUDIT.md` and implemented in:

- `apps/claw-chat-service/src/modules/chat-messages/services/chat-stream.service.ts`
- `apps/claw-chat-service/src/modules/chat-messages/managers/provider-stream-executor.manager.ts`
- `apps/claw-chat-service/src/modules/chat-messages/controllers/chat-stream.controller.ts` (`@Sse('stream/:threadId')`)
- `apps/claw-chat-service/src/common/enums/ai-stream-stage.enum.ts` + `ai-stream-protocol.enum.ts`

Pick a local runtime — Ollama, llama.cpp, ComfyUI, SD WebUI — and that
experience evaporates. chat-service calls the local runtime over a plain
buffered HTTP request and re-emits a single `COMPLETE` event when the response
returns. ComfyUI's WebSocket progress, llama.cpp's `prompt_eval` timings,
Ollama's `eval_count` / `eval_duration`, SD WebUI's sampling step progress —
all discarded.

We need to close the gap. The design question is: do we **extend** the
existing cloud rich-progress stack, or do we **build a parallel** local-runtime
streaming stack?

---

## Decision

**Extend, do not parallelize.** Local-runtime rich-progress is implemented as
a strict superset of the cloud rich-progress contract. PR1 ships the foundation
(envelope + enums + probes + the most visible regression fix). PR2+ wires the
foundation into the existing `ChatStreamService` and `ProviderStreamExecutor`
seams, reusing the existing SSE channel and replay-buffer machinery.

Concretely:

1. **One envelope.** `ClawRuntimeProgressEvent` in
   `packages/shared-types/src/runtime-progress/` is a strict superset of
   `StreamEvent`. Both envelopes coexist on the existing SSE channel until a
   future migration retires `StreamEvent`.
2. **One transport.** The chat-service `@Sse('stream/:threadId')` controller is
   the one channel. Local-runtime adapters publish into the SAME
   `ChatStreamService` Subject as the cloud adapters. No new SSE endpoint.
3. **One stage enum, expanded.** `RuntimeProgressStage` is a superset of
   `AiStreamStage`. It adds image-modality stages (`EXECUTING_NODE`,
   `NODE_COMPLETED`, `SAMPLING`, `SAVING`) and a few text-runtime stages
   (`MODEL_LOADING`, `MODEL_WARMING_UP`, `PROMPT_EVAL`).
4. **One protocol enum, extended.** `AiStreamProtocol` gains
   `LLAMACPP_NATIVE_COMPLETION`, `COMFYUI_WS`, `SDWEBUI_POLL` variants in PR2.
5. **One executor seam.** PR2 registers per-`RuntimeProvider` adapters on
   `ProviderStreamExecutor`. The dispatch logic stays exactly where it is.
6. **Two admin probe endpoints.** New, but they live as small
   `runtime-progress.controller.ts` files inside the two services that own
   the runtimes. No new service. No new RabbitMQ patterns published in PR1.
7. **The think-tag leak fix lands in PR1.** Same `ThinkTagScanner` utility
   PR2 will use for the text adapters. Gated behind
   `LLAMACPP_REASONING_EXTRACTION_ENABLED` so the regression is reversible.

---

## Consequences

### Positive

- **Zero new transport infrastructure.** The hardest pieces of the cloud
  rich-progress stack — auth on SSE, nginx `proxy_buffering off`,
  per-thread RxJS Subject, replay buffer, monotonic sequence — are already
  built and proven. We get all of that for free.
- **No FE re-architecture.** The chat-thread page subscribes to the same
  channel it always did. Cloud and local threads render the same way.
- **Loss-free coexistence.** `StreamEvent` to `ClawRuntimeProgressEvent` is a
  trivial one-way mapping. We can migrate callers incrementally without a
  flag day.
- **One mental model for AI agents.** The "how do I add a new streaming
  source?" answer is "register an adapter on `ProviderStreamExecutor` and
  emit `ClawRuntimeProgressEvent`." Same answer for cloud and local.
- **The probe contract is cheap.** Two thin admin endpoints in services that
  already own their runtime. No new database, no new module, no new event.

### Negative

- **The envelope is wider than `StreamEvent`.** Fields like `nodeId`,
  `imagePreviewBase64`, `currentStep` / `totalSteps`, `executionProfile` only
  make sense for some providers. Adapters and the FE must tolerate optional
  fields. The trade-off is acceptable: one wide envelope vs N narrow
  per-runtime envelopes is a clear win for client code.
- **Two coexisting envelopes during transition.** Until `StreamEvent` is
  retired, FE consumers must handle both. The cost is a `switch` in the
  receiving hook; cheap.
- **`ChatStreamService` remains in-memory.** Horizontal scaling of
  chat-service pins a thread's SSE stream to one pod (sticky session). This
  is a pre-existing constraint, not a new one. PR6+ may promote the subject
  to a Redis-backed PubSub if scale demands.

### Neutral

- **Schema versioning is explicit.** The envelope carries `version:
'runtime-progress-v1'`. A breaking change ships a new literal and old
  consumers reject. Cheap, future-proof, no schema registry needed.
- **RabbitMQ patterns declared, not published.** The 12 `runtime.progress.*`
  patterns are frozen in `packages/shared-constants` but no publisher exists
  yet. PR4 wires them. Until then they're documentation.

---

## Alternatives considered

### A. Build a parallel local-runtime streaming service

A new microservice (`claw-runtime-stream-service`) that owns the
local-runtime adapters and exposes its own SSE channel. Chat-service would
proxy to it for local threads.

**Rejected because:** the new service would re-implement the per-thread
Subject, replay buffer, auth, sequence numbering, nginx config, FE
subscription logic — duplicating ~800 lines of existing chat-service code
without adding any capability the existing channel can't carry.

### B. Lift `ChatStreamService` into a shared package

Move the per-thread Subject machinery into `packages/shared-runtime-progress/`
so chat-service and a new dedicated service can both use it.

**Rejected because:** there's no second consumer today. YAGNI. If a future
service genuinely needs the machinery, the lift is mechanical at that point.

### C. Per-runtime native SSE endpoints

Each of `claw-ollama-service`, `claw-llamacpp-service`, etc. exposes its own
SSE endpoint and the frontend subscribes to N channels per chat.

**Rejected because:** it pushes thread ownership and ordering concerns into
every runtime service, multiplies auth surfaces, and forces the FE to merge
N streams client-side. The existing chat-service channel is already the
"one consolidated stream per thread" boundary — pushing the abstraction
elsewhere is a regression.

### D. Polling-only, no streaming

Continue with the current model and just expose more progress fields through
periodic polling.

**Rejected because:** polling cannot deliver per-token deltas without
ballooning request volume. The whole point of the initiative is closing the
perception gap; polling is what created the gap.

---

## Compliance and rollout

- PR1 lands behind no feature flag (envelope, enums, probes are inert until
  PR2 wires them). The one runtime-affecting change — the think-tag leak fix
  — is reversible via `LLAMACPP_REASONING_EXTRACTION_ENABLED=false`.
- PR2 will land behind a per-thread opt-in flag for local runtimes until the
  capability matrix in
  [`docs/LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md`](./LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md)
  has been filled in from real probe runs.
- PR4 (RabbitMQ publishing) lands behind a service-level env var and is
  reversible by setting the env var to `false`.

---

## See also

- `docs/03-architecture/runtime-progress.md` — full architecture.
- `docs/LOCAL_RUNTIME_PROGRESS.md` — user-facing summary.
- `docs/LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md` — capability matrix template.
- `STREAMING_AUDIT.md` — the cloud rich-progress audit that this work extends.
- `docs/03-architecture/event-bus.md` — event-bus topology.
- `docs/13-adr/` — index of other ClawAI ADRs.
