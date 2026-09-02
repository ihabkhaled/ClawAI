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
   - File chunks from file-service (HTTP)
   - Thread message history
5. **Prompt building** -- system prompt, memories, packs, files, history, with token budget truncation
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

| Target Service    | Purpose                                 |
| ----------------- | --------------------------------------- |
| memory-service    | Fetch user memories, pack items         |
| workspace-service | Fetch grounded workspace search results |
| file-service      | Fetch file chunks                       |
| connector-service | Execute LLM calls                       |
| ollama-service    | Execute local Ollama calls              |

## Key Managers

- **ContextAssemblyManager** -- assembles full prompt from multiple sources
- **ChatExecutionManager** -- executes LLM calls with fallback chain, quality checking, and auto re-routing
- **QualityCheckManager** -- scores response quality (5 signals), recommends re-routing for weak answers
- **ParallelExecutionManager** -- executes the same prompt against 2-5 models simultaneously via `Promise.allSettled`
- **JudgeRefereeManager** -- runs the Critic → Judge quality pipeline on top of a generator response (see [Judge + Critic Pipeline](#judge--critic-pipeline) below)

---

## Judge + Critic Pipeline

### When the pipeline runs

`JudgeRefereeManager.execute()` is invoked from `ChatExecutionManager.execute()`
(step 8a of the message flow above) and from `ParallelExecutionManager` per
lane. It activates when **(a)** the lane/thread carries `judgeEnabled=true`,
or **(b)** the routing decision flagged an auto-trigger category (coding,
security, medical, legal, finance, data-analysis). On success the manager
returns a `JudgeRefereeResult` containing the original response, the critic
evaluation, the judge verdict, and (optionally) a revised or escalated response.

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
- All models share the same assembled context (system prompt, memories, files, history)
