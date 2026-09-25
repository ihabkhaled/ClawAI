# Service Guide: claw-chat-service

## Overview

| Property     | Value                                               |
| ------------ | --------------------------------------------------- |
| Port         | 4002                                                |
| Database     | PostgreSQL (`claw_chat`)                            |
| ORM          | Prisma 5.20                                         |
| Env prefix   | `CHAT_`                                             |
| Nginx routes | `/api/v1/chat-threads/*`, `/api/v1/chat-messages/*` |

The chat service is the central orchestrator for user conversations. It manages threads, stores messages, assembles context from multiple services, executes LLM calls with fallback chains, and streams responses via SSE.

**Boot contract:** the package is `"type": "module"`, so `dist/main.js` runs as ESM.
`main.ts` must not reference `__dirname` / `__filename` / `require` (banned by
ESLint `no-restricted-globals`, pinned by `src/__tests__/main-esm-bootstrap.spec.ts`),
and must not register `tsconfig-paths` at runtime — `tsc-alias -f` rewrites the
`@app/*` aliases at build time. The 2026-09-02 rollout crash-looped on exactly
this; see [build-system.md § Gotchas](../08-runtime-devops/build-system.md#7-gotchas--troubleshooting).

## Database Schema

### ChatThread

| Column            | Type        | Notes                                |
| ----------------- | ----------- | ------------------------------------ |
| id                | String      | CUID primary key                     |
| userId            | String      | Owner                                |
| title             | String?     | Auto-generated or user-set           |
| routingMode       | RoutingMode | AUTO, MANUAL_MODEL, LOCAL_ONLY, etc. |
| lastProvider      | String?     | Last used provider                   |
| lastModel         | String?     | Last used model                      |
| isPinned          | Boolean     | User-pinned thread                   |
| isArchived        | Boolean     | Soft archive                         |
| preferredProvider | String?     | Thread-level override                |
| preferredModel    | String?     | Thread-level override                |
| contextPackIds    | String[]    | Attached context pack IDs            |
| systemPrompt      | String?     | Custom system prompt                 |
| temperature       | Float?      | Default 0.7                          |
| maxTokens         | Int?        | Token limit override                 |

### ChatMessage

| Column        | Type         | Notes                              |
| ------------- | ------------ | ---------------------------------- |
| id            | String       | CUID primary key                   |
| threadId      | String       | FK to ChatThread                   |
| role          | MessageRole  | SYSTEM, USER, ASSISTANT, TOOL      |
| content       | String       | Message text                       |
| provider      | String?      | Which provider answered            |
| model         | String?      | Which model answered               |
| routingMode   | RoutingMode? | Mode used for this message         |
| routerModel   | String?      | Which model made routing decision  |
| usedFallback  | Boolean      | Whether fallback was triggered     |
| inputTokens   | Int?         | Prompt token count                 |
| outputTokens  | Int?         | Completion token count             |
| estimatedCost | Decimal?     | Cost estimate (12,8 precision)     |
| latencyMs     | Int?         | End-to-end latency                 |
| feedback      | String?      | User feedback (thumbs up/down)     |
| metadata      | Json?        | Error flags, routing details, etc. |

### MessageAttachment

Links messages to files via fileId. Types include `document`, `image`, etc.

## API Endpoints

### Threads (`/api/v1/chat-threads`)

| Method | Path | Description                     |
| ------ | ---- | ------------------------------- |
| GET    | /    | List user's threads (paginated) |
| POST   | /    | Create new thread               |
| GET    | /:id | Get thread with recent messages |
| PATCH  | /:id | Update title, settings, etc.    |
| DELETE | /:id | Delete thread and all messages  |

### Messages (`/api/v1/chat-messages`)

| Method | Path              | Description                                   |
| ------ | ----------------- | --------------------------------------------- |
| GET    | /thread/:threadId | List messages (paginated)                     |
| POST   | /                 | Send new message (triggers flow)              |
| PATCH  | /:id/feedback     | Submit feedback on a message                  |
| POST   | /:id/regenerate   | Regenerate an assistant response              |
| POST   | /parallel         | Send prompt to 2-5 models simultaneously      |
| POST   | /consensus        | Build a consensus answer from multiple models |
| POST   | /escalation-chain | Escalate to stronger models if needed         |
| POST   | /repair           | Repair or critique an answer                  |
| POST   | /decompose        | Decompose a task into structured subtasks     |
| POST   | /best-of-n        | Generate multiple candidates and choose one   |
| POST   | /cost-ensemble    | Balance answer quality against spend          |
| POST   | /verify           | Run verification checks on an answer          |
| POST   | /role-pack        | Execute multi-role prompt pack workflows      |
| POST   | /pipeline         | Execute staged prompt pipelines               |

## Message Flow (End-to-End)

1. **User sends message** -- POST creates a USER message record
2. **Publish `message.created`** -- routing service picks it up
3. **Routing decision arrives** -- via `message.routed` event with provider, model, fallback
4. **Context assembly** -- `ContextAssemblyManager` gathers:
   - User memories from memory-service (HTTP, limit 20)
   - Context pack items from memory-service (HTTP)
   - Workspace search results from workspace-service (HTTP)
   - Attachment text from file-service (HTTP), via
     `GET /internal/files/:id/content` — **never** `/chunks`, which performs no
     ownership check. `extractedText` is used for every non-image file;
     `content` (base64) only for an image going to a vision model. See
     [ADR-095](../13-adr/adr-095-attachment-text-extraction-pipeline.md).
   - Thread message history
     4b. **Attachment readiness wait** -- `waitForIngestion` polls
     `GET /internal/files/:id/ingestion-state` until every attachment has
     finished extracting, bounded by `FILE_INGESTION_WAIT_TIMEOUT_MS` (12s).
     Extraction is asynchronous, so a message sent the instant an upload returns
     would otherwise race it. Expiry degrades rather than throwing: the turn
     proceeds and the model is told the file is still being read. **This is a
     blocking step inside the turn and it affects latency.** A voice note gets
     the same wait: file-service reports it as `PROCESSING` for as long as
     `extractedText` still holds the `[Audio file: …]` placeholder, even though
     the row itself is `COMPLETED` from the moment the upload lands — see
     [`skills/add-a-voice-note-or-transcription-path.md`](../../skills/add-a-voice-note-or-transcription-path.md#solved-a-voice-note-reaching-the-model-as-nothing-2026-09-23).
   - `decodeFileContent` frames a voice note's transcript as spoken words the
     user said (`VOICE_NOTE_TRANSCRIPT_FRAME`), never as a generic attached
     document, and never leaks the transcription placeholder itself into the
     prompt as if it were real content.
5. **Prompt building** -- system prompt, memories, packs, files, history, with token budget truncation
   - **Attachment-only turns** (rule 42 §18–19). A send may carry files and
     no text (every send schema uses `requireContentOrAttachments`). The row is
     stored with empty `content`; `message.created` carries
     `ATTACHMENT_ONLY_ROUTING_HINT` instead (routing-service drops empty
     content); research is skipped. When the prompt is built, a final user turn
     that is empty or punctuation-only, with files attached, is replaced — per
     request, never in storage — by `buildAttachmentOnlyInstruction`: answer
     what a voice note said, describe an image/video, summarize a document and
     offer next steps, reply in the attachment's language. Log line to grep:
     `userTurnText: attachment-only turn — files=N mimeTypes=[…]`.
6. **LLM execution** -- `ChatExecutionManager` calls the selected provider via connector-service
7. **Quality check** -- `QualityCheckManager` scores the response (length, repetition, error patterns, echo)
8. **Auto re-routing** -- if quality score < 0.4, re-routes to next candidate (max 2 re-route attempts)
9. **Fallback chain** -- if primary fails or is weak, tries next candidate in chain
10. **Store ASSISTANT message** -- with token counts, latency, provider metadata, re-routing metadata if applicable
11. **SSE emission** -- `emitCompletion()` pushes to connected clients
12. **Publish `message.completed`** -- memory service extracts facts; audit logs usage

## SSE Streaming

The chat service uses SSE for real-time message delivery. Key implementation details:

- SSE controller uses `@SkipLogging()` to avoid pino-http header conflicts
- SSE controller uses `@SkipThrottle()` to avoid rate limiting on long-lived connections
- SSE routes are excluded from pino-http `autoLogging` in `app.module.ts`
- Frontend uses `fetch()` with `ReadableStream` (not EventSource) to set Authorization headers
- Nginx must have `proxy_buffering off` for SSE routes

## Error Handling

When all providers fail, the service stores an error message as an ASSISTANT record with `metadata: { error: true }`. This ensures the frontend's polling logic finds a terminal message and stops the "AI is thinking..." indicator.

## Request Body Bounds

Chat bootstrap installs an explicit 1 MiB JSON parser bound before Nest's
default parser. The application DTOs remain the narrower semantic limits
(`content` is at most 100,000 characters for the standard message contract);
the larger transport envelope accounts for UTF-8 and JSON escaping when coding
clients attach bounded workspace context. Requests above the transport bound
return HTTP 413 with the middleware error code instead of being masked as a 500.

## Limit refusals must carry the machine code, not a message key

`AccessControlService.assertQuotaRemaining` threw
`'quota.dailyLimitExceeded'` as its `BusinessException` code. The frontend error
map keys on the stable billing value `QUOTA_DAILY_EXCEEDED`, so nothing matched
and every user in every locale saw the service's English sentence.

The rule that generalises: **the `code` on a `BusinessException` is a contract
with the frontend, not a translation key.** Use the enum
(`BillingErrorCode`, `Permission`, and the module's own `*-error-code.enum.ts`),
never a dotted message path.

Limit refusals are also not toasts any more. The frontend renders them as a line
in the transcript, because a toast that fades leaves a composer that appears to
have silently done nothing. The codes it recognises are the six quota/plan codes
plus `PLAN_TRIAL_EXPIRED` — which is not a quota at all: the free plan is a
30-day trial, so day 31 is a wall, and "you used your allowance" is the wrong
sentence. Anything unrecognised stays a toast rather than being guessed at.

## Events

| Event             | Direction | Notes                          |
| ----------------- | --------- | ------------------------------ |
| message.created   | Publish   | After USER message stored      |
| message.routed    | Subscribe | Receives routing decision      |
| message.completed | Publish   | After ASSISTANT message stored |
| thread.created    | Publish   | After new thread created       |

## Inter-Service HTTP Calls

| Target Service    | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| memory-service    | Fetch user memories, pack items                                            |
| workspace-service | Fetch grounded workspace search results                                    |
| file-service      | Fetch attachment text + ingestion state                                    |
| connector-service | Execute LLM calls; per-model media capability (`models-snapshot`, ADR-120) |
| ollama-service    | Execute local Ollama calls                                                 |

## Key Managers

- **ContextAssemblyManager** -- assembles full prompt from multiple sources
- **AttachmentDeliveryManager** -- resolves each lane's attachments against that lane's own model capability (ADR-120)
- **VisionHelperManager** -- describes an image for a lane that cannot see, through the admin's VISION_HELPER models; metered on PaygSurface.VISION_HELPER (ADR-120 batch 5)
- **ChatExecutionManager** -- executes LLM calls with fallback chain, quality checking, and auto re-routing
- **QualityCheckManager** -- scores response quality (5 signals), recommends re-routing for weak answers
- **ParallelExecutionManager** -- executes the same prompt against 2-5 models simultaneously via `Promise.allSettled`
- **JudgeRefereeManager** -- runs the Critic → Judge quality pipeline on top of a single-answer response (chat, consensus, escalation — see [Judge + Critic Pipeline](#judge--critic-pipeline) below)
- **CompareJudgeManager** -- Compare's judge: ONE comparative call that ranks every completed lane together (ADR-116 — see [Compare's Comparative Judge](#compares-comparative-judge-adr-114) below)

## OpenAI-compatible connector presets (ADR-117, batch 2)

`KNOWN_JUDGE_PROVIDERS` and `PROVIDER_BASE_URLS`
(`common/constants/execution.constants.ts`) admit the 15 presets from
`CONNECTOR_PRESETS` (`@claw/shared-utilities`) — OpenRouter, Groq, Cerebras,
SambaNova, DeepInfra, Fireworks, Together, Mistral, Moonshot, Z.ai, Qwen,
Cloudflare Workers AI, Vercel AI Gateway, Perplexity, Cohere — alongside the
eight bespoke-adapter providers. Both constants are DERIVED from
`CONNECTOR_PRESETS` (`preset.key`, `preset.defaultBaseUrl`), never
hand-copied — that duplication is the exact bug ADR-117 exists to prevent.

No new dispatch code was needed: `callCloudProvider()` already builds
`${baseUrl}/chat/completions` with a `Bearer ${apiKey}` header for any
provider that isn't OPENAI/ANTHROPIC/GEMINI/OLLAMA/LLAMACPP's bespoke
branches, and every one of these 15 presets is OpenAI-compatible by
definition. `resolveProviderConfig()` resolves `baseUrl` from the connector
row first, falling back to `PROVIDER_BASE_URLS` only when the row has none.
Cloudflare's `PROVIDER_BASE_URLS` entry still carries the unresolved
`{ACCOUNT_ID}` placeholder — it is a fallback of last resort; the real,
resolved base URL always comes from the connector row via
`ConnectorsManager.getExecutionConfig`.

Test: `common/constants/__tests__/connector-preset-provider-wiring.spec.ts`
(every preset registered, sourced from the registry) and
`modules/chat-messages/__tests__/chat-execution.manager.spec.ts` →
"connector-preset provider dispatch (OpenRouter, representative)" (base URL,
Bearer auth, response parsing through the real dispatch path).

---

## Judge + Critic Pipeline

**This section describes single-answer review (chat, regenerate, consensus,
escalation) only. Compare does not use this pipeline any more — see
[Compare's Comparative Judge](#compares-comparative-judge-adr-114) below.**

### When the pipeline runs

`JudgeRefereeManager.evaluate()` is invoked from `ChatExecutionManager.execute()`
(step 8a of the message flow above). It activates when **(a)** the
thread carries `judgeEnabled=true`, or **(b)** the routing decision flagged an
auto-trigger category (coding, security, medical, legal, finance,
data-analysis). On success the manager returns a `JudgeRefereeResult`
containing the original response, the critic evaluation, the judge verdict,
and (optionally) a revised or escalated response.

### Critic target resolution

`resolveCriticTarget(generatorProvider, config)` picks the model for the
critic LLM call in this order:

1. **User-supplied wins**. If `config.criticEnabled === true` AND
   `config.criticModel` is a non-empty string, the value is parsed via
   `parseJudgeModel()` (the same `PROVIDER:model` parser the Judge uses).
   A known provider (e.g. `anthropic:claude-sonnet-4`) routes through that
   connector so token usage is captured natively; a plain model name routes
   through Ollama with `resolveModel()` mapping `AUTO` to the configured
   default local model.
2. **Auto-pick fallback**. Otherwise `selectCriticModel()` returns the first
   entry of `CRITIC_CLOUD_MODELS` whose provider differs from the generator
   (avoids self-critique bias), or the local Ollama default when
   `isLocalOnly`. This is the legacy v1 behaviour preserved unchanged.

The DTO refinement (`apps/claw-chat-service/.../parallel-message.dto.ts`)
enforces `criticEnabled ⇒ criticModel != ''` AND
`criticEnabled ⇒ judgeEnabled` before the request reaches the manager, so the
gate above only has to make a positive selection.

### Critic output parsing

`parseCriticOutput(content)` is fault-tolerant by design — critic models
sometimes wrap JSON in prose or fenced code blocks. The parser:

1. Strips a ` ```json ... ``` ` fence if present.
2. Extracts the first `{ ... }` block via regex.
3. JSON-parses and clamps `score` into `[0, 1]`, filters non-string feedback
   entries, falls back to a derived summary when `summary` is missing.
4. **On any failure**, returns
   `{ feedback: [], score: 1.0, summary: CRITIC_PARSE_FAILURE_SUMMARY, parseFailed: true }`
   and logs `parseCriticOutput: failed to parse critic output. Persisting
parse-failure marker.` so the failure is observable without poisoning the
   downstream Judge decision.

### Persistence into ChatMessage.metadata

`buildMetadata()` assembles a `JudgeRefereeMetadata` object stored under
`ChatMessage.metadata` (JSON column). The critic-specific fields are
`criticModel`, `criticFeedback`, `criticScore`, `criticSummary`,
`criticRequested`, `criticParseFailed`, plus a `criticLatencyMs` rolled up
into `judgeTotalLatencyMs` and (when the run had real token accounting)
combined judge+critic token usage in the top-level
`judgeInputTokens/judgeOutputTokens` for a single `TokenLedgerContext.JUDGE`
ledger entry. The full payload also lands in `metadata.judgeReview`
(`JudgeReviewPayload`) so the FE can render the Judge panel without
recomputing anything.

### Plan-feature gating

`AccessControlService.assertCanSendMessage()` (chat-service) is called by
`createParallelMessage()` BEFORE the manager fires. It pushes plan-feature
checks into a single `requireFeature: PlanFeature[]` call:
`allowCompareMode` (always), plus `allowJudgeMode` when `judgeEnabled`, plus
`allowCriticReview` when `criticEnabled`, plus `allowResearchMode` when the
research enricher is requested. A locked plan flag returns `403
MODEL_NOT_ALLOWED_FOR_PLAN` before any LLM tokens are spent.

## Compare's Comparative Judge (ADR-116)

Compare's judge is a **separate manager, `CompareJudgeManager`**, not the
`JudgeRefereeManager.evaluate()` pipeline above. It replaced a design that
called `evaluate()` once per lane — every lane's score came from its own
call, so scores were never on the same scale and the "best" badge was
whichever per-lane call happened to be more generous.

### One call, every lane, one scale

`ParallelExecutionManager.applyJudgeToResponses()` waits for **every** lane in
the run to settle, then calls `CompareJudgeManager.judge()` exactly once:

1. Completed lanes only (`status === 'completed'`) are sent. Fewer than two →
   `CompareJudgeVerdictStatus.SKIPPED`, `CompareJudgeFailureReason.NOT_ENOUGH_ANSWERS`,
   no provider call.
2. `buildLaneShuffle(runId, laneIndices)` — a SHA-256-seeded Fisher-Yates
   shuffle, deterministic per run — assigns each lane a label (A, B, C…) in a
   shuffled presentation order. The mapping is recorded on the verdict
   (`CompareJudgeShuffle`) so `laneIndexForLabel` can always unshuffle a label
   back to its lane.
3. If the critic is on, `JudgeRefereeManager.critiqueLane()` (a thin new entry
   point reusing `resolveCriticTarget` + `callCriticWithModel`) still runs
   once per lane. Its **notes** are folded into the comparative prompt as
   `Critic notes on candidate X: …`; its **score is dropped** — a per-lane
   score is exactly the uncalibrated signal this ADR removes.
4. Each answer is fitted to the judge model's own context window via
   `fitAnswersFairly` (max-min "water-filling" — every shortened answer cut to
   the SAME length, never a flat percentage), budgeted by
   `computeAnswerBudgetChars` against `ChatContextGatewayManager`'s
   `ChatSurface.JUDGE`-sized bundle. The prompt names which candidates were
   shortened and to what length.
5. The one call goes through `ModeExecutionGatewayManager.run()` →
   `ChatExecutionManager.callProvider` — the same billing chokepoint every
   mode uses — as `TokenLedgerContext.JUDGE` /
   `PaygSurface.JUDGE` / `PAYG_WORKFLOW_COMPARE_JUDGE = 'compare-judge'`, with
   `requestId = ${runId}:compare-judge`. **Exactly one reservation per Compare
   run.**
6. The reply is parsed by `parseCompareJudgeOutput` against a strict Zod
   schema PLUS cross-field invariants: every shown label appears exactly once
   in `ranking` AND `scores`, and walking `ranking` best-first never meets a
   score higher than the one before it. Any violation — or a non-JSON reply —
   returns `null`.

### Verdict shape — failure is never a fake winner

`CompareJudgeVerdict.status` is `RANKED | UNAVAILABLE | SKIPPED`. Only
`RANKED` carries `lanes` and a `winnerLaneIndex`; the other two carry an empty
`lanes` array, `winnerLaneIndex: null`, and a `CompareJudgeFailureReason`
(`CALL_FAILED` / `PARSE_FAILED` / `NOT_ENOUGH_ANSWERS`). Ranks are competition
ranks (`1, 1, 3` on a tie) — a tie for first place leaves `winnerLaneIndex:
null` and lists the tied lanes in `tiedLaneIndices`; there is no
first-one-wins tiebreak.

The same verdict object is stamped on **every** `ParallelModelResponse` of the
run (`compareJudge`), alongside that lane's own `compareLaneIndex`. A lane
that did not complete is always `judgeState: CompareJudgeState.SKIPPED`
regardless of the run's overall verdict. `CompareJudgeState.RANKED` is the new
badge state the frontend renders for a ranked lane.

### Research workflow selection: mapping vs. classifying

`ChatMessagesService.runResearchForIntent` is the only single-message
research call site (compare-mode's `ContextAssemblyManager` has its own,
separate one). It picks which `ResearchWorkflow` to request from
research-service via `classifyResearchWorkflow`
(`common/utilities/research-intent-classifier.utility.ts`), not the plainer
`mapResearchModeToWorkflow` compare-mode still uses.

The difference: `mapResearchModeToWorkflow` is a pure lookup from the
user-facing `ResearchMode` toggle (NONE/SEARCH/SEARCH_FETCH/SEARCH_EXTRACT).
`classifyResearchWorkflow` calls that lookup first, then upgrades the result
to `ResearchWorkflowKind.SITE_CRAWL` when the message itself contains a URL
plus deterministic crawl-intent language ("crawl", "audit this website",
"map the site") — see
[ADR-092](../13-adr/adr-092-site-crawl-reuses-fetchservice-no-new-fetch-path.md).
It never upgrades `SEARCH_ONLY` (chosen and priced as fetch-free) and never
runs at all when research is off — research stays opt-in; this only makes
the already-on state smarter about which workflow to request.

Compare-mode is excluded on purpose: crawling once per parallel model lane
would multiply the cost by the number of providers being compared.

### Live SITE_CRAWL progress: a third dedicated Redis subscriber

`runResearchForIntent` always sets `ResearchRequest.correlationId` to
`threadId` (harmless to send for every workflow — research-service only acts
on it during `SITE_CRAWL`). `ResearchProgressBridgeService`
(`modules/chat-messages/services/research-progress-bridge.service.ts`)
subscribes to `RESEARCH_CRAWL_PROGRESS_CHANNEL` (`@claw/shared-constants`) on
its own `RESEARCH_PROGRESS_SUBSCRIBER_CLIENT` connection
(`infrastructure/redis/constants/redis.constants.ts`) — a third dedicated
subscriber alongside `CHAT_STREAM_SUBSCRIBER_CLIENT` and
`STREAM_CANCEL_SUBSCRIBER_CLIENT`, not a share of either, because ioredis
puts a subscribed connection into a mode that rejects ordinary commands and
each existing subscriber already owns exactly one channel's handler slot.

Every message it receives is parsed as a `ResearchCrawlProgressMessage`
(`@claw/shared-types`) and mapped
(`utilities/research-progress-bridge.utility.ts`'s
`mapCrawlPhaseToResearchProgress`) onto the existing
`ChatStreamService.emitResearchProgress(threadId, …)` lifecycle — the same
method the search-then-fetch research enricher already uses, so the frontend
needs no new event type to render a live crawl. A malformed payload (bad
JSON, missing `correlationId`/`phase`) is logged and dropped, never thrown:
one bad tick must not take down the subscriber loop every other thread's
progress also flows through. Full design and why Redis pub/sub instead of a
RabbitMQ `claw.events` topic:
[ADR-092](../13-adr/adr-092-site-crawl-reuses-fetchservice-no-new-fetch-path.md)'s
live-crawl-progress amendment.

### Mid-generation crawl retrieval: `get_crawled_page` (Ollama Cloud only)

A completed `SITE_CRAWL` run's pages are already fully in the initial
prompt — real crawls have overflowed the context window this way, per
ADR-095. `ChatMessagesService.extractCrawlRetrieval` reads the same
`metadata.research.bundle.items` field `synthesizeTranscriptFromBundle`
already uses for the FE transcript, and — only when the triggering
message's research `mode` was literally `'SITE_CRAWL'` — passes a
`CrawlRetrievalContext` (`modules/chat-messages/types/crawl-retrieval.types.ts`)
as `execute()`'s new fourth parameter.

When the resolved candidate is `OLLAMA_CONNECTOR_PROVIDER` and that context
has at least one page, `ChatExecutionManager.tryRunCrawlRetrievalTurn`
routes the turn through `runOllamaCloudRetrievalTurn` instead of the normal
streaming/single-shot path: it builds the request the usual way
(`buildOllamaChatRequestBody`), appends a `get_crawled_page` tool definition
listing every crawled URL
(`utilities/crawl-retrieval-tool.utility.ts`'s
`buildGetCrawledPageToolDefinition`), and drives it through
`runOllamaCloudToolLoop` — the same agentic loop `web_search`/`web_fetch`
already use, reused here for the first time in production (see ADR-095 for
why that loop had no production callers before this). A `get_crawled_page`
call is answered from the in-memory pages, not the network
(`executeGetCrawledPage`) — no PAYG hold, no feature-usage record, because
the crawl that produced the content was already metered when it ran.

**Billing note, because this path deliberately bypasses `callProvider`.**
The loop takes its own PAYG hold per turn; going through `callProvider` too
would double-bill. `runOllamaCloudRetrievalTurn` redoes only the two things
that chokepoint would otherwise have done for it —
`assertExposedForExecution` and `recordChokepointUsage` — see ADR-095 for the
full reasoning and the test that proves exactly one hold per completion.

Ollama Cloud only: OpenAI/Anthropic/Gemini candidates never see this tool,
even with a populated `CrawlRetrievalContext` — extending it is real,
separate scope (ADR-095's "Revisit when").

---

## Advanced Orchestration Modes

The chat service now exposes a family of higher-order endpoints for structured response generation and comparison:

- **`/consensus`** -- collect candidate answers and synthesize one consensus result
- **`/escalation-chain`** -- try lower-cost or faster models first, then escalate when thresholds are not met
- **`/repair`** -- critique and repair a candidate answer
- **`/decompose`** -- split a complex prompt into ordered subtasks
- **`/best-of-n`** -- generate multiple candidates and choose the strongest output
- **`/cost-ensemble`** -- balance quality and cost across model choices
- **`/verify`** -- run lightweight verification against explicit checks
- **`/role-pack`** -- apply structured multi-role prompting
- **`/pipeline`** -- execute staged prompt steps with a final aggregated result

These flows live alongside the standard message path and the parallel compare path. They share the same service boundaries: context assembly stays in chat, provider configuration stays in connector-service, local model support stays in ollama-service, and external grounding stays in workspace-service.

---

## Parallel Multi-Model Response Mode

The parallel compare feature lets users send a single prompt to multiple models at once and view responses side by side. This is useful for comparing model quality, latency, and cost across providers.

### How It Works

1. **User selects 2-5 models** -- frontend multi-select picker allows choosing provider/model pairs
2. **POST /chat-messages/parallel** -- sends the prompt, threadId, and list of models
3. **ParallelExecutionManager** -- fires all LLM calls via `Promise.allSettled()` so failures in one model do not block others
4. **Store responses** -- each model's response is stored as a separate ASSISTANT message with its own token counts, latency, and provider metadata
5. **Return all results** -- response includes an array of model responses with status (fulfilled/rejected), content, latency, and token usage

### ParallelExecutionManager

The `ParallelExecutionManager` handles:

- Building the prompt once via `ContextAssemblyManager` (shared across all models)
- Dispatching concurrent calls to each selected provider/model
- Collecting results via `Promise.allSettled()` -- each call is independent
- Recording per-model latency and token counts
- Storing each response as a separate ASSISTANT message linked to the same thread
- Publishing `message.completed` events for each successful response

### Types

| Type                  | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `ParallelRequest`     | threadId, content, models (array of {provider, model}), fileIds                                     |
| `ParallelModelResult` | provider, model, status (fulfilled/rejected), content, inputTokens, outputTokens, latencyMs, error? |
| `ParallelResponse`    | threadId, userMessageId, results (array of ParallelModelResult), totalLatencyMs                     |

### Constraints

- Minimum 2 models, maximum 5 models per request
- Each model must belong to a healthy, active connector (or be a local Ollama model)
- Thread ownership is validated before execution
- All models share the same assembled context (system prompt, memories, files, history), budgeted for the smallest lane's real window (`laneTargets`, rule 51 item 4)
- Each lane's attachments are resolved against that lane's own model (ADR-120): a text-only lane gets no image bytes, and its `fileDelivery` says so

## Coding agent conversations are a separate origin

The VS Code coding agent talks to this service through the same endpoints as
the web app, authenticated as the same user. Until `ThreadOrigin` existed, that
meant every agent run appeared in the user's chat list beside conversations
they had held themselves, and nothing in the data said which was which.

`ChatThread.origin` is `WEB` or `CODING_AGENT`, defaulting to `WEB`. Three
things follow, and the first is the one that surprises people:

- **`listThreadsQuerySchema` defaults `origin` to `WEB`, not to "any".** A list
  that returned every origin would put the agent's runs straight back where
  they were. The repository's `buildWhereClause` applies the same default
  again, so a caller that bypasses the DTO still gets one origin rather than
  all of them.
- **The migration made every existing row `WEB`.** Nothing moved out of
  anyone's chat list; only threads created from here on separate.
- **`coding-agent-chats` is read-only by construction.** The module has a
  controller with two `@Get` routes and a service with no create, update or
  delete method, so a later change cannot add a write by accident. nginx also
  refuses anything but `GET`, `HEAD` and `OPTIONS` on that path, in both
  `locations.conf` and the distributed template.

The web app shows what the agent did. It does not join in: a reply typed into a
finished run has no agent listening for it.

Each read in `CodingAgentChatsService` pins `origin` as well as `userId`. The
origin filter is what keeps agent runs out of the web list; pinning it again on
the agent endpoint is what stops that endpoint becoming a second, unfiltered
way to read the user's ordinary conversations. A missing thread, another user's
thread and a web thread all refuse identically, so the endpoint cannot be used
to learn which thread ids exist.

The daily chat ceiling still counts agent threads. They cost the same money.

## AUTO research: the narrated planner loop (2026-09-19)

AUTO research is no longer a yes/no gate inside the POST. See
[ADR-098](../13-adr/adr-098-auto-research-is-an-ai-driven-narrated-loop.md) and
[rules/50](../../rules/50-agentic-research-loop-and-narration.md).

- `createMessage` stores the user row and returns; `runResearchIfRequested`
  runs afterwards and `publishMessageCreated` is in `finally`.
- `runAutoResearch` checks `hasResearchAccess` first, then hands the turn to
  `ResearchOrchestratorManager`: `ResearchGateService.plan()` →
  crawl (`SITE_CRAWL`, `maxPages`) → `followUpAfterCrawl()` → search
  (`SEARCH_THEN_FETCH`, `searchQuery`) → one merged bundle.
- `NarrationService` keeps the turn's work log in `claw:chat:narration:<threadId>`
  and streams each line as a `narration` frame; `storeAssistantResponse` copies
  it to `metadata.narration`. `ResearchProgressBridgeService` turns crawl ticks
  into lines with a per-tick dedupe key (every replica receives them).
- Research is called on `POST /api/v1/internal/research/runs` with the service
  token and the user id — never the user's bearer.
- URL detection is `detectPromptUrls` → `@claw/shared-utilities`
  `detectUrlsInText`; bare domains count.

## Agent runs assemble context like chat, or they should

`RuntimeV2LoopManager` builds context twice — once for the first turn, once per
continuation — and both calls go through `ContextAssemblyManager.assemble`, the
same entry point ordinary chat uses. What differed was the arguments, and every
difference was a feature quietly missing from the coding agent:

| Argument            | Was                     | Now                             |
| ------------------- | ----------------------- | ------------------------------- |
| thread settings     | `{ maxTokens: 96_000 }` | `runtimeThreadSettings(thread)` |
| `fileIds`           | `undefined`             | `latestUserFileIds(history)`    |
| `maxTokens` meaning | assumed context budget  | answer length (ADR-086)         |

**The token one is the subtle one.** `ThreadSettings.maxTokens` feeds
`requestedOutputTokens`, which feeds `reservedOutputTokens`, and nothing else.
Passing the context budget there did not enlarge the prompt; it reserved the
resolver's 32,768-token ceiling for the answer and shrank the input by exactly
that much. Two tests asserted the old value, so the mistake was frozen rather
than caught — they now assert the reserve and say why.

**The rule for changing this.** Any argument added to `assemble` must be added
to `helpers/runtime-thread-context.helper.ts` as well, or the coding agent
starts diverging from chat again, silently, in whatever the new argument
controls.

## The silent stop has two shapes, and one of them looks like success

`isUnfulfilledIntent` has always caught the model that announces work it never
does. A live round found the mirror image: the prompt asked for a file, the
model replied `DONE`, the run recorded `run.completed`, and the workspace was
empty. Nothing in the stream said otherwise — an announcement at least reads
as unfinished, while a completion claim reads as success.

`isHollowCompletion` catches that, gated to the **first turn**. Before any tool
has run, a completion claim is a claim about work that cannot have happened.
After one, "done" is ordinary, so continuations are exempt and the caller
passes the flag rather than the predicate guessing.

**What keeps it from firing on real answers** is the remainder test. A reply
that explains itself — "Done. The file already contained the value, so nothing
needed changing." — has content after the claim and is left alone. Only a bare
assertion is hollow. The false-positive cases in
`utilities/__tests__/hollow-completion.utility.spec.ts` are the important half
of that suite: this predicate decides whether to spend another provider call.

## Attachments on an agent run

A coding-agent run posts to `/chat-messages/runtime/runs`, whose schema is
`.strict()`. It had no `fileIds`, so there was no way to send an attachment
with an agentic request — and the extension worked around that by routing any
request carrying a file down the legacy chat path instead. The workaround was
silent and expensive: attaching a file cost the user the agent's tools.

`fileIds` is now part of the run start and is stored on the created user
message as `metadata.fileIds`. Nothing downstream changed, because that is
already where `ContextAssemblyManager` looks for attachments — the same field
ordinary chat has always written.

**If you add another way to start a run**, write the attachments to the same
place. A second lookup path is how the coding agent and chat drifted apart the
first time.

## Every lane gets the media its own model can read (ADR-120, 2026-09-25)

The model the user picked is **not** assumed to be the media executor. Per lane
(single chat, each compare lane, judge, critic) chat-service decides how every
attachment reaches THAT model, and the one decision drives both the payload and
the record. Rule: [rules/42](../../rules/42-attachment-understanding.md) item 14.

- **Capability**: `ModelCapabilityClient` (`clients/model-capability.client.ts`)
  reads connector-service `GET /api/v1/internal/connectors/models-snapshot`
  (60 s cache, 10 s negative cache, 2.5 s timeout, **never throws**), keyed by
  `modelMatchKey` from `@claw/shared-utilities` (the same normalizer routing
  uses). Result per modality: `MediaCapabilityState` SUPPORTED / UNSUPPORTED /
  UNKNOWN (`IMAGE_INPUT`, `AUDIO`|`AUDIO_INPUT`, `VIDEO_INPUT`).
- **Unknown policy**: no row for a local runtime (`local-ollama`, `OLLAMA`,
  `local-llamacpp`, `LLAMACPP`) → `isLocalVisionModel` name heuristic; no row
  for a cloud model, or snapshot down → UNKNOWN → the old provider-level
  behaviour (`VISION_CAPABLE_PROVIDERS`, `GEMINI_VIDEO_CAPABLE_MODELS`).
- **Resolver**: pure `resolveAttachmentDelivery(files, capabilities, options)`
  (`utilities/attachment-delivery.utility.ts`) → per file a `FileDeliveryMode`
  and `sendNative`. `buildFileDeliveryEntries` delegates to it (one classifier).
- **Chokepoints**: `AttachmentDeliveryManager.applyToContext` runs at the top of
  `callProvider` and `streamCandidate`, stamps `context.attachmentDelivery`, and
  the response carries `fileDelivery`. Builders read `isSentNatively` /
  `nativeImageContents` — never re-derive vision themselves. Image/file
  generation providers are skipped.
- **Non-vision lane**: no `image_url` part, no Ollama `images[]`; the system
  block carries the OCR text framed as extracted text, or a plain "cannot see
  this image" note; recorded `OMITTED_NO_VISION` (batch 5's helper vision
  upgrades exactly this decision — see the next section).
- **Modes**: `TRANSCRIPT` / `STILL_PROCESSING` / `FAILED_PROCESSING` for audio,
  `NATIVE_VIDEO` only on Gemini's native transport, `TRUNCATED_TEXT` when the
  text exceeded `MAX_FILE_CONTENT_LENGTH` or carries `TEXT_BUDGET_SHORTENED_MARKER`.
- **Provenance**: single chat writes `metadata.fileDelivery` (compare's shape);
  compare records each lane from its own model (`laneDeliveryEntries`); the
  judge summarises `response.fileDelivery` before falling back to the heuristic.
- **Video routing**: `resolveVideoAttachmentCandidates` takes a
  `VideoRoutingCapability` (`AttachmentDeliveryManager.resolveVideoRouting`);
  alternatives are built from the same catalog data and never include the
  rejected model.
- **Placeholders**: `decodeFileContent` checks video BEFORE `extractedText`, so
  file-service's `[Video file: x]` never reaches a model.
- **Compare budget**: `ChatContextRequest.laneTargets` → the gateway budgets
  the shared context for the smallest lane window; any unknown lane keeps the
  conservative 8k.
- **Log line** (content-free): `mediaDelivery {"provider","model","vision","videoInput","files","modes":{…},"fileIds":[…]}`.
  `docker logs claw-chat-service | grep mediaDelivery` answers "did the model get my image?".

## Helper vision: a lane that cannot see gets a description (ADR-120 batch 5, 2026-09-25)

When a lane's model cannot see (`OMITTED_NO_VISION`, reason `no_vision`), the
admin's `VISION_HELPER` models describe the image and the lane receives the
description as **derived observations**. The user's model stays the
conversational model; the message's `provider`/`model` are never replaced.

- **Where**: `ChatExecutionManager.withAttachmentDelivery` runs
  `AttachmentDeliveryManager.applyToContext` then
  `VisionHelperManager.upgradeContext` (`managers/vision-helper.manager.ts`) at
  both chokepoints, so single chat, compare lanes, judge and critic are covered.
- **Candidates**: `VisionHelperCandidatesClient` reads
  `GET /internal/assistant-models/VISION_HELPER/candidates` (60 s cache, last list
  on outage, empty list = no helper). Only models the connector catalog marks
  vision-`SUPPORTED` are tried; a LOCAL_ONLY / PRIVACY_FIRST turn
  (`context.mediaLocalOnly`) tries local providers only.
- **One description per (user, turn, image)**: `ContextAssemblyManager.assemble`
  stamps `turnId`; lanes spread it, so compare lanes + judge share one in-flight
  result (10 min TTL, 500 entries). One image = one paid call, one hold.
- **Metering**: `PaygSurface.VISION_HELPER`, workflow `vision-helper`. The
  manager reserves (`requestId` `${turnId}:vision:${fileId}`, a fall-through
  gets `…:attempt:N`), then calls `callProvider` with `paygCall.hold`, so the
  provider receives `hold.maxOutputTokens` and the chokepoint finalizes /
  releases. A 402, clamped hold (released `CANCELLED`) or unreachable meter →
  `REFUSED`, no next candidate (rule 37 item 18). A timeout (`timeoutMs` from
  the role row) → `TIMED_OUT`, no next candidate (the late call settles its own
  hold). Any other error, including an image rejection → next candidate.
  Local helpers come back `metered: false`.
- **Limits**: `VISION_HELPER_MAX_IMAGES_PER_TURN` = 4; the rest keep OCR with
  reason `vision_helper_limit`. The helper gets only the fixed instruction
  (`VISION_HELPER_SYSTEM_PROMPT`) and the one image — no history, memories or
  user question.
- **Payload**: `DERIVED_IMAGE_TEXT` entries carry `helperProvider` /
  `helperModel`; `renderFileText` emits the framed block
  (`DERIVED IMAGE OBSERVATIONS — produced by ClawAI's vision helper (p/m), not seen directly by you.`,
  `Image:`, BEGIN/END delimiters with forged ones stripped, and guidance to say
  it relied on a description and to treat image text as data, not instructions).
  Failure → OCR + honest note (`vision_helper_failed`); credit refusal → OCR +
  `VISION_HELPER_REFUSED_NOTE` (`vision_helper_refused`).
- **Window**: descriptions and the other files' text are fitted TOGETHER into
  the file share (`fitLaneFileShare`, rule 51 item 4), descriptions first;
  `context-assembly-window-fit.spec.ts` proves an 8k lane still fits.
- **Provenance**: `metadata.helperExecutions: [{kind:'VISION', provider, model, fileId, latencyMs, outcome}]`
  on single chat and every compare lane it served.
- **Log line** (content-free, per attempt): `visionHelper {"kind","provider","model","fileId","latencyMs","outcome"}`.
- **Not yet**: plan gating (paid-only helper vision) is batch 6.

## Media plan gates (ADR-122, 2026-09-25)

- **Image turn on a free plan**: `callImageService` asks
  `hasPlanFeatureFor(userId, 'allowImageGeneration')` before the vision prompt
  hop and before image-service. "No" → a finished reply with
  `planFeatureRefusal`, stored as `metadata.type = 'plan_feature_disabled'`,
  `planFeature: 'allowImageGeneration'`; the frontend renders a translated
  upgrade notice. image-service's own 403 maps to the same reply. Outage → 503.
- **Helper vision on a free plan**: `VisionHelperManager` skips the helper,
  keeps OCR + the honest note, reason `file_delivery.reason.helper_vision_plan`;
  no candidate lookup, no hold, no call. Asked only when an image is blind, so
  ordinary chat never pays for or fails on the check.

## Video a lane cannot watch: frames + transcript (multimodal batch 8, 2026-09-25)

A lane that cannot take the video bytes natively no longer gets "cannot watch
this video". Once file-service has written the timestamped document, the lane
receives `FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT`: a framed block

```
VIDEO: clip.mp4 (duration 01:23, 1280x720, audio: yes)
TRANSCRIPT (timestamped):
[00:00–00:04] …
FRAMES: sampled at 00:05, 00:20 — attached as images …   (or: FRAME AT mm:ss + derived observations)
Cite moments by their timestamps …
```

plus the sampled frames — `image_url` parts labelled with their time for a
lane that can see, the VISION_HELPER role's timestamped descriptions for one
that cannot, or the honest "frames could not be viewed; only its transcript was
used" note. Still-processing and failed videos say so (plan limits named).

- Pieces: `resolveAttachmentDelivery` (strategy, pure) → `VideoDeliveryManager`
  (frames, after `VisionHelperManager`) → `ContextAssemblyManager`
  (`renderVideoText`, `buildVideoFrameParts`). Frame timestamps:
  `selectVideoFrameTimestamps` (question-biased, deterministic). Frames:
  `VideoFramesClient` (one fetch per user/turn/video). Descriptions:
  `VisionHelperManager.describeVideoFrames` (plan-gated, metered, VIDEO_FRAME).
- Budget: everything textual shares the file share; native frames capped by
  `nativeFrameCap`; framing reserved.
- Provenance: `fileDelivery[].frameDelivery` + `frameTimestampsMs` (+ helper);
  `helperExecutions[]` kind `VIDEO_FRAME` with `timestampMs`; `videoDelivery`
  log line (no transcript, no frames).
- `resolveVideoAttachmentCandidates` no longer throws
  (`VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED` / `…_LOCAL_MODEL_UNAVAILABLE` are
  never raised now) and no longer forces AUTO onto Gemini — routing-service
  ranks by modality fit instead.
- `message.created` carries `attachmentMimeTypes` / `requiredModalities` /
  `transformableModalities`; AUTO research's planner sees a short attachment
  digest. Details: `apps/claw-chat-service/CLAUDE.md`, rule 42 item 16, rule 51
  item 13, ADR-120 addendum.

## "Read aloud" — text-to-speech of a reply (multimodal batch 9, 2026-09-25)

Its own capability, endpoint, player and PAYG surface — never mixed with
transcription (ADR-120 addendum).

- **Routes** (`ChatSpeechController`, JWT): `GET /chat-messages/speech/availability`
  → `{ available, reason: SpeechUnavailableReason | null }` (plan off →
  `PLAN_DISABLED`; no enabled TTS_VOICE candidate with a connector key →
  `NO_VOICE_CONFIGURED`; entitlements unreadable → `TEMPORARILY_UNAVAILABLE`), and
  `POST /chat-messages/:id/speech` (Zod params, id `^[A-Za-z0-9_-]{1,64}$`) →
  `{ fileId, mimeType, filename, truncated, characters, cached }`.
- **Order** (`MessageSpeechService`): owner else 404 (same as a missing id) →
  `assertTextToSpeechAccess` 403 `PLAN_FEATURE_DISABLED` before any hold → speakable
  text (`speakable-text.utility.ts`: code dropped, links to their text, URLs to
  their host, markers stripped; capped at 4,000 code points at a sentence end,
  `truncated`) → replay `metadata.speech` when its content hash matches and the
  file still exists (no hold, no call; an unanswerable existence check replays) →
  `SpeechSynthesisManager` → store via file-service
  `POST /internal/files/store-generated-audio` → `metadata.speech` (never bytes).
  Concurrent requests for one reply on a replica share one synthesis.
- **Candidates**: `TtsVoiceCandidatesClient` (routing TTS_VOICE, 60 s cache).
  `toSpeechCandidates` keeps only Gemini `…-tts` models and OpenAI `tts-1` /
  `tts-1-hd` — models it can meter exactly. A provider with no connector key
  (`SpeechConnectorClient`, key fetched fresh, only yes/no cached) is skipped
  BEFORE any hold.
- **Metering** (`PaygSurface.TTS`, one hold per provider attempt, requestId
  `tts:<msg>:<contentHash>:g<generation>:<n>`): OpenAI reserves / finalizes
  `ttsCharacters`; Gemini reserves text tokens + 16 and 4 output tokens per
  character (≤ the admin ceiling), sends `hold.maxOutputTokens`, finalizes on
  `usageMetadata`. Provider rejection / outage → release PROVIDER_ERROR, next
  candidate. 402, clamped hold (released CANCELLED), unreachable meter (503) and a
  deadline (released TIMEOUT, 504) END the walk. None configured → 503
  `TTS_UNAVAILABLE`; all failed → 502 `TTS_FAILED`; nothing speakable / not an
  assistant reply → 422 `TTS_NOTHING_TO_READ`.
- **Audio**: Gemini PCM (`audio/L16;rate=24000`) wrapped by `pcm16ToWav` (canonical
  44-byte RIFF header); OpenAI MP3 via `httpPostBinary`. Fixed provider hosts, not
  the connector base URL.
- Log line per attempt: `ttsAttempt {messageId, provider, model, requestId,
outcome, latencyMs}` — no text, no key.
