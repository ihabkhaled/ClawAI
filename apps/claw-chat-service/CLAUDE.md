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

## The entrypoint is ESM: no `__dirname`, no runtime tsconfig-paths (2026-09-02)

`package.json` is `"type": "module"`, so `dist/main.js` is loaded as an ES
module. CommonJS globals (`__dirname`, `__filename`, `require`) do not exist
there. The 2026-09-02 prod rollout crash-looped every replica with
`ReferenceError: __dirname is not defined in ES module scope` because `main.ts`
still carried a CommonJS-era `tsconfig-paths` register from the tsgo migration.

- **Path aliases are rewritten at build time** by `tsc-alias -f` (last step of
  `npm run build`). There is nothing to resolve at runtime, and `tsconfig-paths`
  only hooks CommonJS `require`, so a runtime register is dead code at best.
- **Need a directory?** Use `import.meta.dirname` / `import.meta.filename`.
  `eslint.config.mjs` bans `__dirname` and `__filename` via
  `no-restricted-globals`; `src/__tests__/main-esm-bootstrap.spec.ts` pins the
  entrypoint.
- **Why only this service broke:** it was the only one that registered
  `tsconfig-paths`. Unit tests never load `main.ts`, and the dev container runs
  the same ESM path, so the first place the bug could surface was the rollout.

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

## Image moderation gates ads, not the share (2026-08-28)

A published share containing images is **always** readable by link. The scan
decides one thing only: whether it may additionally carry advertising and be
offered to search engines.

`ImageSafetyScannerService` runs **after** publish, never during. Publishing must
not wait on a third-party moderation API and must not fail because that API is
down — the share is the user's, the ad decision is ClawAI's, and only the second
depends on the scan. It is fire-and-forget with the rejection swallowed.

Google Cloud Vision SafeSearch, not a model asked to guess. What hangs on the
answer is ClawAI's own ad account, which is not something to stake on a
heuristic. Only `SAFE_SEARCH_DETECTION` is requested — no labels, no text, no
faces — so a user's image is not incidentally run through a general-purpose
analysis pipeline.

The policy is deliberately strict and fails closed in every direction:

- **POSSIBLE is a rejection**, not a maybe. Wrongly approving one image risks
  the ad account; wrongly withholding ads from one share costs almost nothing.
- `spoof` and `medical` are **not** moderated — a doctored photo or a clinical
  image is not an advertising problem, and rejecting on them would withhold ads
  from legitimate technical conversations.
- A missing annotation, a missing category, or an unrecognised likelihood is
  **never** an approval. A future Cloud Vision level this code has not heard of
  cannot quietly pass.
- `UNAVAILABLE` is not `REJECTED`. "The API was down" is not a verdict about the
  image, and recording it as one would blame the user's picture for an outage.
- With **no key configured**, assets stay `PENDING` rather than being marked
  `UNAVAILABLE`, so they remain eligible for a later scan once a key exists.

`scanReason` carries category names only. It is read by operators and must never
become a pointer back to the content it describes.

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

## chat-service runs 4 replicas (2026-08-28)

**Superseded.** This was a correctness constraint while the stream lived in
process memory. It no longer is: the stream bus and the Stop broadcast moved to
Redis and production runs `CHAT_SERVICE_REPLICAS=4`
([ADR-077](../../docs/13-adr/adr-077-chat-service-horizontal-scaling.md)).

What follows is kept because it explains WHY scaling was unsafe, and the three
things that had to be true before it became safe.

`ChatStreamService` keeps its event bus, its per-thread replay buffer and its
event-id sequence in process memory (`Subject`, and two `Map`s). A client
connected to replica A therefore never sees an event emitted on replica B, and
no amount of polling hides that while a run is in flight — the poll recovers the
finished answer, not the stream.

That is the failure this used to describe, and all three preconditions are now
met: the bus is in Redis, Stop is broadcast, and the compose file no longer
fixes a container name or a host port. Raising `CHAT_SERVICE_REPLICAS` is safe.

**What is still NOT safe to scale** is any service whose in-process state has
not been audited the way this one's was. The compose files keep
`container_name` on every other service deliberately — Docker then refuses to
scale them, which turns an unaudited assumption into an error instead of a
silent, partial outage.

A restart mid-run drops the partial text. That is accepted: the assistant row is
written on completion and the client's two-second poll renders it, so what is
lost is the typing animation, not the answer.

