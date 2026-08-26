# STREAMING_AUDIT.md — Rich Cloud Model Progress (Phase 0)

> **HISTORICAL SNAPSHOT — do not treat as current.** This is a dated Phase 0
> audit, accurate at the time it was produced. Facts have since moved: the
> repo now ships **13 locales**, not 9. Numbers here are preserved as a record
> of what was true then; for current facts use `CLAUDE.md` and `.ai/manifests/`.

> Grounded audit of the **real** ClawAI codebase (not the prompt's GitHub-web guesses).
> Produced before any code change, per the master prompt Phase 0 / deliverable #1.

## TL;DR — the single most important finding

The streaming **transport already exists and works**. ClawAI does **not** need the prompt's proposed
new `POST /chat/messages/stream` fetch-ReadableStream endpoint — that would duplicate a working channel.
What's missing is only **(1)** real token streaming from providers (today every provider call is
`stream:false` + buffered `.json()`), and **(2)** frontend consumption of content/reasoning/metric deltas
(today the FE only renders lifecycle stage labels and gets the answer text by **polling**).

**Correction to the prompt:** the prompt designs 7 native provider adapters (Anthropic Messages events,
Gemini parts, Bedrock ConverseStream, etc.). The real repo routes **all cloud providers through one
OpenAI-compatible `/chat/completions`** path. So the actual normalization surface is **two wire formats**,
not seven:

1. **OpenAI-compatible SSE** (`data: {choices:[{delta:{content}}]}` … `data: [DONE]`) — OpenAI, Grok,
   DeepSeek, Anthropic, Gemini, Bedrock (all via OpenAI-compat connector base URLs), **and** llama.cpp.
2. **Ollama native NDJSON** (`/api/generate` → `{response, done, thinking?}`; OLLAMA connector `/api/chat`
   → `{message:{content}, done}`).
3. **Simulated** fallback for any provider/model that can't stream.

Provider-exposed reasoning is handled inside the OpenAI-SSE parser (`delta.reasoning_content` / `delta.reasoning`
when present) + the Ollama `thinking` field; model-emitted `<think>…</think>` is handled by a streaming-safe scanner.

---

## 1. Backend — chat-service (`apps/claw-chat-service/src/modules/chat-messages/`)

### Current message flow (async, event-driven)

1. `POST /api/v1/chat-messages` → `ChatMessagesController.create` → `ChatMessagesService.createMessage`
   (`services/chat-messages.service.ts:107`). Persists the **USER** message, publishes `message.created`,
   **returns immediately** (assistant reply is produced asynchronously).
2. routing-service consumes `message.created` → publishes `message.routed`.
3. chat-service consumes `message.routed` → `handleMessageRouted` (`service.ts:499`) → `ContextAssemblyManager.assemble`
   → `runLlmAndStore` (`:589`) → `ChatExecutionManager.execute` (`managers/chat-execution.manager.ts:85`)
   → `storeAssistantResponse` (`:758`) → `ChatStreamService.emitCompletion` + publish `message.completed`.

### Existing SSE channel (the seam to extend)

- Endpoint: `@Sse('stream/:threadId')` — `controllers/chat-stream.controller.ts:15`, `@SkipLogging()` + `@SkipThrottle()`.
  Auth = global `AuthGuard` (Bearer header) ⇒ FE uses `fetch()`+ReadableStream, not `EventSource`.
  **Security gap:** the `_user` param is unused — there is **no per-thread ownership check** on subscribe. Must add.
- Backing service: `services/chat-stream.service.ts` — RxJS `Subject` `eventBus` + per-thread `recentEvents`
  replay buffer (last 100) + monotonic `sequence`. **In-memory, single-instance.**
- Event shape: `types/stream.types.ts` `StreamEvent` (has unused `content?`). Enum `common/enums/stream-event-type.enum.ts`
  `StreamEventType` (has unused `CHUNK`, `RESPONSE_STREAMING`, `MODEL_PROGRESS`).
- **Today it streams labels, not tokens.** `emitResponseStreaming` + `startResponseProgressHeartbeat` emit fake
  "Still working" beats every 1.5 s. Content is delivered exactly once when the ASSISTANT row is written.
