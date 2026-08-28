# Claw Chat Service - Development Rules

## Service Overview

Chat microservice for the Claw platform. Manages chat threads and messages. Runs on port 4002 with its own PostgreSQL database (claw_chat).

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode enabled)
- **Database**: PostgreSQL with Prisma ORM (claw_chat database, port 5442)
- **Cache**: Redis (ioredis)
- **Messaging**: RabbitMQ (amqplib)
- **Validation**: Zod (NOT class-validator, NOT class-transformer)
- **Auth**: JWT (jsonwebtoken) for token verification
- **Logging**: nestjs-pino / pino structured logging

## Absolute Rules

1. **NEVER use `any`** -- use `unknown`, generics, or proper types.
2. **NEVER disable ESLint rules** -- no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
3. **NEVER use `console.log`** -- use the NestJS `Logger` service.
4. **NEVER use `!` non-null assertion** -- handle nullability explicitly.
5. **NEVER use `process.env` directly** -- use `AppConfig` from `src/app/config/app.config.ts`.
6. **NEVER put business logic in controllers** -- controllers call exactly ONE service method.
7. **NEVER put Prisma calls outside repositories** -- repositories are the sole data-access layer.
8. **EVERY function must have an explicit return type**.
9. **Service methods max 30 lines**.
10. **Controllers are 3-line methods**: extract params, call ONE service, return result.
11. **All errors use BusinessException with a code**.
12. **No default exports** -- use named exports exclusively.

## No Inline Declarations Rule

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in service, controller, repository, manager, adapter, utility, guard, filter, interceptor, pipe, or module files. Extract to dedicated files:

- Types/interfaces → `src/modules/<domain>/types/<name>.types.ts`
- Enums → `src/common/enums/<name>.enum.ts`
- Constants → `src/modules/<domain>/constants/<name>.constants.ts`
  Only exception: `private readonly logger = new Logger(...)` inside NestJS classes.

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly — they import the wrapper. Example: `src/common/utilities/jwt.utility.ts` wraps `jsonwebtoken`, and services import `{ signToken, verifyToken }` from the wrapper.

## Architecture

```
Controller -> Service -> Repository
```

## Owned Tables

- ChatThread
- ChatMessage
- MessageAttachment

## Commands

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run typecheck    # TypeScript type check
npm run validate     # typecheck + lint:strict + format:check
npm run test         # Run unit tests
npm run migrate:dev  # Create and run migration
npm run prisma:generate  # Regenerate Prisma client
```

## Docker Container Rebuild Procedure

When rebuilding this service (especially after shared package changes):

```bash
./scripts/claw.sh stop chat-service
./scripts/claw.sh rm -f chat-service
docker rmi claw-chat-service
./scripts/claw.sh up -d --build chat-service
```

**NEVER skip steps.** See root CLAUDE.md for full explanation.

## Workflow Phase Requirements

All work on this service MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): Define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): Follow backend architecture rules above
- **Phase 4** (SSE rules if applicable): Apply SSE-specific patterns from root CLAUDE.md
- **Phase 5** (Error handling): All async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): Verify all new endpoints with curl/Postman before claiming done
- **Phase 12** (QE Gates): All phases from docs/16-quality-engineering/ must pass

## Pre-Implementation Checklist (this service)

Before writing code for this service:

- [ ] Read root CLAUDE.md
- [ ] Read this service CLAUDE.md
- [ ] Read existing service code for the area being changed
- [ ] Read current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events published/consumed by this service
- [ ] Check if shared packages need updating

## Post-Implementation Checklist (this service)

After implementing any change to this service:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new Zod DTOs have: max() on strings, max() on arrays, required fields explicit
- [ ] All new service methods are ≤ 30 lines
- [ ] All new manager methods are ≤ 80 lines
- [ ] All new controllers are 3-line methods
- [ ] No try/catch in controllers
- [ ] No Prisma calls outside repositories
- [ ] All new events published using RabbitMQService
- [ ] All new messageKeys added to error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure

## Required Output Format

After completing any implementation task on this service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output

## Llamacpp execution dispatch

`ChatExecutionManager.callLlamacpp()` (`src/modules/chat-messages/managers/chat-execution.manager.ts`) handles BOTH `local-llamacpp` (frontend ModelSelector option) and `LLAMACPP` (registered connector) provider strings. POSTs to `${LLAMACPP_SERVICE_URL}/api/v1/v1/chat/completions` (the OpenAI-compatible passthrough). Bypasses `resolveProviderConfig` — no API key needed. Errors with code `LLAMACPP_REQUEST_FAILED` on non-2xx. `LLAMACPP_SERVICE_URL` Zod-required in `app.config.ts` (default `http://llamacpp-service:4017`).

