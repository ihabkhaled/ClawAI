# Claw Image Service - Development Rules

## Service Overview

Image generation microservice for the Claw platform. Orchestrates image generation across cloud providers (OpenAI `gpt-image-1`, Gemini, xAI Grok) and local Stable Diffusion. Runs on port 4012 with its own PostgreSQL database (claw_images).

## Ownership and auth invariants (2026-09-25 — read before adding a route)

1. **Every user-facing `:id` route checks ownership in the service and answers a
   stranger with the SAME 404 as a missing id** (`IMAGE_NOT_FOUND`,
   `HttpStatus.NOT_FOUND` — no existence leak). Use `getByIdForUser`,
   `retryGenerationForUser`, `retryWithAlternateModelForUser`. The trusting
   `getById` / `retryGeneration` / `retryWithAlternateModel` are for the
   service-token lane only. `POST /images/:id/retry(-alternate)` once called the
   trusting ones, so any user could re-run and bill anyone's job.
2. **`GET /images/:id/events` (SSE) is authenticated and guarded by
   `ImageGenerationOwnerGuard`** (`modules/image-generation/guards/`). Owner
   checks for SSE go in a guard, never the handler: by the time an `@Sse`
   handler runs, Nest has sent 200. Never mark it `@Public()` again. The
   frontend opens it with `connectSse` (Bearer header), not `new EventSource`.
3. **`/internal/images/*` is `@UseGuards(ServiceTokenGuard)`**
   (`src/app/guards/service-token.guard.ts`, constant-time compare against
   `INTER_SERVICE_AUTH_TOKEN`). `@Public()` on those routes only skips the
   user-JWT guard. Callers (chat-service `callImageService`) must send
   `Authorization: buildInterServiceAuthHeader()`.
4. **OpenAI image model is `gpt-image-1`, not `dall-e-3`** (retired). Keep
   `IMAGE_MODEL_OPENAI` here, routing-service's `IMAGE_MODEL_OPENAI`, and the
   frontend `IMAGE_MODEL_OPTIONS` / `IMAGE_CAPABILITIES` in step.