- `sanitizeEvent`/`sanitizeText` cap **every** field at 240 chars and strip an "unsafe pattern" regex — correct for
  labels, **must be bypassed for real content/reasoning deltas** (a legit answer can exceed 240 chars / mention
  "system prompt"). New delta emitters need light sanitization (strip nothing; FE renders as text, never HTML).

### Provider invocation boundary (where to add `stream:true`)

- `ChatExecutionManager.callProvider` (`:791`) dispatches by provider string. All paths use `httpRequest`
  (`common/utilities/http-client.utility.ts`) = native `fetch` + `await response.json()` (**buffered, no stream**):
  - `callCloudProvider` (`:1091`) — OpenAI-compat `${baseUrl}/chat/completions`, body `buildChatRequestBody` (`:1190`,
    `stream:false`), parsed by `parseCloudResponse` (`:1265`, `choices[0].message.content`, `usage.{prompt,completion}_tokens`).
  - OLLAMA connector → native `${baseUrl}/chat` (`buildOllamaChatRequestBody`, `parseOllamaChatResponse`).
  - `callOllama` (`:944`) → ollama-service `/api/v1/ollama/generate` (`stream:false`, returns `{response, thinking, evalCount…}`).
  - `callLlamacpp` (`:1052`) → llamacpp-service `/api/v1/v1/chat/completions` (OpenAI-compat; the llamacpp proxy
    **already supports `stream:true` SSE** via undici pipe — `apps/claw-llamacpp-service/.../inference-proxy.manager.ts`).
- Usage captured for all except **Bedrock (adapter is an unimplemented stub)**.
- `ConnectorModel.supportsStreaming` flag exists (connector schema) — available to gate streaming per model.
- connector-service adapters do **health/sync only**; no SDKs installed; raw HTTP everywhere.

### Parallel/compare

- `POST /chat-messages/parallel` → `ParallelExecutionManager.executeParallel` (`managers/parallel-execution.manager.ts:37`):
  stores USER msg, fires `void executeInBackground`, `Promise.allSettled` across 2–5 models, judge optional,
  bulk-inserts separate ASSISTANT rows tagged `metadata.parallelGroupId` / `parallelExecution:true`. One coarse
  "Launching comparison" stage + one `emitCompletion`. **No per-model streaming.** `StreamEvent` has **no `laneId`** —
  that's the linchpin missing field for independent per-model streams.
- Judge = `JudgeRefereeManager` (rides on the same parallel body). Consensus = `ConsensusExecutionManager` (`/consensus`).

### Persistence

- `ChatMessage` (`prisma/schema.prisma`): `role`, `content`, `provider/model`, token counts, `latencyMs`, untyped `metadata Json?`.
  **No status column.** In-progress = implicit (no ASSISTANT row). Error = ASSISTANT row + `metadata.error:true`
  (`storeErrorResponse`). Rich progress already stored in `metadata.routeRoadmap` / `metadata.progressSummary`.
  Streaming needs **no schema change** (final content still written once); an optional `ChatStreamRun` table is deferred.

### RabbitMQ

Consumes `message.routed`; publishes `message.created`, `message.completed`, `message.feedback_set`.

---

## 2. Frontend (`apps/claw-frontend/src/`)

- Thread page `app/(portal)/chat/[threadId]/page.tsx` → `useThreadDetailPage` → `useThreadDetail`
  (`useVirtualizedMessages` infinite query + `useChatStream` SSE) + `useSendMessage` (`POST /chat-messages`).
- **Answer arrives by POLLING** (`use-thread-detail.ts:65` — 2 s interval, cap 90 polls / 3 min, stops when an
  ASSISTANT row appears). SSE is the **progress channel only**.
- `useChatStream` (`hooks/chat/use-chat-stream.ts`) connects to `…/chat-messages/stream/:threadId` via
  `utilities/sse.utility.ts` `connectSse` (fetch+ReadableStream+Bearer — already supports token streaming).
  It populates `progressStages`, `fallbackAttempts`, `streamError`, `executingModel`, `judgeModel`. **It ignores
  `CHUNK`/`content`** — no live token rendering. This is the exact seam to extend.