## Universal token deduction chokepoint (do not bypass)

Every model call in this service flows through `ChatExecutionManager.callProvider()`. That wrapper records usage to `AccessControlService.recordUsage` for **every** mode — chat, regenerate, compare (parallel per-model), judge critic/judge/revision, consensus, escalation-chain, repair, verify, best-of-n, cost-ensemble, role-pack, pipeline, task-decomposition. There is **no** per-mode deduction call anywhere else (the old `recordCompletionUsage` / `recordJudgeUsage` are gone, to avoid double-counting).

Rules:

1. New orchestration modes MUST call `executionManager.callProvider(provider, model, prompt, context, tokenContext)` with a `tokenContext: TokenLedgerContext` and a parent `AssembledContext` that carries `userId`. Spread the parent context when building sub-contexts (`{ ...parent, ... }`) so `userId` is preserved.
2. Do NOT call `accessControlService.recordUsage` from a mode manager — the chokepoint owns deduction.
3. Generation responses (image/file-gen) skip deduction via `isGenerationResponse` and stay un-charged.
4. `LlmResponse` carries `tokenEstimated: boolean` and `tokenSource: 'NATIVE' | 'ESTIMATED' | 'MIXED'`. Always go through the per-provider extractors in `@claw/shared-utilities/token-usage` so missing native usage is filled by the `ceil(len/4)` estimator.
5. Cloud judge selection is encoded as `"PROVIDER:model"` (e.g. `"OPENAI:gpt-4o-mini"`). Parse with `parseJudgeModel(raw)` (`src/common/utilities/judge-model-parse.utility.ts`); it checks the leading segment against `KNOWN_JUDGE_PROVIDERS` so local tags like `gemma3:4b` are not mis-parsed.

See `docs/03-architecture/universal-token-accounting.md` for the full picture.

## Local-runtime rich-progress wiring (PR1-5 — **IMPLEMENTED** 2026-05-31)

The cloud rich-progress stack in this service (`ChatStreamService` +
`ProviderStreamExecutor` + `@Sse('stream/:threadId')` + `AiStreamStage` +
`AiStreamProtocol`) is the foundation that local-runtime rich-progress now
extends end-to-end. PR1 shipped the contract; PR2 wired text-runtime final
timings + bottleneck through this service. The original "extension point"
stub in this file is now IMPLEMENTED — see the wiring table below.

