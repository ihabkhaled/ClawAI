# Service Guide: claw-image-service

## Overview

| Property    | Value                      |
| ----------- | -------------------------- |
| Port        | 4012                       |
| Database    | PostgreSQL (`claw_images`) |
| ORM         | Prisma 5.22                |
| Env prefix  | `IMAGE_`                   |
| Nginx route | `/api/v1/images`           |

The image service orchestrates AI image generation across multiple providers (OpenAI, Gemini, xAI Grok, Stable Diffusion). It manages the full lifecycle from prompt submission through generation to asset storage, with retry and fallback capabilities.

**A cloud provider is never its own connector.** `IMAGE_OPENAI`, `IMAGE_GEMINI` and `IMAGE_GROK` are capabilities, not connector deployments — each resolves its API key from the OPENAI/GEMINI/GROK chat connector at call time via `GET /internal/connectors/config?provider=<name>` on connector-service (see `IMAGE_PROVIDER_CONNECTORS` in `src/common/constants/image.constants.ts`). There is no separate image connector to configure.

**chat-service redirects image-output models before they ever reach here.** The connector catalog has no model kind for "this is an image model" — `models/gemini-3-pro-image`, `grok-imagine-image` and `chatgpt-image-latest` are ordinary `CHAT` rows under their connector, so the composer offers them there. chat-service's `resolveImageCapabilityProvider` (`apps/claw-chat-service/src/modules/chat-messages/utilities/image-generation-target.utility.ts`) matches the model id against a per-connector pattern and rewrites `selectedProvider` to `IMAGE_*` before dispatch — otherwise the request reaches `/chat/completions`, which every provider refuses for an image model (xAI: `"grok-imagine-image is an image model and is therefore not available on this endpoint"`).

## Database Schema

### ImageGeneration

| Column             | Type                  | Notes                                                                                      |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------ |
| id                 | String                | CUID primary key                                                                           |
| userId             | String                | Requesting user                                                                            |
| threadId           | String?               | Associated chat thread                                                                     |
| userMessageId      | String?               | Triggering user message                                                                    |
| assistantMessageId | String?               | Response message ID                                                                        |
| prompt             | String                | User's image prompt                                                                        |
| revisedPrompt      | String?               | Provider-revised prompt                                                                    |
| provider           | String                | IMAGE_OPENAI, IMAGE_GEMINI, IMAGE_LOCAL                                                    |
| model              | String                | gpt-image-1, gemini-2.5-flash-image, sdxl-turbo (older rows may hold the retired dall-e-3) |
| width              | Int                   | Default 1024                                                                               |
| height             | Int                   | Default 1024                                                                               |
| quality            | String?               | Provider-specific quality                                                                  |
| style              | String?               | Provider-specific style                                                                    |
| status             | ImageGenerationStatus | QUEUED through COMPLETED/FAILED                                                            |
| errorCode          | String?               | Error identifier                                                                           |
| errorMessage       | String?               | Human-readable error                                                                       |
| latencyMs          | Int?                  | Generation time                                                                            |
| supersededById     | String? (indexed)     | Row that took this job over (AUTO fallback or retry-alternate); null on a chain head       |

`threadId` / `userMessageId` are filled from chat-service's dispatch since
2026-09-25 (batch 10a); they were always null before. `assistantMessageId`
stays null from chat: the assistant message is stored from the generate call's
own answer, so its id does not exist at dispatch (the assistant message's
`metadata.generationId` links the other way).

### ImageGenerationAsset

| Column       | Type           | Notes                             |
| ------------ | -------------- | --------------------------------- |
| id           | String         | CUID primary key                  |
| generationId | String         | FK to ImageGeneration             |
| storageKey   | String         | Local storage key                 |
| url          | String         | Public URL                        |
| downloadUrl  | String         | Direct download URL               |
| mimeType     | String         | image/png, image/jpeg, etc.       |
| width        | Int?           | Actual generated width            |
| height       | Int?           | Actual generated height           |
| sizeBytes    | Int?           | File size                         |
| role         | ImageAssetRole | `OUTPUT` (default) or `REFERENCE` |

Every read that feeds a response includes OUTPUT assets only
(`IMAGE_OUTPUT_ASSETS_INCLUDE`), so the card's `assets[0]` is never the
user's own reference image. Migration
`20260925235000_add_image_supersession_and_reference_role`.

### ImageGenerationEvent

Status change log for each generation, enabling timeline reconstruction.