5. **An OpenAI image is metered per IMAGE, not per token** (rule 37 item 17).
   `reserveImageHold` sends `imageUnits: IMAGE_PAYG_IMAGES_PER_REQUEST` (1 — the
   adapter hard-codes `n: 1`); settlement sends the images actually
   returned (`countReturnedImages`, via `imageSettlement`). OpenAI's `/images/generations` reports no
   usage, so a zero-token finalize settled every OpenAI image at $0 until
   2026-09-25. Gemini still settles on its `usageMetadata` tokens (its rows have
   no per-image rate). One hold per paid call; a provider throw releases it.
   **The hold settles only after the image is persisted (2026-09-25).**
   `execute` returns the hold OPEN as `result.settlement` (units measured from
   the provider response). `ImageGenerationService` writes the asset row, then
   calls `ImageExecutionManager.settle`. A failed `storeImage` (inside
   `execute`) or a failed asset row (`persistAsset`) calls
   `releaseUnpersisted` instead (wire reason `CANCELLED`; auth's release DTO
   has no STORE_FAILED) and the row fails as `IMAGE_STORAGE_FAILED`, which is
   chain-terminal, so AUTO spawns no paid fallback. The user never pays for an
   image that was not saved; the platform absorbs the provider cost. Log:
   `imageSettlement reservationId=<id> outcome=FINALIZED|RELEASED reason=STORE_FAILED`.
   Local providers carry no settlement; both calls are no-ops.
   gpt-image-1 is metered on a SIZED price row (see "Size-aware gpt-image
   pricing" below). dall-e-3 is metered by QUALITY since routing seed v9
   (see "dall-e-3 quality pricing" below) — HD is no longer charged the
   standard price.

6. **Image generation and edit are a paid plan feature** (ADR-122).
   `ImagePlanGateManager.assertCanGenerate(userId)` runs FIRST in
   `enqueueGeneration`, `retryGeneration` and `retryWithAlternateModel` (the
   `…ForUser` variants call these) — before a row, a PAYG hold or a provider
   call. Plan without `allowImageGeneration` → `403 PLAN_FEATURE_DISABLED`
   (chat-service's code/message). Fails CLOSED: auth-service unreachable →
   `503 ENTITLEMENTS_UNAVAILABLE`; `PLAN_TRIAL_EXPIRED` passes through. ADMIN
   bypasses. A new generation entry point must call it too.

7. **A job that moves to a new row links to it** (batch 10a). AUTO fallback and
   retry-alternate create the successor ONLY through
   `ImageGenerationRepository.createSuccessor` (one transaction: new row +
   `predecessor.supersededById` + REFERENCE asset copy). The AUTO chain spawns
   the successor BEFORE publishing FAILED, so that event carries
   `supersededById`. Only a chain head may be retried (409,
   `IMAGE_GENERATION_SUPERSEDED`). `GET /images/:id` returns `latest`, walking at
   most `IMAGE_SUPERSESSION_MAX_HOPS` links, owner-checked every hop; a foreign
   or missing link ends the walk and reads as `null`. Supersession never takes
   a PAYG hold — one hold per attempt, as before.

8. **A reference image is stored as a file-service id, never bytes** (batch
   10a). chat-service sends `referenceFileId` with the base64; it becomes an
   `ImageGenerationAsset` with `role = REFERENCE`. Retries read it back through
   `ImageExecutionManager.loadStoredReference` (owner-checked by file-service);
   an unreadable reference fails `IMAGE_REFERENCE_UNAVAILABLE` rather than
   silently generating without it. Response reads include OUTPUT assets only
   (`IMAGE_OUTPUT_ASSETS_INCLUDE`).

Details: [`docs/04-backend/service-guide-image.md`](../../docs/04-backend/service-guide-image.md#ownership-and-auth-invariants-2026-09-25) · [`rules/16`](../../rules/16-authentication-and-authorization.md) items 6–7.

## Cancellation (`POST /images/:id/cancel`, 2026-09-25)

Owner only (`cancelGenerationForUser`, same 404 as a missing id), always 200
`{ generationId, status }` = status after the call; idempotent (terminal rows
are a NOOP returning their status, never 409).

1. **CANCELLED is absorbing.** `repository.updateStatus` is a conditional
   `updateMany … status <> CANCELLED` returning `null` on no match. Every job
   write (STARTING, GENERATING, FINALIZING, COMPLETED, FAILED) goes through it;
   `null` → `discardCancelled` (no asset, no settle, no FAILED, no AUTO
   successor, no bus event). The cancel itself is `cancelIfActive`
   (`status IN IMAGE_ACTIVE_STATUSES`). DB row = shared store → replica-safe.
2. **Money:** `ExecuteImageInput.isCancelled` is checked before the provider
   call and right after it — a cancelled result is dropped BEFORE file-service
   stores it and the hold goes back via `releaseCancelled` (reason `CANCELLED`,
   log `reason=USER_CANCELLED`). COMPLETED is written BEFORE `settle`, so a
   late cancel either wins (released, asset row deleted) or loses (COMPLETED,
   finalized, cancel returns COMPLETED). Never finalize a cancelled attempt.
3. **Upstream: never stop another user's job.** `requestProviderCancel`
   sends ONLY a targeted ComfyUI `POST /interrupt { prompt_id }`, and only
   when this process holds this generation's prompt id (in-process
   `comfyPromptIds`, set on `onPromptAccepted`, cleared when the call
   settles) → `providerCancel=requested`. Unknown id (other replica, not yet
   accepted, already settled) → no call. SD WebUI `/sdapi/v1/interrupt` has no
   job target and nothing proves ours is the running job (SD calls are not
   serialized, no job id) → **never called**. Cloud has no cancel. Every
   no-call case logs `providerCancel=unsupported` and discards only.
4. **Retry of a CANCELLED row creates a successor** (same provider/model);
   the cancelled row is never re-queued, because its abandoned call may still
   return.
5. **No `image.failed` on cancel** — no service consumes image.failed /
   image.generated today; CANCELLED goes to SSE + `image_generation_events`.
6. Log: `imageCancel generationId=… fromStatus=… outcome=CANCELLED|NOOP|DISCARDED holdReleased=… providerCancel=…`.

Orphan cleanup: when the image was already stored and the cancel then wins
(FINALIZING or COMPLETED write refused), `discardStoredImage` deletes it via
file-service `DELETE /api/v1/internal/files/:id?userId=` (service token, owner
checked, 404 = deleted), bounded by `IMAGE_ORPHAN_DELETE_TIMEOUT_MS`,
best-effort (logs `imageOrphanCleanup … outcome=DELETED|FAILED`, never throws),
then the hold is released.

**One replica in production (verified 2026-09-26).** `docker/docker-compose.prod.services.yml`
gives `image-service` a fixed `container_name: claw-image-service` and no
`deploy.replicas`, so Docker cannot scale it (only chat-service scales, via
`CHAT_SERVICE_REPLICAS`). The cancel SSE event and the in-process ComfyUI
prompt-id map are therefore always on the replica that wrote them; the
"other replica" cases above only matter if image-service is ever scaled — then
drop `container_name`, move `comfyPromptIds` to Redis and fan the SSE event out
over Redis pub/sub first.

Gaps: a FAILED orphan delete is logged, not retried; SD
WebUI and cross-replica ComfyUI runs keep computing upstream (discard only);
frontend button not wired. Details:
[`service-guide-image.md`](../../docs/04-backend/service-guide-image.md#cancellation-post-imagesidcancel-2026-09-25).

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode enabled)
- **Database**: PostgreSQL with Prisma ORM (claw_images database, port 5448)
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

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly.

## Architecture

```
Controller -> Service -> Repository
                      -> ImageExecutionManager -> Adapters (OpenAI, Gemini, SD)
```

## Owned Tables

- ImageGeneration

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
./scripts/claw.sh stop image-service
./scripts/claw.sh rm -f image-service
docker rmi claw-image-service
./scripts/claw.sh up -d --build image-service
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

## Runtime-progress adapters (PR3 + PR4 — shipped 2026-05-31)

> **Wiring status (batch 10a, 2026-09-25).** Until 10a neither adapter reached
> a user: ComfyUI's `onEvent` was `() => {}` and the SD WebUI adapter had no
> caller. Now `ExecuteImageInput.onProgress` carries both into the existing
> per-generation SSE stream: ComfyUI forwards every envelope, and
> `ImageExecutionManager.observeSdProgress` polls SD WebUI (bounded: stops when
> txt2img settles, `CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS`, error cap, late
> envelopes dropped). `ImageGenerationService.publishProgress` sends
> `runtimeProgress` = `toImageProgressSnapshot(event)` — stage + reported
> steps/elapsed, percent only at `EXACT` / `RUNTIME_REPORTED`. The chat card
> shows it via `ImageLoadingState` (`chat.imageStage.*`, `aria-live="polite"`).
> `ImageGenerationProgressPanel` / `ComfyUINodeTimeline` below are still NOT
> rendered by the chat image card. Cancel IS wired to a route since
> 2026-09-25 (`POST /images/:id/cancel`, see "Cancellation" above); the
> frontend panels' Cancel buttons are not.

This service hosts the two image-runtime adapters that emit
`ClawRuntimeProgressEvent` envelopes for in-flight image generation jobs.
Both adapters publish over the existing in-process SSE channel; durable
RabbitMQ publishing of the declared `runtime.progress.*` patterns is on
the future-work backlog and is NOT live in this service yet.

### Stable Diffusion WebUI adapter (PR3)

Location:
`src/modules/runtime-progress/adapters/stable-diffusion-webui-progress.adapter.ts`.

- **Wire format**: synchronous `POST /sdapi/v1/txt2img` for the actual job;
  background polling of `GET /sdapi/v1/progress` (optionally with
  `skip_current_image=true` when previews are disabled).
- **Cancel endpoint**: `POST /sdapi/v1/interrupt` exists on
  `adapter.cancel()` but is **never called** by the user-cancel route: it has
  no job target, so on a shared runtime it could stop another user's job
  (see "Cancellation").
- **Emitted events**: `STEP_PROGRESS` (per poll, with `currentStep` /
  `totalSteps` / `progressPercent` / `eta` derived from the
  `/sdapi/v1/progress` response), `ARTIFACT_SAVED` on completion, and the
  standard `LIFECYCLE` / `METRICS` siblings.
- **Env vars** (defined in `src/app/config/app.config.ts`):
  - `CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS` — default `1000`, minimum `300`
    (Zod-enforced floor; lower values would thrash the runtime).
  - `CLAW_IMAGE_PROGRESS_PREVIEW_ENABLED` — default `false`. When `true`,
    the adapter drops `skip_current_image=true` and the `current_image`
    base64 frame flows through. Caller is responsible for the 64 KB cap
    per `docs/03-architecture/runtime-progress.md` §10.1.
- **Constants**: `SD_PROGRESS_POLL_DEFAULT_INTERVAL_MS`,
  `SD_PROGRESS_POLL_MIN_INTERVAL_MS`, `SD_PROGRESS_HTTP_TIMEOUT_MS`,
  `SD_INTERRUPT_HTTP_TIMEOUT_MS`, `SD_PROGRESS_MAX_CONSECUTIVE_ERRORS` in
  `src/modules/runtime-progress/constants/sd-webui-progress.constants.ts`.

### ComfyUI adapter (PR4)

Location: `src/modules/runtime-progress/adapters/comfyui-progress.adapter.ts`.

- **Wire format**: `POST /prompt` (workflow submission), then consume
  `/ws?clientId=…` WebSocket frames (`status`, `executing`, `progress`,
  `executed`, `execution_cached`, `execution_error`); finalize with
  `GET /history/:promptId` to resolve the output artifact node.
- **Cancel endpoint**: `adapter.cancel(baseUrl, promptId)` = TARGETED
  `POST /interrupt { prompt_id }` (the only form; used by the user-cancel
  route). Older note, superseded: `DELETE /queue` (documented mechanism — wiring is
  in place; live confirmation deferred to a follow-up probe).
- **Emitted events**: `EXECUTING_NODE` / `NODE_PROGRESS` / `NODE_COMPLETED`
  (with `nodeId` + `nodeName` resolved via
  `workflows/comfyui-workflow-node.mapper.ts`), `ARTIFACT_SAVED`,
  standard `LIFECYCLE` / `METRICS` siblings, and `ERROR` with
  classified `errorType` on workflow validation failures.
- **Workflow templates**: `workflows/sd15-minimal.workflow.ts` is the
  baseline SD-1.5 graph. New templates land in the same directory and are
  loaded by id; the node mapper is shared.
- **Env var** (defined in `src/app/config/app.config.ts`):
  - `COMFYUI_BASE_URL` — default `http://comfyui:8188`. The WebSocket URL
    is derived from this base (`ws://` / `wss://` schema swap).
- **Constants**: `COMFYUI_HTTP_TIMEOUT_MS`, `COMFYUI_WS_PING_INTERVAL_MS`,
  the WS event-type tag set, and node-mapper defaults in
  `src/modules/runtime-progress/constants/comfyui.constants.ts`.

### Cancel-endpoint pattern (both adapters)

Both adapters expose an `adapter.cancel(session)` method. The chat-service
caller invokes it when the user hits Cancel on
`ImageGenerationProgressPanel` (SD WebUI) or `ComfyUINodeTimeline` (ComfyUI),
or when the parent `AbortController` aborts. The cancel call fires the
runtime-specific HTTP request above; the adapter then emits a `CANCELLED`
lifecycle event and closes the session.

### Frontend surfaces wired to these adapters

- `apps/claw-frontend/src/components/chat/runtime-progress/ImageGenerationProgressPanel.tsx`
  (SD WebUI step bar + ETA + Cancel button)
- `apps/claw-frontend/src/components/chat/runtime-progress/ComfyUINodeTimeline.tsx`
  (per-node card with mapper-resolved names + elapsed time)

Full architecture: [`docs/03-architecture/runtime-progress.md`](../../docs/03-architecture/runtime-progress.md).

## Inter-service auth for file-service internal endpoints

`claw-file-service`'s `/api/v1/internal/files/*` routes (`store-image`, `:id/content`, `:id/chunks`, `download/:id`, `upload-internal`, `download-internal`, `metadata-internal`) are guarded by `ServiceTokenGuard`. Every call from this service to those routes — currently `storeImage()` in `image-execution.manager.ts` — MUST send `Authorization: Service <token>` where `<token>` is the value of `INTER_SERVICE_AUTH_TOKEN` (the single shared secret in root `.env` — do NOT introduce a per-service variant).

Use the wrapper:

```ts
import { buildInterServiceAuthHeader, httpPost } from '@common/utilities';

await httpPost(`${config.FILE_SERVICE_URL}/api/v1/internal/files/store-image`, body, {
  timeout: 30_000,
  headers: { Authorization: buildInterServiceAuthHeader() },
});
```

The wrapper lives at `src/common/utilities/inter-service-auth.utility.ts` and reads `AppConfig.get().INTER_SERVICE_AUTH_TOKEN`. Mirrors the pattern in `apps/claw-workspace-service/src/common/utilities/file-service-client.utility.ts#buildAuthHeader`. Forgetting the header will manifest as `401 Service token required` from file-service; image generation will succeed at the provider but fail to persist, leaving the user with an error and no asset.

## PAYG credit metering (C4 — U3/U4)

Every OpenAI, Gemini and xAI Grok image generation is metered. Local Stable Diffusion and
ComfyUI are not — they run on hardware the operator already owns.

| Where                                  | What                                                                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.module.ts`                        | `EntitlementsModule.forRoot({ authServiceUrl: AppConfig.get().AUTH_SERVICE_URL })` — `@Global()`, provides `PaygMeter` by CLASS token                                  |
| `managers/image-execution.manager.ts`  | `callMeteredCloudProvider` — the single chokepoint. `reserve` → provider → OPEN hold (`release` on throw); `settle` / `releaseUnpersisted` after the store             |
| `constants/image-payg.constants.ts`    | the reservation ceiling, the prompt-token figure, and the credit failure codes                                                                                         |
| `utilities/image-failure.utility.ts`   | tells a wallet refusal apart from a provider error so the stored row can say which                                                                                     |
| `services/image-generation.service.ts` | mints a per-attempt `requestId`, stores the credit reason, latches the fallback chain to local-only after a refusal; settles only after the asset row (`persistAsset`) |

**Five things that will bite you here.**

1. **`hold.maxOutputTokens` is never sent to an image API.** Neither
   `POST /images/generations` nor `:generateContent` takes a max-output-token
   argument, so the affordability clamp (D6) can only size the hold on this
   surface — it cannot physically bound the response the way it does for text.
2. **`requestId` is per ATTEMPT, not per generation row.** `reserve` is
   idempotent on `(userId, requestId)`; reusing the row id would make
   `POST /images/:id/retry` settle a second real provider call against the first
   attempt's hold. `processJob` mints `${generationId}:${randomUUID()}`.
3. **Meter with the CONNECTOR provider name, not the internal tag.**
   `mapToConnectorProvider` turns `IMAGE_GEMINI` into `GEMINI`. Sending
   `IMAGE_GEMINI` would classify as an unknown provider in auth-service.
4. **A credit refusal has to land in the row.** The job is fire-and-forget
   (`void this.processJobWithFallback(…)`), so there is no HTTP response left to
   carry a 402. `handleProcessJobFailure` stores the `BillingErrorCode` and a
   credit-specific message, and publishes both over SSE.
5. **The auto-fallback chain latches to local after a refusal (E3 + D4).** Each
   attempt is a separate paid call, so the chain must never bill N attempts
   against a wallet that could afford one. On a credit failure `paidBlocked`
   latches and `findNextFallback` returns only `IMAGE_LOCAL_PROVIDERS` entries —
   PAYG is blocked, local keeps working.

**Pricing gap closed (2026-09-25).** `calculateCostMicroUsd` now sums
`imageUnits x imagePerUnitMicroUsd` and auth accepts a per-unit-only row, so
OpenAI and Grok images bill per image and Gemini off its `usageMetadata`.

## Cloud providers and the connector-borrowing pattern (2026-09-23)

`IMAGE_OPENAI`, `IMAGE_GEMINI`, `IMAGE_GROK` are capabilities that borrow the
OPENAI/GEMINI/GROK chat connector's credentials at call time
(`IMAGE_PROVIDER_CONNECTORS` in `src/common/constants/image.constants.ts` →
`ImageExecutionManager.fetchConnectorConfig`). There is no separate image
connector row. Adding a fourth cloud provider means: an adapter under
`adapters/`, an entry in `IMAGE_PROVIDER_CONNECTORS`, a branch in
`dispatchCloudProvider`, and — separately, in chat-service — a pattern in
`IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR` so the connector's image-output
models get redirected here instead of hitting `/chat/completions`.

Every provider error is classified into an `ImageFailureCode` before it is
stored or streamed — see the failure-taxonomy table in
`docs/04-backend/service-guide-image.md`. Never throw a bare `Error` or
re-throw a provider's raw message from an adapter: use
`toImageProviderException(error, providerLabel)` for a caught provider error,
or `imageFailure(code, detail?)` for a failure this service decides on its own
(no image in the payload, storage failed). The stored/streamed sentence always
comes from `imageFailureMessage(code)`, never from the provider.

**Gemini specifics learned fixing "picking any image model always fails"
(2026-09-23):**

- The API key MUST be a header (`x-goog-api-key`), never `?key=` in the URL —
  the shared HTTP client logs request URLs.
- A catalog model id carries `models/` (`models/gemini-3-pro-image`); strip it
  with `normalizeGeminiModelId` before building the `:generateContent` path.
- `imagen-*` catalog entries 404 on `:generateContent` — Imagen is shut down in
  the Gemini API (Google's own docs: "Use Nano Banana for image generation").
  The candidate-fallback loop silently upgrades these to a working
  `gemini-*-image` model; it is not a bug if a user picks an Imagen model and
  gets a Nano Banana image.
- A safety block (`finishReason: 'IMAGE_SAFETY'`/`'SAFETY'`/… or
  `promptFeedback.blockReason`) must NOT fall through to the next candidate —
  every Gemini model refuses the same prompt, so retrying wastes 2 more calls
  and 2 more provider round trips before finally reporting the same refusal.

## gpt-image quality is pinned to the priced tier (2026-09-25)

`gpt-image*` is billed per image at the HIGH-quality 1024x1024 list price
(routing seed v4). `resolveOpenAiImageQuality` therefore always sends
`quality: 'high'` for that family — left to OpenAI's `auto`, or to a caller's
`low`, the call and the charge would disagree. dall-e keeps the caller's
quality (its seeded price is standard).

## Size-aware gpt-image pricing (2026-09-25)

**Decision:** one immutable `ModelCostVersion` row per priced size, keyed
`gpt-image-1@<width>x<height>` (routing model-cost seed **v7**:
`@1024x1024` $0.167, `@1024x1536` and `@1536x1024` $0.25, HIGH quality). No
price lives in this service (rule 37 item 13): `meteredImageModelKey`
(`utilities/image-price-key.utility.ts`) only picks WHICH row, and
`reserveImageHold` sends that key as the reservation's `model`. auth-service
prices the finalize from the same reservation, so reserve and finalize use the
same row. The OpenAI call itself still names `gpt-image-1`.

- A size not in `OPENAI_GPT_IMAGE_PRICED_SIZES` is metered on
  `OPENAI_GPT_IMAGE_WORST_CASE_SIZE` (1536x1024, the dearest row) — never an
  under-charge.
- Only models in `OPENAI_SIZE_PRICED_IMAGE_MODELS` (`gpt-image-1`) are sized;
  dall-e and Gemini keep their own rows.
- Rejected: a per-size multiplier constant in this service (a price in code)
  and a size column on `ModelCostVersion` (schema + migration + auth DTO change
  for one model).
- Deploy order: routing (seed v7 fills the three rows) BEFORE image-service, or
  every gpt-image-1 hold is `PAYG_MODEL_UNPRICED`.
- Tests: `image-price-key.utility.spec.ts`,
  `image-execution.manager.payg.spec.ts` (each size → its key; finalize settles
  the reserve's own hold).

## dall-e-3 quality pricing (2026-09-26)

**Decision:** dall-e-3 is metered on the row for the quality it is sent at
(routing model-cost seed **v9**): `hd` → `dall-e-3@hd` ($0.080), `standard` →
`dall-e-3` ($0.040, seed v4). An unrecognised quality → `dall-e-3@hd` (never
under-charge). Absent/empty quality → the base (standard) row, because
`generateWithOpenAI` omits `quality` when it is falsy and OpenAI's dall-e-3
default is `standard`. Values are the `DallE3Quality` enum; the model id is
`OPENAI_QUALITY_PRICED_IMAGE_MODEL`. gpt-image-1 is unaffected (quality pinned
`high`, priced by size).

- Deploy order: routing (seed v9) BEFORE image-service.
- Tests: `image-price-key.utility.spec.ts`,
  `image-execution.manager.payg.spec.ts` (hd / standard / unknown / absent).

## Grok per-image pricing (2026-09-25)

**Decision (owner):** xAI Grok Imagine is billed per image from routing
model-cost seed **v8**: `GROK:grok-imagine-image` $0.02 (1K and 2K),
`GROK:grok-imagine-image-2.0` $0.08 — its top tier (medium/2K), because
`generateWithXai` sends no quality or resolution. Source:
docs.x.ai/developers/models and docs.x.ai/developers/models/grok-imagine-image,
as of 2026-08-07.

- **Why it settled $0 before:** no row existed, routing's provider fallback
  priced the model at `grok-4`'s TOKEN rate, and xAI reports no tokens, so the
  `imageUnits: 1` finalize met a null per-image rate = $0.
- `meteredImageModelKey(provider, model, w, h)`: for `IMAGE_GROK`, a model in
  `GROK_PER_IMAGE_PRICED_MODELS` meters on its own row; any other Grok image
  model on `GROK_IMAGE_WORST_CASE_MODEL` (`grok-imagine-image-2.0`) — never the
  token fallback. The provider call still names the picked model.
- No row at all → auth refuses `PAYG_MODEL_UNPRICED` → 402 stored on the row.
- `usage.cost_in_usd_ticks` (1 tick = $1e-10) rides as `providerCostTicks` into
  the settlement log: `imageSettlement … heldMicroUsd=<ours> providerCostTicks=<xAI>`.
  Reconciliation only; never billed from.
- Deploy order: routing (seed v8) BEFORE image-service.
- Tests: `image-price-key.utility.spec.ts`,
  `image-execution.manager.grok-payg.spec.ts` (reserve imageUnits 1 on the
  grok row → 20,000 µUSD consumption; unknown model → 2.0 row; unpriced → 402),
  `provider-adapters.http.spec.ts` (ticks passthrough).

## `image.failed` carries `supersededById` (2026-09-25)

The RabbitMQ `image.failed` event is typed `ImageFailedPayload`
(`@claw/shared-types`) and now carries `supersededById` when an AUTO fallback
successor already exists (it is created before the failure is published), plus
`timestamp`. Optional and additive; no service consumes the event today.

## Media metrics (pack §67, 2026-09-26)

`ImageMediaMetricsService` (global `MetricsModule`, `GET /api/v1/metrics`, public,
internal only). `ImageGenerationService.processJob` records one sample per ATTEMPT:
`claw_image_generations_total{provider,outcome}` and
`claw_image_generation_duration_seconds{provider,outcome}`, outcome
`ImageGenerationMetricOutcome` — COMPLETED, FAILED, CANCELLED (before the provider,
or the result discarded after a cancel), SUPERSEDED (an AUTO attempt that failed and
spawned a successor). Provider label = the image provider list; anything else is
`other`. The service's metrics param is `@Optional()` so hand-built specs keep their shape.