| Seam                                               | Status / wiring                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChatStreamService` (RxJS Subject per thread)      | Unchanged. Same Subject; both `StreamEvent` and `ClawRuntimeProgressEvent` envelopes coexist on the SAME SSE channel.                                                                                                                                                                                                                                                                               |
| `ProviderStreamExecutor` (OpenAI-SSE + Ollama)     | **PR2 wired.** `applyFragment()` now reads `fragment.finalTimings` from the terminal frame and stashes it on `LoopState.finalTimings`. `transitionStage()` + `closeStageIfActive()` capture per-stage wall-clock windows into `LoopState.stageTimings`. `finalize()` calls `buildFinalMetrics()` which merges the live tracker snapshot with `computeFinalStreamMetrics()` and adds `stageTimings`. |
| Final `METRICS` event payload (`StreamMetrics`)    | **PR2 enriched.** Now includes `modelLoadMs` / `promptEvalMs` / `generationMs` / `tokensPerSecond` (computed by `final-metrics.utility.ts`) + `bottleneck` (`{ stage: 'modelLoad' \| 'promptEval' \| 'generation', durationMs, percentOfTotal }`) + `stageTimings` (`Record<AiStreamStage, { startedAtMs, endedAtMs }>`).                                                                           |
| `final-metrics.utility.ts` (new, PR2)              | Single source of truth for picking the slowest of (modelLoad, promptEval, generation) when those numbers are available, and for converting Ollama nanosecond timings to ms via `extractOllamaFinalTimings` from `@claw/shared-utilities`. Returns `undefined` bottleneck on cached / zero-duration responses; FE then skips the breakdown bar.                                                      |
| `provider-stream-reader.utility.ts` (PR2 extended) | Terminal-frame Ollama NDJSON `done: true` chunks now populate `NormalizedStreamFragment.finalTimings` instead of being dropped. OpenAI-SSE path unchanged (no native timings block).                                                                                                                                                                                                                |
| `StreamEvent` envelope                             | Coexists with `ClawRuntimeProgressEvent` (`@claw/shared-types/runtime-progress`) on the SAME SSE channel. Frontend consumers (`useChatStream`, the runtime-progress panels including `RuntimeBottleneckBreakdown` and the now-real `RuntimeStageTimeline`) handle both shapes.                                                                                                                      |
| `@Sse('stream/:threadId')` controller              | Unchanged.                                                                                                                                                                                                                                                                                                                                                                                          |

**Do not introduce a parallel SSE channel for local runtimes.** The "extend,
don't parallelize" mindset is the binding rule here. The `finalTimings`
plumbing currently consumes Ollama's NDJSON terminal frame only; the
llama.cpp OpenAI-SSE `timings` block should flow through the same
extractor in a follow-up.

Full architecture: [`docs/03-architecture/runtime-progress.md`](../../docs/03-architecture/runtime-progress.md).

## Branching copies a conversation, it does not move it (2026-08-28)

`POST /chat-threads/:id/branch` with `{ fromMessageId }` creates a new thread
holding every message up to and including that one. The original is untouched —
that is the whole difference from editing, which truncates the thread it belongs
to. Branching needs no warning because nothing is lost.

- **One transaction**, under the same advisory lock and daily chat ceiling as an
  ordinary new thread. A branch is a thread; exempting it would make branching
  the way around the limit. It refuses with `PLAN_DAILY_CHAT_LIMIT_EXCEEDED`,
  the same code, so callers have one refusal to handle.
- **The pivot must belong to the thread.** Otherwise one conversation's history
  could be grafted onto another.
- **Copied messages take fresh ids and timestamps.** Carrying the originals
  across would make two threads claim the same message, and the context receipts
  hanging off those ids belong to the original run.
- **The branch carries the source title.** It is the same conversation up to
  that point. An untitled source branches untitled and names itself from its own
  first message — which is that same message.

## Editing a prompt truncates the thread (2026-08-28)

`POST /chat-messages/:id/edit` rewrites a user prompt and re-runs the thread
from that point. It is destructive by design and the frontend warns before
calling it.

Three rules, each with a failure it exists to prevent:

- **Only a `USER` message.** Editing an assistant turn would let the transcript
  claim a model said something it did not, which is the one thing a chat log has
  to be trusted about. Refused with `MESSAGE_NOT_EDITABLE` (409).
- **Everything below is deleted.** Those were answers to a question that no
  longer exists; leaving them attaches an answer to something nobody asked.
  `ChatMessagesRepository.deleteCreatedAfter` compares on `createdAt` — there is
  no ordering column, and an assistant reply is seconds behind its prompt.
- **An unchanged edit is refused** with `MESSAGE_EDIT_UNCHANGED` (400), so a
  stray click cannot delete the rest of the thread and spend tokens re-running
  the same prompt.

`original_content` is written once, on the first edit, and never overwritten.
The context receipt on an assistant answer names the prompt that produced it;
once the prompt can change, keeping the text as first sent is the only way that
claim stays checkable.

The re-run publishes `MESSAGE_CREATED` with `regenerate: true` — the same flag
regeneration uses — so routing does not bill it against the daily message
ceiling. It is the same turn, run again.

## Image generation is a capability, not a deployment (2026-08-28)

`IMAGE_OPENAI`, `IMAGE_GEMINI`, `IMAGE_LOCAL` and `IMAGE_LOCAL_COMFYUI` are not
connector models and have no row in the model-exposure registry. They are
capabilities: image-service resolves the **OpenAI or Google connector's own API
key** at call time, and the local ones talk to Stable Diffusion / ComfyUI in the
opt-in `local-ai` compose profile.

So the exposure gate — "is this deployment offered?" — is unanswerable for them,
and it answered **no**. Selecting any image model in the composer returned
`403 MODEL_NOT_EXPOSED` no matter how the connectors were configured.
`assertModelExposed` now returns early for `isGenerationProvider(provider)`;
availability is enforced downstream, where image-service fails with a specific
error if the borrowed connector has no credentials.

The frontend used to push all three into the picker unconditionally, so a
cloud-only install advertised "SDXL Turbo (Local)" with no local runtime, and an
install with no Google connector advertised "Gemini (Image)". Each capability is
now gated on the connector whose key it borrows (`IMAGE_CAPABILITIES`).

Stable Diffusion and ComfyUI are **already** opt-in in dev and prod compose
(`profiles: ['local-ai']`, same gate as Ollama and llama.cpp). They are not
deployed unless `CLAW_LOCAL_AI=true`.

## A routed run must never fail silently (2026-08-28)

Reported as "sometimes it gets stuck". Two defects, both reproduced.

**Regenerate published the wrong id.** The regenerate button is rendered only on
assistant bubbles, so `POST /chat-messages/:id/regenerate` always received an
ASSISTANT row id. `regenerateMessage` republished that id, and
`resolveRoutedMessageWindow` matches on `role === 'USER'`, so the lookup threw
`ROUTED_MESSAGE_NOT_FOUND` every single time. `resolveRegenerationTarget` now
resolves an assistant row to the question it answered — `metadata.sourceMessageId`
first, then the nearest preceding user turn — and publishes that id **and that
content**. The content mattered too: routing scores the published text, and it
was being handed the model's own previous answer.

**The failure was invisible.** Everything from `emitRequestAccepted` through
context assembly sat OUTSIDE the `try` in `handleMessageRouted`. A throw there
skipped `handleMessageRoutedFailure` — the only code that writes an error row
and emits a terminal stream frame — and `onMessageRouted` then caught it and
returned normally, so the broker ACKed. No answer, no error, no terminal event:
the client spun until it gave up. The guarded region now starts immediately
after `emitRequestAccepted`, with `thread` and `routedMessages` hoisted so the
failure handler still gets whatever was resolved before the throw.

**Every regenerate test used a USER row**, which is the one shape the UI cannot
produce — that is why CI stayed green. Any new test here must cover the
assistant-row case.

## Memory and context-pack injection (2026-08-28)

Reproduced and fixed with a throwaway harness that plants a codeword the model
cannot otherwise know and asks a question only answerable from it. **A count is
not evidence of injection** — that was the bug, so any future check here must
assert on the model's answer, never on a counter.

Four defects, all measured before and after:

1. **Short prompts skipped retrieval entirely.** `shouldSkipExpensiveContext`
   returned true for any prompt of three words or fewer, and
   `fetchAssembledInputs` then returned `[]` for memories, context-pack items
   AND workspace context. "the codename?" got nothing. Only a pleasantry is
   skipped now.

2. **Standing memories were filtered by topic.** `filterMemoriesForIntent` kept
   a memory only if it looked preference-like by keyword or shared >= 0.28
   lexical overlap with the question. An `INSTRUCTION` — "always end every reply
   with X" — shares no vocabulary with "what is a database index", so it was
   dropped from every prompt that did not happen to discuss instructions.
   `selectMemoriesForPrompt` now splits **standing** (INSTRUCTION, PREFERENCE,
   pinned) from **topical** (FACT, SUMMARY). Standing memories are never
   filtered by topic; the overlap test and the cap apply to topical only.

3. **The cap was three, across all kinds.** Five saved facts reached the model as
   three. `PROMPT_TOPICAL_MEMORY_LIMIT` is 8 and applies to topical memories
   only, so facts can never crowd out an instruction.

4. **The reported count was the fetched count.** `metadata.memoryCount` used
   `context.memories.length` — everything retrieved — while the prompt carried
   the filtered subset. That is literally the reported symptom: "I see it
   written 1 memory but it is not sent to the model". Use
   `ContextAssemblyManager.injectedMemories(context)` for any number shown to a
   user; never `context.memories.length`.

Note that `context-preview.service.ts` retrieves through memory-service's
`/internal/memories/retrieve`, which is a **different** path from the one the
real prompt uses here. The preview and the prompt can still disagree; treat the
preview as indicative, not authoritative.

## Thread titles are derived, never generated (2026-08-27)

A thread is named after its opening message the first time an assistant answer
lands, in `ChatMessagesService.resolveDerivedTitle`.

**Derived, not model-written.** Every call in this service runs through the
universal token-deduction chokepoint, so asking a model for a title would spend
the user's own allowance on a cosmetic field they never asked to buy. The
opening sentence of a prompt is already what the person would have typed.

`deriveThreadTitle` (`modules/chat-threads/utilities/`) drops fenced blocks,
unwraps inline code, strips heading and emphasis marks, collapses whitespace,
takes the first sentence, and cuts at a word boundary with an ellipsis. It keeps
a question mark and drops a full stop — a title is a name, not a quotation. It
returns `null` when nothing usable survives, and the thread stays unnamed: a
title made of backticks is worse than none.

**It only ever fills a blank.** A title the person typed, or one derived on an
earlier turn, is never overwritten — a thread that renamed itself as the
conversation moved on would be unfindable in the list.

The scan skips past a system or tool row to find the opening user turn, because
a thread can open with a system prompt and a research run writes a placeholder
before the answer.

Before this, titles were whatever the first eighty characters happened to be:
`Create ONE new file. Read NOTHING. No prose before the tool call. Use
"create". ` became `Create ONE new file`.

## Inter-service auth for file-service internal endpoints

`claw-file-service`'s `/api/v1/internal/files/*` routes (`:id/content`, `:id/chunks`, `download/:id`, `store-image`, `upload-internal`, `download-internal`, `metadata-internal`) are guarded by `ServiceTokenGuard`. Every call from this service to those routes MUST send `Authorization: Service <token>` where `<token>` is the value of `INTER_SERVICE_AUTH_TOKEN` (the single shared secret in root `.env` — do NOT introduce a per-service variant).

Use the wrapper:

```ts
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';

await httpRequest({
  url,
  method: 'GET',
  headers: { Authorization: buildInterServiceAuthHeader() },
  timeoutMs: 10_000,
});
```

The wrapper lives at `src/common/utilities/inter-service-auth.utility.ts` and reads `AppConfig.get().INTER_SERVICE_AUTH_TOKEN`. Mirrors the pattern in `apps/claw-workspace-service/src/common/utilities/file-service-client.utility.ts#buildAuthHeader`. Forgetting the header will manifest as `401 Service token required` from file-service; users will see context-assembly silently skip attached files (caught as non-blocking) and judge/critic compare lanes will run without their attachments.