## The chat stream bus is Redis-backed (2026-08-28)

`ChatStreamService` no longer keeps anything about a stream in process memory.
Its event bus, replay buffer and event-id sequence all live in Redis, because
RabbitMQ hands a routed message to exactly ONE replica while the browser's SSE
connection is pinned to whichever replica nginx routed it to. Those are the same
instance only by coincidence.

Four invariants, each with the failure it prevents:

- **`emit()` never touches the local `Subject` directly.** It publishes, and the
  frame comes back through this replica's own subscription like everyone else's.
  One delivery path means one ordering, identical everywhere, and no
  de-duplicating a locally-emitted frame against its own echo.
- **`sequence` and `eventId` are assigned by Redis, not by the service.** They
  must be monotonic per thread across every replica: the browser discards a
  progress stage whose sequence is below one it has already rendered, so a
  per-replica counter would make a retry picked up by a second replica look
  stale and silently vanish from the UI.
- **`emit()` stays synchronous.** It is called from ~30 sites across every
  orchestration mode; making it awaitable would put a Redis round-trip in front
  of each. Ordering still holds because ioredis writes commands to one
  connection in call order and Redis executes them in arrival order — frames are
  sequenced in the order `emit` ran, not the order their promises settle.
- **`resetReplay` clears the buffer and leaves the sequence alone.** Resetting
  the counter would restart numbering at 1 and trip the stale-stage guard above.

The publish is one Lua script so the sequence, the replay record and the fan-out
are atomic. As three round-trips, a client could be handed a replay missing the
frame it had just been shown live. The script deliberately does not
`cjson.decode` the frame: cjson cannot tell an empty array from an empty object
and encodes both as `{}`, so the first array field anyone adds to `StreamEvent`
would corrupt silently, in every frame, with no test that would catch it.

**Replay is now asynchronous**, so replayed frames arrive on a later microtask
rather than during `subscribe()`. `streamEvents` therefore subscribes to live
frames BEFORE reading the replay and de-duplicates by `eventId` — subscribing
afterwards, as it did while the buffer was in memory, drops anything emitted
during the read. The old code got away with it only because there was no gap.

Redis being unreachable degrades to local-only delivery rather than silence, so
a single-replica install behaves exactly as it did before.

This removes the first of the blockers named in
[ADR-076](../../docs/13-adr/adr-076-chat-stream-durability.md). It does **not**
by itself make the service safe to scale — `StreamCancellationService` still
holds its `AbortController`s in memory, so the Stop button would hit a random
replica and silently do nothing. The single-replica rule stands until that is
fixed too.

## A reconnect resumes from `Last-Event-ID`, not from zero (2026-09-11)

`eventId` (`"<threadId>:<sequence>"`) existed on every frame since the Redis
migration above and reached exactly nowhere: Nest's `@Sse()` decorator
auto-assigns the wire `id:` from a **per-connection counter starting at 1**
whenever `MessageEvent.id` is left unset (see `SseStream.writeMessage` in
`@nestjs/core`). Two real identifiers existed side by side and nothing
connected them, so a reconnect's `Last-Event-ID` header — had anything sent
one — would have named a number that meant nothing.

Three small changes, no new state:

- `ChatStreamController` now sets `MessageEvent.id` from the frame's own
  `eventId`, overriding Nest's counter. `extractEventId` reads it defensively —
  HEARTBEAT and the runtime-v2 protocol's own event shape carry no `eventId`,
  and both must pass through with no `id:` line rather than throw.
- `ChatStreamBusService.replay(threadId, afterSequence?)` filters the buffer to
  frames after a known sequence. Omitting the argument is the historical
  behaviour — the whole buffer — which is also the fallback for an id this
  thread's buffer has already rolled past.
- The frontend's `sse.utility.ts` — a `fetch`-based reconnect loop, not a real
  `EventSource`, so nothing does this on the browser's behalf — tracks the last
  `id:` line it parsed and sends it back as `Last-Event-ID` on the next attempt.

