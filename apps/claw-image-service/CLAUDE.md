# Claw Image Service - Development Rules

## Service Overview

Image generation microservice for the Claw platform. Orchestrates image generation across cloud providers (DALL-E 3, Gemini Imagen) and local Stable Diffusion. Runs on port 4012 with its own PostgreSQL database (claw_images).

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
- **Cancel endpoint**: `POST /sdapi/v1/interrupt` — invoked from
  `adapter.cancel()`. Frontend Cancel button on
  `ImageGenerationProgressPanel` wires straight to this.
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
- **Cancel endpoint**: `DELETE /queue` (documented mechanism — wiring is
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
