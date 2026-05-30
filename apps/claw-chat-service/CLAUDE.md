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