**Only the legacy chat path resumes this way.** Runtime v2 (`?protocol=v2`,
the coding-agent's channel) already has its own numeric cursor (`query.after`)
from `RuntimeV2Store`; forwarding `Last-Event-ID` into that path would mean
nothing, so `RuntimeV2StreamService.selectEvents` only threads it to
`chatStream.streamEvents`.

Verified live: a real send showed `id: <threadId>:1` on the wire, matching
`data.eventId` — not a bare Nest counter — with no `Last-Event-ID` on the fresh
connection. See `docs/14-risk-debt/chat-pipeline-audit-2026-09.md` finding D4.

## Stop works across replicas (2026-08-28)

`StreamCancellationService` still keeps its `AbortController`s in process memory
— they cannot leave the process that owns the provider connection. What moved
across replicas is the **decision**: Stop is broadcast on a Redis channel and
whichever replica is actually running the model aborts it.

Without this, Stop posts to whichever replica nginx picked, finds no controller,
and returns quietly while the model keeps generating and keeps being billed. It
is the failure mode that costs money rather than just annoying someone.

- **The `DEL` is the source of truth for "was anything running", not the local
  map.** The replica serving the Stop usually does not hold the run. `DEL`
  reports 1 only to the caller that actually removed the key, so two concurrent
  Stops cannot both claim the same run.
- **The broadcast happens even when the marker was already gone.** A long run
  whose marker aged out is still worth aborting if some replica holds it.
- **The marker has a TTL** for the replica that dies mid-run: `release` never
  happens, and without an expiry the key would advertise a run no process is
  executing for the rest of the deployment's life.
- **`isActive` answers only for this replica.** It is not a cluster-wide check
  and must not be used as one.

With Redis unreachable it aborts locally, so a single-replica install behaves as
it did before.

This clears the second blocker from
[ADR-076](../../docs/13-adr/adr-076-chat-stream-durability.md). The remaining
work before replicas can be switched on is deployment: `container_name` in the
compose file makes Docker refuse to scale the service at all, and
`deploy-prod.sh` would recreate every replica at once.

## PAYG credit: the chokepoint reserves, the chokepoint settles (2026-08-29)

The universal token-deduction chokepoint is now also the universal **money**
chokepoint. `ChatExecutionManager.callProvider()` (buffered) and
`streamCandidate()` (streaming) each do the same three things around the
provider call:

```
hold = accessControl.reserveCredit({ userId, requestId, provider, model, surface, workflow, ... })
try   { call the provider with hold.maxOutputTokens }   ← ALWAYS the hold's ceiling
      { accessControl.finalizeCredit(hold, measuredUsage) }
catch { accessControl.releaseCredit(hold, 'PROVIDER_ERROR'); throw }
```

Rules, each with the failure it prevents:

- **The reservation IS the gate.** There is deliberately no
  `assertPaygCreditAvailable` pre-check anywhere. A second gate answers a
  question that is already stale by the time the provider is dialled, and two
  gates disagreeing is how a user gets refused under one code and charged under
  another.
- **Never call `PaygMeter` directly from a manager.** Go through
  `AccessControlService.reserveCredit / finalizeCredit / releaseCredit`. That is
  the one place `PaygCreditExhaustedError` becomes a `BusinessException` with
  `HttpStatus.PAYMENT_REQUIRED`, so every surface answers a refusal with the
  same status and the same machine code.
- **The surface is derived from the `TokenLedgerContext` you already pass**
  (`PAYG_SURFACE_BY_TOKEN_CONTEXT`). A new orchestration mode is therefore
  metered the day it is added. Pass the 10th `paygCall` argument only when the
  ledger context cannot express it — the coding agent and the vision-prompt hop
  both run as `TokenLedgerContext.CHAT`.
- **One reservation per PAID CALL, not per user request.** The Ollama Cloud tool
  loop takes a hold per turn keyed `<run>:turn:<n>` — a ten-turn agentic run is
  ten paid completions, and the later turns are the expensive ones. Runtime V2
  takes one per turn for the same reason.
- **A local runtime tag is renamed, never exempted.** `normalizePaygProvider`
  maps `local-ollama` → `OLLAMA` and `local-llamacpp` → `LLAMACPP`, because
  auth-service keys its PAYG policy on the connector provider. Sending the raw
  tag would ask the meter about a provider it has never heard of, and a meter
  outage would then fail closed on the operator's own hardware. The decision
  itself still belongs to auth-service (ADR-082).
- **`IMAGE_*` and `FILE_GENERATION` are NOT reserved here.** They dispatch to
  image-service / file-generation-service, which meter their own provider calls;
  a hold here would debit one generation twice. The text call that writes a
  file's _contents_ is a real provider call and IS metered, at
  `PaygSurface.FILE_GENERATION`.
- **A call with no `userId` fails CLOSED for a paid provider and OPEN for a
  local one.** An unattributable frontier call is unbounded liability; refusing a
  model on the operator's own hardware would take the product down for no gain.
- **`hold.clamped` must reach the user.** It lands on
  `LlmResponse.paygClamped`, on the assistant message metadata, and as a
  `StreamEventType.PAYG_CREDIT_CLAMPED` frame. A silently shortened reply reads
  as the model being bad rather than the wallet being empty.

**Compare is all-or-nothing (E2).** `ParallelExecutionManager.reserveAllLanes`
funds every lane before any provider is called and releases every hold already
taken if one does not fit, raising `PAYG_COMPARE_CREDIT_INSUFFICIENT`. A
comparison with three error columns is not a comparison, and the user has still
paid for the two that ran.

**A coding-agent run PAUSES on exhaustion (E6).** `runtimeV2TerminalStatus`
returns `'paused'` for a 402 and `'failed'` for everything else, so the journal,
the tool receipts and the context survive under the run's TTL and topping up
resumes work instead of repeating and re-paying for it. Only an exhausted wallet
qualifies — dressing any other fault as a pause advertises a resume that cannot
work.

**Cached and reasoning tokens are load-bearing now.** `TokenUsage` carries
`cachedPromptTokens` and `reasoningTokens`, `buildTokenUsageFields` puts both on
every `LlmResponse`, and `ProviderStreamReader` reads them off the SSE usage
frame through the shared `@claw/shared-utilities` guards (including DeepSeek's
top-level `prompt_cache_hit_tokens`). Finalizing them as zero bills a reasoning
model at nothing on its single most expensive component.

**`POST /internal/chat/generate` now REQUIRES `userId` and `surface`.** It is a
deliberate breaking change: workspace-service's AI actions, multi-model review,
chain drafting and implementation handoff all spend real provider money through
`generateOnce`, and every one of those calls used to be anonymous and free
(audit U1, U8–U10, U12). An optional `userId` would have been omitted by exactly
the callers that most need it. The response carries `clamped` so the calling
service can tell its own user why the answer is short.

## AI-written files: format and writer prompt (ADR-108, 2026-09-19)

- `detectRequestedFileFormat` (utilities/file-format.utility.ts) decides the
  file format by whole words; a format after "as/to/into/in" wins. Never go
  back to substring checks: "password" became a Word file.
- The file writer's system prompt is `fileWriterSystemPrompt(format)`. Rich
  formats are Markdown, which file-generation renders (ADR-107). Never ask the
  writer for raw HTML, because it is escaped there.
- `unwrapWholeCodeFence` removes a fence only when the whole answer is one
  fence, and never for ZIP. The old regex kept only the first code block of
  any file.

## AI-file allowance (ADR-110)

- `callFileGenerationService` reserves `FILE_GENERATION` before the model
  writes anything. It consumes once the file is queued and releases on any
  failure.
- A refusal returns `fileLimitResponse`, which becomes
  `metadata.type='file_limit'` on the message. Never throw it: the send
  already returned 201.
- `reserveFeature` fails open when auth-service is unreachable. That is
  deliberate: a plan limit is a business rule, not security.

## Who writes the file, per mode (ADR-119)

- routing-service sends `fileWriter` on a MANUAL_MODEL FILE_GENERATION
  decision. `parseFileWriter` reads it off `message.routed`, and
  `resolveExecutionOptions` turns it into `ExecutionOptions.fileWriters`
  (`fileWriterOptionsFor`).
- Writer order (`toFileContentCandidates`): the user's pick, then the admin
  `FILE_WRITER` list, then local file models. LOCAL_ONLY / PRIVACY_FIRST keep
  local models only; the `FILE_WRITER` list is hosted.
- "another" / "one more" after a file re-routes in MANUAL_MODEL too and keeps
  the pick as writer (`rerouteFileFollowUp`).

## What a file writer sees (ADR-111)

- CSV and JSON writers get no INSTRUCTION memories (`fileWriterMemories`,
  `DATA_FILE_FORMATS`). A saved "end every reply with X" put X after the data
  in 33 of 37 broken CSVs.
- CSV is asked for as a Markdown table. file-generation quotes the cells.
- Measure any change to `fileWriterSystemPrompt` with
  `skills/run-the-file-model-matrix.md`.

## ThreadOrigin

`ChatThread.origin` separates the VS Code coding agent's runs from the user's
own conversations. Both clients are the same user on the same endpoints, so
without it they were one list.

`WEB` is the default everywhere — on the column, in `createThreadSchema`, and
in `listThreadsQuerySchema`. That last one is load-bearing: a thread list that
did not narrow by origin would show agent runs in the web app again.

Reads for the agent's conversations live in `modules/coding-agent-chats`, which
is read-only by construction — no create, update or delete exists to be called.
Full rationale: `docs/04-backend/service-guide-chat.md`.

## What a coding-agent run is allowed to know

Runtime V2 runs assemble their context through the same `ContextAssemblyManager`
as ordinary chat, but for a long time they passed it less. Three arguments were
missing, and each was invisible rather than broken:

- **`useCrossThreadContext`.** The loop passed `{ maxTokens }` as its whole
  thread settings, so the flag arrived `undefined` and the assembler's
  `=== true` test made it false. The same account got "use relevant previous
  chats" in chat and silently not in the agent.
- **`fileIds`.** Passed as `undefined`, so an image or document dropped into an
  agent thread was never analysed, while the same file worked in chat.
- **`maxTokens` was the wrong number entirely.** Since ADR-086 it is the ANSWER
  length and feeds `reservedOutputTokens` alone. The loop passed the 96,000
  context budget, which `resolveModelTokenBudget` clamps to its 32,768 ceiling
  — so every turn reserved 32,768 tokens for what is usually a single tool
  call, and on a 32k-window model took half the window from the history and
  attachments the budget exists to protect.

All three now come from `helpers/runtime-thread-context.helper.ts`. If you add
an argument to `assemble`, add it here too: this file is the one place a
coding-agent run differs from a chat turn, and a difference here is a feature
that works in one surface and not the other.

## Two shapes of a silent stop

A run that ends with work undone but reports success is the failure this
service fights hardest, and it arrives in two opposite shapes:

- **An announcement.** "I'll start by listing the workspace." The model says
  what it is _about_ to do and stops. `isUnfulfilledIntent` catches it.
- **A hollow completion.** `DONE`. The model says it has _already_ done it,
  having called no tool. `isHollowCompletion` catches it, and only on the first
  turn — after a tool has run, "done" is ordinary and usually true.

Both route into `nudgeIntoActing`, which asks again and refuses to accept the
same shape twice. The predicate that judged the original turn is passed in, so
the correction loop rejects the shape it was called about rather than a fixed
one.

The hollow-completion test that matters is the false-positive set: "Done. The
file already contained the value." explains itself and must pass through. Only
a claim with nothing after it is hollow.

## An agent run can carry attachments

`runtimeStartSchema` accepts an optional `fileIds`, and the run stores them on
the user message it creates, under `metadata.fileIds` — the same place every
other surface looks. That is deliberate: the context assembler already reads
attachments off the latest user message, so there is one lookup path rather
than a second one to keep in step with chat's.

Before this the schema was `.strict()` with no such field, so the extension
could not send attachments at all and fell back to the legacy chat path
whenever a file was present. A user who attached a file silently lost the
agent's tools; a user who asked about the same file conversationally did not,
because that path posts an ordinary chat message.

The ceiling is `RUNTIME_V2_MAX_FILE_IDS`. Each id is looked up and its
extracted text assembled into the prompt, so an unbounded list is an unbounded
context cost chosen by the client.

## One gateway decides what a model sees

`ChatContextGatewayManager.build()` is the only supported way to assemble
context. It takes an options object (`ChatContextRequest`) and returns the
conversation, memories, attachments, cross-thread material, research evidence,
the resolved context window and the thread settings.

It exists because context was a thing each caller remembered to fetch: Compare,
Consensus and Escalation carried a byte-for-byte copy of the same builder, the
seven lab modes sent the user's raw string with no context at all, the judge
replaced the conversation with one synthetic message, and the coding agent
passed `undefined` for attachments because the arguments are positional.

Two rules carry the weight:

- **A persona is appended to the system prompt, never substituted for it.**
  Substituting is how the judge lost the user's own instructions.
- **Pass `provider` and `model`.** Without them the budget falls back to a
  conservative window and throws away history a large model had room for.

Runbook: [`skills/give-a-surface-the-same-context-as-chat.md`](../../skills/give-a-surface-the-same-context-as-chat.md).

## Compare's judge is ONE comparative call, not one per lane (ADR-116, 2026-09-23)

`ParallelExecutionManager` no longer calls `JudgeRefereeManager.evaluate` once
per lane. That referee is designed for single-answer review and reusing it per
lane meant every score was calibrated against nothing but the answer in front
of it — two lanes' numbers were never comparable, and the "best" badge was
whichever per-lane call happened to be more generous.

`CompareJudgeManager.judge()` now makes **exactly one** judge call per Compare
run, ranking every completed lane together:

- Lanes are anonymised A, B, C… in a **seeded shuffle**
  (`buildLaneShuffle(runId, laneIndices)` — SHA-256-driven Fisher-Yates, not
  `Math.random()`), recorded on the verdict so a label unshuffles back to its
  lane. This defends against a judge's documented preference for
  early-presented candidates.
- The judge returns one JSON object — `{ ranking, scores, rationale }` on a
  shared 0-10 scale — parsed by `parseCompareJudgeOutput` against a strict
  schema **and** cross-field invariants (every label exactly once, ranking
  never contradicts scores). A parse failure, a call failure, or fewer than
  two completed lanes all produce `CompareJudgeVerdictStatus.UNAVAILABLE` /
  `SKIPPED` with `winnerLaneIndex: null` — **never** a fake winner.
- A tie for first place leaves `winnerLaneIndex: null` and lists every tied
  lane in `tiedLaneIndices`, with a shared competition rank (`1, 1, 3`).
- Answers are shortened fairly (`fitAnswersFairly` — max-min water-filling, not
  a flat percentage cut) to fit the judge's own context window
  (`computeAnswerBudgetChars`), and the prompt tells the judge exactly which
  candidates were shortened.
- The call goes through `ModeExecutionGatewayManager.run` →
  `ChatExecutionManager.callProvider` — the same chokepoint every mode uses —
  as `TokenLedgerContext.JUDGE` / `PAYG_WORKFLOW_COMPARE_JUDGE`, with
  `requestId = ${runId}:compare-judge`: **one hold per Compare run**, never one
  per lane.
- The single-lane critic still runs once per lane when the user enables it
  (`JudgeRefereeManager.critiqueLane`), and its notes feed the one judge call —
  but its **score is dropped** before reaching the judge, since a per-lane
  score is exactly the uncalibrated number this exists to stop comparing.

The verdict (`CompareJudgeVerdict`) is stamped identically on every
`ParallelModelResponse` of the run, plus that lane's own `compareLaneIndex`.
`CompareJudgeState.RANKED` is the new badge state on the frontend; a lane that
did not complete is always `SKIPPED` regardless of the verdict.

`JudgeRefereeManager.evaluate` is unchanged and keeps serving every other mode
(chat, consensus, escalation). See
[ADR-116](../../docs/13-adr/adr-114-comparative-judge-for-compare.md).

## Orchestration lanes now get the same web-grounding defences as chat (ADR-118, 2026-09-23)

Compare, Consensus and Escalation never call `ContextAssemblyManager.assemble()`
with a research option — they merge `ResearchEnricherManager`'s evidence into
`context.systemPrompt` as prose, once, before fan-out. Until this fix that
merge never told `ContextAssemblyManager` a run had evidence at all, so the
final-user-turn grounding reminder (`RESEARCH_GROUNDING_REMINDER` — proven
necessary for small local models on 2026-09-11, see rule 41 §11) silently
never reached these three modes. A user asked Consensus to crawl a real
pricing page; one lane honestly reported no evidence, another (an Ollama
model with only a system-message evidence block, no reminder) fabricated a
detailed pricing table with fake citation URLs and zero `[n]` markers, and
the synthesis step copied the fabrication verbatim.

- **`injectResearchEvidenceIntoContext`** (`utilities/research-prompt.utility.ts`)
  replaces the three near-identical `applyResearchToContext`/
  `injectResearchIntoContext` copies that used to live in
  `ConsensusExecutionManager`, `EscalationChainManager` and
  `ParallelExecutionManager`. It merges evidence into `systemPrompt` exactly
  as before, and sets `AssembledContext.researchGroundingInjected = true`
  when it did. Use this for any future orchestration mode that shows a model
  web evidence — never write a fourth copy.
- **`ContextAssemblyManager.hasResearchGrounding`** now also fires on
  `researchGroundingInjected`, so the final-user-turn reminder reaches these
  three modes through the exact `buildChatMessages`/`buildGeminiChatMessages`/
  `buildPromptString` path every provider call already goes through. The flag
  deliberately does NOT feed `formatResearchBlock`'s own trigger — that would
  print a second, contradictory "NO usable web evidence" block over real
  prose evidence already sitting in `systemPrompt`.
- **`RESEARCH_GROUNDING_NO_INVENT_INSTRUCTION`** (`constants/research-grounding.constants.ts`)
  is now emitted by both evidence-block builders'
  always-present preamble — `ContextAssemblyManager.formatResearchBlock`
  (single chat) and `ResearchEnricherManager.buildEvidenceBlock` (every
  orchestration mode, including the 7 lab modes) — not only their
  empty-evidence branches.
- **`ConsensusExecutionManager.selectBestResponse`** prefers the completed
  response with the most `[n]` citation markers over the longest response,
  but only when the run actually had research evidence
  (`hasResearchEvidence`, threaded through `synthesize` →
  `runOllamaSynthesis`/`buildHeuristicSynthesis`/`buildSynthesisResult`). An
  uncited run (no web question, or neither lane cited anything) keeps the
  pre-existing longest-response fallback unchanged. The LLM synthesis prompt
  also gets one instruction, added only when evidence existed, telling it not
  to prefer a confident uncited answer over an honest "no evidence" one.

This is a bounded fabrication guard, not fact-checking — a model can still
cite `[n]` next to a wrong number. It stops the specific laundering behaviour
observed: length rewarding invention over honesty. See
[ADR-118](../../docs/13-adr/adr-118-orchestration-lanes-share-grounding-not-just-evidence.md),
[rule 41 §14](../../rules/41-web-evidence-truthfulness.md), and
[the runbook](../../docs/11-runbooks/runbook-fabricated-web-facts.md).

### The 7 lab modes closed the same gap (ADR-118, 2026-09-24 update)

By the time of this update, a separate migration had already moved all 7 lab
modes (repair, decompose, best-of-n, cost-ensemble, verifier, pipeline,
role-pack) off raw-string posts to `/api/v1/ollama/generate` and onto
`ChatContextGatewayManager.build()` + `ModeExecutionGatewayManager.run()` →
`ChatExecutionManager.callProvider` — the same chokepoint chat, compare,
consensus and escalation use. **All 10 orchestration surfaces now share one
prompt-assembly path**, branching only on provider (turn-based messages for a
cloud provider, `buildPromptString` for local Ollama — never on mode).

That migration alone did not close ADR-118's gap: each of the 7 called
`ResearchEnricherManager.enrichForOrchestration` and handed the result to
`ChatContextGatewayManager.build()` as `personaInstruction` — the generic
field that just concatenates into `systemPrompt` with no grounding flag, the
exact pre-fix shape this ADR describes for compare/consensus/escalation.
`hasResearchGrounding` returned `false` for all 7, and the final-user-turn
reminder silently never fired.

- **`ChatContextRequest.researchEvidenceInstruction`** is a new field,
  separate from `personaInstruction`, that `ChatContextGatewayManager.build()`
  routes through `injectResearchEvidenceIntoContext` before applying any
  `personaInstruction` — so evidence is prepended and
  `researchGroundingInjected` is set exactly as it is for the three lanes.
- Each of the 7 managers now passes `researchEvidenceInstruction:
enrichment.systemPrompt` at its one `chatContextGateway.build()` call site.
  Their mode-specific personas (the repair rubric, the planner instruction,
  each role-pack member's persona, each pipeline stage's instruction) are
  unchanged — still applied AFTER the evidence merge, via each manager's own
  local `withPersona`.
- The now-dead `prependResearchEvidence(prompt, evidence)` string helper was
  removed from `research-prompt.utility.ts` along with its test — nothing
  called it once all 7 moved off raw strings.

See rule 41 item 15 and the `## Update — 2026-09-24` section of ADR-118.