## Generation Status Flow

```
QUEUED -> STARTING -> GENERATING -> FINALIZING -> COMPLETED
                                               -> FAILED
                                               -> TIMED_OUT
                                               -> CANCELLED
```

CANCELLED is reachable from any of QUEUED/STARTING/GENERATING/FINALIZING (user
cancel) and is absorbing: no later write overwrites it. See
[Cancellation](#cancellation-post-imagesidcancel-2026-09-25).

## Provider Adapters

### OpenAI GPT Image (`gpt-image-1`)

- `dall-e-3` is retired for new OpenAI keys ("The model 'dall-e-3' does not exist"). image-service's `IMAGE_MODEL_OPENAI`, routing-service's `IMAGE_MODEL_OPENAI`, and the frontend's `IMAGE_MODEL_OPTIONS` / `IMAGE_CAPABILITIES` must all name the same current model (`gpt-image-1`, fixed 2026-09-25).

- Endpoint: POST `https://api.openai.com/v1/images/generations`
- Supports: text-to-image, revised prompts, quality/style parameters
- Sizes: 1024x1024, 1792x1024, 1024x1792
- Returns: base64 or URL — and **no token usage**
- PAYG: metered **per image** (rule 37 item 17). Reserve sends `imageUnits: 1`
  (`n: 1` is hard-coded); finalize sends the images actually returned
  (`countReturnedImages`). The hold stays OPEN until the image is stored AND its
  asset row written, then finalizes; a failed store or asset row releases it
  (`CANCELLED`, logged `reason=STORE_FAILED`) and the row fails as
  `IMAGE_STORAGE_FAILED` — the user is never charged for an unsaved image. The price is `ModelCostVersion.imagePerUnitMicroUsd`
  (seed v4: gpt-image-1 $0.167 = `high` 1024x1024; dall-e-3 $0.040 standard;
  dall-e-2 $0.020). Since seed v7 gpt-image-1 is metered on a SIZED row,
  `gpt-image-1@<w>x<h>` (1024x1024 $0.167, 1024x1536 / 1536x1024 $0.25; an
  unknown size uses the dearest row) chosen by `meteredImageModelKey`, with a
  zero output token rate. Before 2026-09-25 these rows carried a fake token rate
  and every OpenAI image settled at $0.

### Gemini Image Generation

- Endpoint: POST `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`
- Uses the `generateContent` API with `generationConfig.responseModalities: ['TEXT', 'IMAGE']`
- The API key rides in the `x-goog-api-key` header, never in `?key=` — the shared HTTP client logs request URLs, so a query-string key used to write the Gemini key to the image-service log in plain text
- Catalog model ids carry the `models/` prefix (`models/gemini-3-pro-image`); the adapter strips it before building the path (`normalizeGeminiModelId`)
- The requested model is tried first, then `IMAGE_CAPABLE_MODELS` as fallback — needed because the `imagen-*` family in the catalog answers `404 NOT_FOUND` on this endpoint (**Imagen has been shut down in the Gemini API**; Google's own migration guide says to use `generateContent` on a `gemini-*-image` model instead) and because a retired/renamed model 400s. A safety block (`finishReason`/`promptFeedback.blockReason` in `GEMINI_SAFETY_FINISH_REASONS`) is NOT retried across candidates — every Gemini model would refuse the same prompt
- Supports: text-to-image with reference images
- Returns: inline base64 image data, `usageMetadata` for PAYG settlement

### xAI Grok Imagine

- Endpoint: POST `https://api.x.ai/v1/images/generations` (no admin base URL configured — falls back to `XAI_DEFAULT_BASE_URL`)
- Body: `{ model, prompt, n: 1, response_format: 'b64_json' }` — `size`, `quality`, `style` are OpenAI-only and never sent
- Response: `{ data: [{ b64_json, mime_type: "image/jpeg" }], usage: { cost_in_usd_ticks } }` — verified live against `grok-imagine-image`, `grok-imagine-image-2.0`, `grok-imagine-image-quality` on 2026-09-23
- `usage.cost_in_usd_ticks` is a price, not a token count. Finalize carries `imageUnits: 1`, but no Grok image model has a per-image price row yet, so a Grok image still settles at zero tokens — seed an `imagePerUnitMicroUsd` row for it to charge (open gap)

### Stable Diffusion (Local)

- Endpoint: POST `http://comfyui:8188/api/prompt` or SD WebUI API
- Configured via `STABLE_DIFFUSION_URL` and `COMFYUI_BASE_URL`
- Supports: txt2img, img2img
- Free, no internet required, lower quality than cloud providers

## API Endpoints

All paths are under `/api/v1`. Verified against the controllers 2026-09-25.

| Method | Path                                             | Auth                                                | Ownership                                                 | Description                                         |
| ------ | ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| GET    | `/images`                                        | Bearer                                              | scoped to caller                                          | List the caller's generations                       |
| GET    | `/images/:id`                                    | Bearer                                              | `getWithLatestForUser` → 404 if not owner                 | Row + `supersededById` + `latest` (chain head)      |
| POST   | `/images/:id/retry`                              | Bearer                                              | `retryGenerationForUser` → 404 if not owner               | Re-queue the same row (a CANCELLED row → successor) |
| POST   | `/images/:id/cancel`                             | Bearer                                              | `cancelGenerationForUser` → 404 if not owner              | Cancel; 200 `{generationId, status}`, idempotent    |
| POST   | `/images/:id/retry-alternate`                    | Bearer                                              | `retryWithAlternateModelForUser` → 404                    | Clone onto another provider/model                   |
| GET    | `/images/:id/events` (SSE)                       | Bearer header (`connectSse`)                        | `ImageGenerationOwnerGuard` → 404 before the stream opens | Live status events                                  |
| POST   | `/internal/images/generate`                      | `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>` | caller is trusted (chat-service)                          | Enqueue a generation                                |
| GET    | `/internal/images/:generationId`                 | Service token                                       | —                                                         | Read any generation                                 |
| POST   | `/internal/images/:generationId/retry`           | Service token                                       | —                                                         | Retry                                               |
| POST   | `/internal/images/:generationId/retry-alternate` | Service token                                       | —                                                         | Alternate-model retry                               |
| GET    | `/internal/images/:generationId/events` (SSE)    | Service token                                       | —                                                         | Live status events                                  |

### Ownership and auth invariants (2026-09-25)

- **Every user-facing `:id` route answers a stranger with the SAME 404 as a missing id** (`IMAGE_NOT_FOUND`, `HttpStatus.NOT_FOUND`). Before this, `retry` and `retry-alternate` called the trusting `retryGeneration` / `retryWithAlternateModel` directly, so any signed-in user could re-run — and bill — anyone's job; and `IMAGE_NOT_FOUND` was a 400, not a 404.
- **The user SSE stream is authenticated and owner-checked by a guard, not in the handler.** Once an `@Sse` handler runs, Nest has already sent 200 and can only emit an error frame. `ImageGenerationOwnerGuard` refuses first. The frontend opens it with `connectSse` (fetch + Bearer header), never a native `EventSource`, which cannot send headers. Mirrors file-generation-service's `FileGenerationOwnerGuard`.
- **`/internal/images/*` is `@UseGuards(ServiceTokenGuard)`.** The per-route `@Public()` only skips the user-JWT guard. chat-service's `callImageService` sends `buildInterServiceAuthHeader()`; a caller without it gets `401 Service token required`.
- The trusting methods (`retryGeneration`, `retryWithAlternateModel`, `getById`) exist for the service-token lane only. A new user-facing route must use a `…ForUser` method.

## Supersession chain (batch 10a, 2026-09-25)

An AUTO fallback attempt and a user's retry-alternate each continue a job on a
**new row**. Before 10a the original row stayed FAILED with nothing pointing
onward, so a fallback that succeeded was invisible (live and after refresh)
and a retry-alternate's result vanished on refresh.

- **One writer:** `ImageGenerationRepository.createSuccessor(predecessorId, data)`
  creates the successor, sets `predecessor.supersededById`, and copies the
  REFERENCE asset — in one transaction.
- **AUTO fallback:** `processJob` takes an `ImageSuccessorSpawner`; on failure the
  row is stored FAILED, `spawnFallback` creates and links the next attempt
  (credit latch, chain-terminal codes, `IMAGE_AUTO_FALLBACK_MAX_ATTEMPTS` = 2),
  and only THEN is the FAILED SSE event published — carrying
  `supersededById`. A live listener switches before it closes.
- **Retry-alternate:** `cloneAsAlternate` → `createSuccessor`, then
  `publishSuperseded` emits `{generationId: old, supersededById: new}` on the
  old row's stream.
- **Only a chain head can be retried.** `retry` / `retry-alternate` on a row
  with `supersededById` answer `409 IMAGE_GENERATION_SUPERSEDED` and run
  nothing — a second branch would be billed and pointed at by nothing.
- **Read:** `GET /images/:id` → `getWithLatestForUser` returns the row plus
  `latest` (id, status, provider, model, errorCode, errorMessage,
  supersededById, assets). The walk follows at most
  `IMAGE_SUPERSESSION_MAX_HOPS` (8) links and is owner-checked on every hop; a
  link to a missing or foreign row ends the walk at the last owned row and is
  reported as `null` (no foreign id leaks). A walk cut by the hop bound keeps
  its link so a reader can continue from `latest`.
- **Frontend:** `useImageGenerationListener` follows `supersededById` from SSE
  and `latest` from GET, at most `IMAGE_GENERATION_MAX_FOLLOW_HOPS` (8) times;
  FAILED is terminal only when not superseded. Retries target the row the card
  shows.
- **PAYG unchanged:** the link never calls a provider — one hold per attempt,
  per row, each with a fresh `requestId`.

## Reference Image Support

A reference image comes from chat-service as base64 **plus**
`referenceFileId` (the file-service upload it came from):

1. The first attempt uses the in-memory bytes; AUTO fallback attempts reuse
   them too.
2. `enqueueGeneration` stores the reference as an `ImageGenerationAsset` with
   `role = REFERENCE` and `storageKey = fileId` — the id only, never the bytes.
   `createSuccessor` copies it to every successor.
3. A later retry / retry-alternate has no bytes in memory, so `processJob` reads
   the REFERENCE asset and `ImageExecutionManager.loadStoredReference`
   fetches `GET /api/v1/internal/files/:id/content?userId=` with the
   service token (file-service owner-checks). Missing, refused, empty or over
   `IMAGE_REFERENCE_MAX_BASE64_LENGTH` → `IMAGE_REFERENCE_UNAVAILABLE`
   (chain-terminal). It never silently generates without the reference.
4. A caller that sends bare base64 with no `referenceFileId` gets it used on
   that send only; nothing is stored.
5. Used by Gemini (native) and Stable Diffusion (img2img); OpenAI / xAI ignore it.

## Cancellation (`POST /images/:id/cancel`, 2026-09-25)

Pack §72: never fake a provider cancel, persist the true local state, release
the PAYG hold.

**Contract.** Owner only (`cancelGenerationForUser` → the same `IMAGE_NOT_FOUND`
404 for a stranger or a missing id). Always **200** (`@HttpCode(OK)`), body
`{ generationId: string, status: ImageGenerationStatus }` = the row's status
AFTER the call. Idempotent: already CANCELLED → 200 `CANCELLED`;
COMPLETED / FAILED / TIMED_OUT → 200 with that status unchanged (no 409).

| Status at cancel                           | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QUEUED / STARTING                          | `cancelIfActive` (one conditional `updateMany`, `status IN IMAGE_ACTIVE_STATUSES`) → CANCELLED. No provider call, no hold exists. The job's next guarded transition (STARTING/GENERATING) matches nothing, so `execute` is never called. `providerCancel=not_started`.                                                                                                                                                                                               |
| GENERATING / FINALIZING                    | Same conditional write. Upstream stop only when it cannot hit another user's job: ComfyUI gets a TARGETED `POST /interrupt { prompt_id }` when this process holds this generation's prompt id → `providerCancel=requested`. Otherwise (ComfyUI id unknown, any SD WebUI run, any cloud provider) no upstream call → `providerCancel=unsupported`; the run finishes upstream and its result is discarded. No local fetch is aborted (adapters take no `AbortSignal`). |
| COMPLETED / FAILED / TIMED_OUT / CANCELLED | NOOP, status returned unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                     |

**Why the execution path cannot clobber CANCELLED.** `ImageGenerationRepository.updateStatus`
is a conditional `updateMany … where status <> CANCELLED` and returns `null`
when nothing matched. Every write in the job — STARTING, GENERATING,
FINALIZING, COMPLETED, FAILED — goes through it, and a `null` makes the job
stop (`discardCancelled`): no asset, no settle, no FAILED, no AUTO successor,
no `image.generated` / `image.failed`. The DB row is the shared store, so a
cancel taken on any replica is seen (no Redis needed).

**Discarding a result that already came back** (rule 37 item 17):

1. `ExecuteImageInput.isCancelled` (reads the row's status) is checked before
   the provider call and again the moment it returns — a cancelled result is
   dropped **before** file-service stores it, and the hold is released
   (`releaseCancelled`, wire reason `CANCELLED`, log `reason=USER_CANCELLED`).
2. If the cancel lands during the store: the FINALIZING write fails → hold
   released, no asset row.
3. If it lands after the asset row: the guarded COMPLETED write fails → the
   asset row is deleted, hold released.
4. COMPLETED is written **before** `settle`, so a cancel either wins (released)
   or loses (row COMPLETED, hold finalized, cancel answers `COMPLETED`). There
   is no charged CANCELLED row.
5. A provider error after the cancel (an interrupted local run ends this way)
   releases the hold as `PROVIDER_ERROR` in `callMeteredCloudProvider` and the
   guarded FAILED write leaves the row CANCELLED.

**Retry from CANCELLED** runs as a **successor row** (same provider/model,
`createSuccessor`), never by re-queuing the cancelled row — its abandoned call
may still be running, and CANCELLED is what keeps that result out. The
cancelled row is then superseded, so a second retry of it is 409
`IMAGE_GENERATION_SUPERSEDED`. Retry-alternate already creates a successor.

**Events.** CANCELLED is published on the per-generation SSE stream (by the
cancelling request, and again by the execution path when it discards) and
recorded as an `image_generation_events` row
(`payloadJson: { fromStatus, providerCancel }`). **No `image.failed` is
published for a user cancel**: a cancel is not a failure, and no service
consumes `image.failed` or `image.generated` today (verified by grep
2026-09-25), so a terminal bus event would have no reader. Add an
`image.cancelled` pattern when a consumer needs one.

**Log lines.** `imageCancel generationId=… fromStatus=… outcome=CANCELLED|NOOP|DISCARDED holdReleased=true|false providerCancel=not_started|unsupported|requested|n/a`
— one per route call (`holdReleased=false` there: the route never holds money)
and one when the job discards (`holdReleased` = whether a paid hold was
given back). No prompt, no balance.

**Known gaps.** (a) A file stored in file-service just before the cancel
landed (cases 2–3) is orphaned — the asset row is gone but the file is not
deleted. (b) Upstream compute is not always stopped: SD WebUI is never
interrupted (its `/sdapi/v1/interrupt` has no job target and image-service can
not prove this generation is the one running — SD calls are not serialized
and there is no job id to check), and ComfyUI is interrupted only by
`prompt_id` from the replica running the job (the id lives in that process's
`comfyPromptIds` map, set by `onPromptAccepted` and cleared when the call
settles). Both fall back to discard-only. (c) SSE is
an in-process `Subject`: a listener attached to a different replica than the
one that cancelled sees CANCELLED only via `GET /images/:id` (or when the job's
own replica discards). (d) The frontend cancel button is not wired to this
route yet (frontend is owned elsewhere).

## Retry with Model Picker

When generation fails with one provider, the service can:

1. Try an alternate model from the same provider
2. Fall back to a different provider entirely
3. As a last resort, try local Stable Diffusion

## Runtime progress (batch 10a)

Local runtimes report progress through the existing per-generation SSE stream
(`ImageGenerationEventsService`) — no second progress system.

- **ComfyUI:** `callComfyUIProvider` forwards every adapter envelope
  (`onEvent`, previously `() => {}`) to `ExecuteImageInput.onProgress`.
- **SD WebUI:** `observeSdProgress` starts `StableDiffusionWebuiProgressAdapter`
  only when someone listens, polls at `CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS`
  (Zod floor 300 ms) with `preview: false`, stops in `finally` when txt2img
  settles (`SD_TIMEOUT_MS`), gives up after
  `SD_PROGRESS_MAX_CONSECUTIVE_ERRORS`, and drops any envelope that lands after
  the call settled.
- The service publishes `{status: 'GENERATING', runtimeProgress}` built by
  `toImageProgressSnapshot`: stage, `currentStep` / `totalSteps` /
  `elapsedMs` when reported, and `progressPercent` **only** at `EXACT` /
  `RUNTIME_REPORTED` confidence. No preview frame, no runtime URL. Not
  persisted to `image_generation_events`.
- The chat card shows the translated stage (`chat.imageStage.*`, 13 locales)
  plus "Step x of y" in an `aria-live="polite"` region.
- Cloud providers (OpenAI, Gemini, xAI) report no progress; their cards show
  status only.

## Plan gate (ADR-122, 2026-09-25)

Image generation and image edit (a reference image) are a paid plan feature.
`ImagePlanGateManager` (`managers/image-plan-gate.manager.ts`) reads the
user's entitlements through the shared `ENTITLEMENTS_ADAPTER` and runs first in
every entry:

| Entry                                         | Checked on         |
| --------------------------------------------- | ------------------ |
| `POST /internal/images/generate` (chat)       | `dto.userId`       |
| `POST /images/:id/retry` + internal twin      | the job's `userId` |
| `POST /images/:id/retry-alternate` + internal | the job's `userId` |

A plan without `allowImageGeneration` → `403 PLAN_FEATURE_DISABLED` with no
row, no event, no PAYG hold and no provider call. auth-service unreachable →
`503 ENTITLEMENTS_UNAVAILABLE` (fails closed); `PLAN_TRIAL_EXPIRED` passes
through with its own status. ADMIN bypasses via `hasPlanFeature`. The
auto-fallback chain is a continuation of an entry that already passed.
chat-service checks the same gate first and turns a refusal into a translated
in-chat notice; this check is the authority.

## Failure taxonomy (`ImageFailureCode`)

Every generation failure is classified into one of these codes before it is
stored on the row and streamed over SSE — never the provider's raw message,
which can carry a prompt, a URL or a key fragment. `describeImageFailure`
(`src/modules/image-generation/utilities/image-failure.utility.ts`) does the
classification; `toImageProviderException`
(`src/modules/image-generation/adapter.utilities/provider-error.utility.ts`)
turns a thrown provider error into one, from the HTTP status and the message
text (Gemini answers a bad key with `400`, not `401`, so status alone
under-classifies auth failures).

| Code                             | Meaning                                                                                                                                           | Retryable via AUTO fallback?                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROVIDER_FAILURE`               | Unclassified — the pre-existing generic code                                                                                                      | Yes                                                                                                                                                                                 |
| `IMAGE_PROVIDER_AUTH_FAILED`     | 401/403, or "API key not valid"                                                                                                                   | Yes (different provider may have a valid key)                                                                                                                                       |
| `IMAGE_PROVIDER_QUOTA_EXCEEDED`  | 402/429                                                                                                                                           | Yes                                                                                                                                                                                 |
| `IMAGE_PROVIDER_REJECTED`        | Other 4xx the provider gave a reason for                                                                                                          | Yes                                                                                                                                                                                 |
| `IMAGE_MODEL_UNAVAILABLE`        | 404, or "does not exist" / "not found" in the message (e.g. a retired OpenAI DALL-E id, or a Gemini `imagen-*` id that 404s on `generateContent`) | Yes                                                                                                                                                                                 |
| `IMAGE_CONTENT_REJECTED`         | Safety/content-policy refusal                                                                                                                     | Yes, but expect the same refusal from any provider                                                                                                                                  |
| `IMAGE_NO_IMAGE_RETURNED`        | 200 with no image in the payload                                                                                                                  | Yes                                                                                                                                                                                 |
| `IMAGE_PROVIDER_UNAVAILABLE`     | 5xx or a transport error (`ECONNREFUSED`, `ETIMEDOUT`, …)                                                                                         | Yes                                                                                                                                                                                 |
| `IMAGE_CONNECTOR_NOT_CONFIGURED` | No connector row for the chat provider this capability borrows from                                                                               | Yes (a different capability may have its connector configured)                                                                                                                      |
| `IMAGE_STORAGE_FAILED`           | The provider produced the image but `POST /internal/files/store-image` on file-service failed                                                     | **No** — `isChainTerminalFailureCode` stops `spawnFallback`; storage is shared by every provider, so paying another provider for an image just to lose it the same way wastes money |
| `IMAGE_REFERENCE_UNAVAILABLE`    | A retry's stored reference could not be read back from file-service (deleted, not the owner's, service down, empty, too large)                    | **No** — every provider would be sent the same missing reference                                                                                                                    |

## Events

| Event           | Direction | Consumers                                   |
| --------------- | --------- | ------------------------------------------- |
| image.generated | Publish   | none today (no subscriber found 2026-09-25) |
| image.failed    | Publish   | none today (no subscriber found 2026-09-25) |

A user cancel publishes neither (see Cancellation).

`image.failed` is `ImageFailedPayload` (`@claw/shared-types`): ids, provider,
model, prompt, error code/message, `timestamp`, and — only when an AUTO
fallback successor exists — `supersededById` (optional, additive).