- `components/chat/thinking-indicator.tsx` — already a rich progress card (stage timeline, fallback rows, error banner,
  bouncing dots) shown as the Virtuoso footer while waiting. **No %, no token count, no streaming text, no reasoning panel.**
- `components/chat/message-bubble.tsx` — completed message (markdown, provider/model badges, token count, latency).
  In-progress messages are NOT bubbles today.
- No chat Zustand store (SSE state held in `useChatStream` useState). Conventions: enums `src/enums/`, types `src/types/`,
  constants `src/constants/`, utilities `src/utilities/`, repo `src/repositories/chat/chat.repository.ts`, hooks
  `src/hooks/chat/`, query keys `src/repositories/shared/query-keys.ts`. i18n = 9 locales `src/lib/i18n/locales/*.ts`
  - schema `src/types/i18n.types.ts`, keys nested under `chat.*`.
- Compare page `app/(portal)/chat/compare/page.tsx` → `useParallelComparePage` → `useParallelCompare`
  (`POST /chat-messages/parallel`) → `useParallelPoll` (polls). Components (`parallel-results-grid.tsx`,
  `parallel-response-card.tsx`, `parallel-message-group.tsx`, `in-thread-compare-panel.tsx`,
  `compare-judge-controls.tsx`, `judge-referee-details.tsx`) render **terminal results only**. (Note: the prompt's
  `compare-mode-button.tsx` / `judge-mode-selector.tsx` do not exist under those names.)

---

## 3. Chosen approach (extend, don't duplicate)

1. **Contract**: extend `StreamEvent` + `StreamEventType` with rich fields (content delta, reasoning delta + visibility,
   metrics {elapsedMs, ttftMs, tokensPerSecond, generatedTokens, progressPercent, progressConfidence, estimatedCostUsd},
   usage {prompt/completion/reasoning/total tokens, finalCostUsd}, `laneId` + `parallelGroupId`, `protocol`). Mirror to
   FE `types/chat.types.ts` + enums. Add Zod validation where the repo validates events.
2. **Backend streaming**: add `httpStream()` to `http-client.utility.ts` (fetch → iterate `response.body`, AbortSignal).
   Add managers/utilities: `provider-stream-normalizer.manager.ts` (OpenAI-SSE + Ollama-NDJSON), `thinking-fragment-scanner.utility.ts`,
   `stream-progress.manager.ts`, `token-estimator.utility.ts`, cost estimator + pricing map. Thread a chunk callback
   through `execute`/`callProvider` so deltas emit live via new `ChatStreamService` methods (`emitContentDelta`,
   `emitReasoningDelta`, `emitMetrics`, `emitUsage`) that bypass the 240-char label sanitizer.
3. **Cancellation + security**: per-run `AbortController` registry; `POST /chat-messages/stream/:threadId/cancel`
   with ownership check; add the missing ownership check to the SSE subscribe route.
4. **Frontend**: extend `useChatStream` to accumulate content/reasoning/metrics; render a live in-progress bubble +
   upgrade `thinking-indicator.tsx` with progress %, TTFT, tokens/s, token count + a collapsible reasoning panel
   (`stream-thinking-panel`) and metrics HUD. Keep polling as reconnect/finalization fallback.
5. **Compare (slice 2)**: add `laneId`; `ParallelExecutionManager` streams per model; new lane-aware FE hook demuxes by lane.
6. **Wiring**: i18n (9 locales) + `i18n.types.ts`, nginx already has SSE `proxy_buffering off` for the stream route
   (verify), docs `docs/RICH_MODEL_STREAMING.md`, CLAUDE.md, tests.

## 4. Realistic provider availability for testing

Per project memory only the **Gemini** connector is configured (and llama.cpp/Ollama run locally). To test all
formats deterministically without burning provider cost, add a **mock/simulated provider stream** (prompt §4.2/§5.7)
behind a test flag, plus live tests against Gemini (OpenAI-compat) + local Ollama + llama.cpp.

## 5. Test-environment note (worktree)

The dev stack bind-mounts the **main** checkout, not this worktree. For live UI/API testing I will rebuild **only**
the touched containers (`chat-service`, `frontend`) from the worktree compose files (identical container names ⇒
surgical recreate bound to worktree source); DBs and other services keep running untouched.
