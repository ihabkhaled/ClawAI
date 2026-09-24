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

### ImageGenerationAsset

| Column       | Type   | Notes                       |
| ------------ | ------ | --------------------------- |
| id           | String | CUID primary key            |
| generationId | String | FK to ImageGeneration       |
| storageKey   | String | Local storage key           |
| url          | String | Public URL                  |
| downloadUrl  | String | Direct download URL         |
| mimeType     | String | image/png, image/jpeg, etc. |
| width        | Int?   | Actual generated width      |
| height       | Int?   | Actual generated height     |
| sizeBytes    | Int?   | File size                   |

### ImageGenerationEvent

Status change log for each generation, enabling timeline reconstruction.

## Generation Status Flow

```
QUEUED -> STARTING -> GENERATING -> FINALIZING -> COMPLETED
                                               -> FAILED
                                               -> TIMED_OUT
                                               -> CANCELLED
```

## Provider Adapters

### OpenAI GPT Image (`gpt-image-1`)

- `dall-e-3` is retired for new OpenAI keys ("The model 'dall-e-3' does not exist"). image-service's `IMAGE_MODEL_OPENAI`, routing-service's `IMAGE_MODEL_OPENAI`, and the frontend's `IMAGE_MODEL_OPTIONS` / `IMAGE_CAPABILITIES` must all name the same current model (`gpt-image-1`, fixed 2026-09-25).

- Endpoint: POST `https://api.openai.com/v1/images/generations`
- Supports: text-to-image, revised prompts, quality/style parameters
- Sizes: 1024x1024, 1792x1024, 1024x1792
- Returns: base64 or URL

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
- `usage.cost_in_usd_ticks` is a price, not a token count — the PAYG hold settles at zero tokens exactly like an OpenAI image

### Stable Diffusion (Local)

- Endpoint: POST `http://comfyui:8188/api/prompt` or SD WebUI API
- Configured via `STABLE_DIFFUSION_URL` and `COMFYUI_BASE_URL`
- Supports: txt2img, img2img
- Free, no internet required, lower quality than cloud providers

## API Endpoints

All paths are under `/api/v1`. Verified against the controllers 2026-09-25.

| Method | Path                                             | Auth                                                | Ownership                                                 | Description                       |
| ------ | ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| GET    | `/images`                                        | Bearer                                              | scoped to caller                                          | List the caller's generations     |
| GET    | `/images/:id`                                    | Bearer                                              | `getByIdForUser` → 404 if not owner                       | Generation details + assets       |
| POST   | `/images/:id/retry`                              | Bearer                                              | `retryGenerationForUser` → 404 if not owner               | Re-queue the same row             |
| POST   | `/images/:id/retry-alternate`                    | Bearer                                              | `retryWithAlternateModelForUser` → 404                    | Clone onto another provider/model |
| GET    | `/images/:id/events` (SSE)                       | Bearer header (`connectSse`)                        | `ImageGenerationOwnerGuard` → 404 before the stream opens | Live status events                |
| POST   | `/internal/images/generate`                      | `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>` | caller is trusted (chat-service)                          | Enqueue a generation              |
| GET    | `/internal/images/:generationId`                 | Service token                                       | —                                                         | Read any generation               |
| POST   | `/internal/images/:generationId/retry`           | Service token                                       | —                                                         | Retry                             |
| POST   | `/internal/images/:generationId/retry-alternate` | Service token                                       | —                                                         | Alternate-model retry             |
| GET    | `/internal/images/:generationId/events` (SSE)    | Service token                                       | —                                                         | Live status events                |

### Ownership and auth invariants (2026-09-25)

- **Every user-facing `:id` route answers a stranger with the SAME 404 as a missing id** (`IMAGE_NOT_FOUND`, `HttpStatus.NOT_FOUND`). Before this, `retry` and `retry-alternate` called the trusting `retryGeneration` / `retryWithAlternateModel` directly, so any signed-in user could re-run — and bill — anyone's job; and `IMAGE_NOT_FOUND` was a 400, not a 404.
- **The user SSE stream is authenticated and owner-checked by a guard, not in the handler.** Once an `@Sse` handler runs, Nest has already sent 200 and can only emit an error frame. `ImageGenerationOwnerGuard` refuses first. The frontend opens it with `connectSse` (fetch + Bearer header), never a native `EventSource`, which cannot send headers. Mirrors file-generation-service's `FileGenerationOwnerGuard`.
- **`/internal/images/*` is `@UseGuards(ServiceTokenGuard)`.** The per-route `@Public()` only skips the user-JWT guard. chat-service's `callImageService` sends `buildInterServiceAuthHeader()`; a caller without it gets `401 Service token required`.
- The trusting methods (`retryGeneration`, `retryWithAlternateModel`, `getById`) exist for the service-token lane only. A new user-facing route must use a `…ForUser` method.

## Reference Image Support

Users can attach reference images to influence generation:

1. Images are uploaded via the file-service first
2. File IDs are passed in the generation request
3. The adapter downloads the reference image and includes it in the provider API call
4. Currently supported by Gemini (native) and Stable Diffusion (img2img)

## Retry with Model Picker

When generation fails with one provider, the service can:

1. Try an alternate model from the same provider
2. Fall back to a different provider entirely
3. As a last resort, try local Stable Diffusion

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

| Code                             | Meaning                                                                                                                                           | Retryable via AUTO fallback?                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PROVIDER_FAILURE`               | Unclassified — the pre-existing generic code                                                                                                      | Yes                                                                                                                                                                                        |
| `IMAGE_PROVIDER_AUTH_FAILED`     | 401/403, or "API key not valid"                                                                                                                   | Yes (different provider may have a valid key)                                                                                                                                              |
| `IMAGE_PROVIDER_QUOTA_EXCEEDED`  | 402/429                                                                                                                                           | Yes                                                                                                                                                                                        |
| `IMAGE_PROVIDER_REJECTED`        | Other 4xx the provider gave a reason for                                                                                                          | Yes                                                                                                                                                                                        |
| `IMAGE_MODEL_UNAVAILABLE`        | 404, or "does not exist" / "not found" in the message (e.g. a retired OpenAI DALL-E id, or a Gemini `imagen-*` id that 404s on `generateContent`) | Yes                                                                                                                                                                                        |
| `IMAGE_CONTENT_REJECTED`         | Safety/content-policy refusal                                                                                                                     | Yes, but expect the same refusal from any provider                                                                                                                                         |
| `IMAGE_NO_IMAGE_RETURNED`        | 200 with no image in the payload                                                                                                                  | Yes                                                                                                                                                                                        |
| `IMAGE_PROVIDER_UNAVAILABLE`     | 5xx or a transport error (`ECONNREFUSED`, `ETIMEDOUT`, …)                                                                                         | Yes                                                                                                                                                                                        |
| `IMAGE_CONNECTOR_NOT_CONFIGURED` | No connector row for the chat provider this capability borrows from                                                                               | Yes (a different capability may have its connector configured)                                                                                                                             |
| `IMAGE_STORAGE_FAILED`           | The provider produced the image but `POST /internal/files/store-image` on file-service failed                                                     | **No** — `isChainTerminalFailureCode` stops `runAutoFallbackChain`; storage is shared by every provider, so paying another provider for an image just to lose it the same way wastes money |

## Events

| Event           | Direction | Consumers |
| --------------- | --------- | --------- |
| image.generated | Publish   | audit     |
| image.failed    | Publish   | audit     |
