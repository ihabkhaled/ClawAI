# AI Agent Context Pack

Optimized reference for AI coding agents working on the ClawAI codebase. Read this first, then `CLAUDE.md` at the project root for mandatory rules.

---

## System Summary

**What**: ClawAI is a local-first AI orchestration platform that routes user messages to the optimal AI provider (cloud or local Ollama) based on task type, privacy needs, cost, and latency.

**Why**: Organizations need a single interface that intelligently selects from multiple AI providers while keeping sensitive data local when required.

**How**: 13 NestJS microservices communicate via RabbitMQ events, each owning its own database. A Next.js frontend connects through an Nginx reverse proxy. Ollama runs locally for privacy-sensitive tasks and as the routing brain in AUTO mode.

---

## Architecture in 10 Lines

1. User sends a message through the Next.js frontend (port 3000).
2. Nginx reverse proxy (port 4000) routes the request to the chat service.
3. Chat service creates a USER message and publishes `message.created` to RabbitMQ.
4. Routing service consumes the event, evaluates routing mode and policies, publishes `message.routed`.
5. Chat service consumes routing result, assembles context (memories, context packs, file chunks, thread history).
6. Chat service calls the selected AI provider (Ollama, OpenAI, Anthropic, Google, DeepSeek) with fallback chain.
7. ASSISTANT message is stored, SSE pushes completion to the frontend.
8. `message.completed` event triggers memory extraction (Ollama) and audit logging (MongoDB).
9. Each service owns its own PostgreSQL or MongoDB database; no shared databases.
10. All inter-service communication is async (RabbitMQ) or HTTP (for synchronous data fetches during context assembly).

---

## Service Map

| Service         | Port | Database                   | Purpose                                                           |
| --------------- | ---- | -------------------------- | ----------------------------------------------------------------- |
| auth            | 4001 | PG `claw_auth`             | JWT auth, RBAC (Admin/Operator/Viewer), sessions, user management |
| chat            | 4002 | PG `claw_chat`             | Threads, messages, context assembly, AI execution, SSE streaming  |
| connector       | 4003 | PG `claw_connectors`       | Cloud provider configs (encrypted), health checks, model sync     |
| routing         | 4004 | PG `claw_routing`          | 7 routing modes, policy engine, Ollama-assisted AUTO routing      |
| memory          | 4005 | PG `claw_memory`           | Memory CRUD, extraction via Ollama, context packs (pgvector)      |
| file            | 4006 | PG `claw_files`            | File upload, chunking (JSON/CSV/MD/text), storage                 |
| audit           | 4007 | MongoDB `claw_audit`       | 10 audit event types, usage ledger                                |
| ollama          | 4008 | PG `claw_ollama`           | Local model management, role assignments, pull jobs, generation   |
| health          | 4009 | None                       | Aggregated health checks from all services                        |
| client-logs     | 4010 | MongoDB `claw_client_logs` | Frontend log ingestion, batched, TTL 30 days                      |
| server-logs     | 4011 | MongoDB `claw_server_logs` | Backend log aggregation, TTL 30 days                              |
| image           | 4012 | PG `claw_image`            | Image generation via AI providers                                 |
| file-generation | 4013 | PG `claw_filegen`          | AI-driven file/document generation                                |

---

## Key Patterns

### Controller -> Service -> Repository

```
Controller (3 lines max: extract params, call service, return result)
  -> Service (business logic, validation, event publishing, max 30 lines/method)
    -> Repository (pure data access, no throws, no business logic)
    -> Manager (complex orchestration, max 80 lines/method, complexity <= 15)
```

Controllers never contain try/catch or throw statements. Repositories never throw. Services own all validation and permission checks.

### Event-Driven Communication (RabbitMQ)

- Topic exchange: `claw.events` (durable)
- DLQ with 3 retries and exponential backoff
- Key events: `message.created`, `message.routed`, `message.completed`, `connector.synced`, `user.login`
- Publishers and consumers are defined in service modules; event payloads are typed in `packages/shared-types`

### SSE Streaming

- Chat completions stream to connected clients via Server-Sent Events
- Frontend uses `fetch`-based SSE (not `EventSource`) to support Authorization headers
- Connection managed through `ChatExecutionManager`

### Fallback Chains

- When primary provider fails, routing provides a fallback provider/model
- Chat execution tries primary, then fallback, logging which succeeded
- Local Ollama is always available as ultimate fallback

---

## Critical Rules (Enforced by ESLint + Pre-Commit)

1. **No `any`** -- use `unknown`, generics, or proper types. Tests are exempt.
2. **No `console.log`** -- use NestJS `Logger` (backend) or logger utility (frontend). Only `console.warn`/`console.error` allowed.
3. **All input validated with Zod** -- every `z.string()` needs `.max()`, every `z.array()` needs `.max()`.
4. **Errors use `BusinessException`** with machine-readable `code` string. Entity-not-found uses `EntityNotFoundException`.
5. **No inline types/enums/constants in logic files** -- extract to dedicated files (see Extraction Rules below).
6. **No direct `process.env`** -- use Zod-validated `AppConfig`.
7. **No `!` non-null assertions** -- handle nullability explicitly.
8. **No string literal unions** -- use enums from `src/enums/` or `src/common/enums/`.
9. **Third-party libraries must be wrapped** in `src/common/utilities/<name>.utility.ts`.
10. **No Prisma/Mongoose calls outside repositories**.

### Extraction Rules

| What             | Backend Location                              | Frontend Location                                  |
| ---------------- | --------------------------------------------- | -------------------------------------------------- |
| Types/interfaces | `src/modules/<domain>/types/<name>.types.ts`  | `src/types/<domain>.types.ts`                      |
| Enums            | `src/common/enums/<name>.enum.ts`             | `src/enums/<name>.enum.ts`                         |
| Constants        | `src/common/constants/<name>.constants.ts`    | `src/constants/<name>.constants.ts`                |
| Utilities        | `src/common/utilities/<name>.utility.ts`      | `src/utilities/<name>.utility.ts`                  |
| DTOs             | `src/modules/<domain>/dto/<name>.dto.ts`      | N/A                                                |
| Hooks            | N/A                                           | `src/hooks/<domain>/use-<name>.ts`                 |
| Repositories     | `src/modules/<domain>/<domain>.repository.ts` | `src/repositories/<domain>/<domain>.repository.ts` |

---

## Dangerous Areas (Extra Caution Required)

1. **Connector encryption** -- API keys encrypted with AES-256-GCM. The `ENCRYPTION_KEY` env var is 64 hex chars. Changing it invalidates all stored connector configs. See `connector-service/src/common/utilities/`.
2. **JWT secrets** -- `JWT_SECRET` signs all tokens. Changing it invalidates all sessions. Refresh token rotation is implemented.
3. **Database migrations** -- Prisma migrations in each service. Always run `npx prisma migrate dev --name <name>`. Never edit existing migration files. Each service has its own `prisma/` directory.
4. **RabbitMQ event contracts** -- Event payloads are shared via `packages/shared-types`. Changing a payload shape requires updating all consumers.
5. **Context assembly token budget** -- `ChatExecutionManager` truncates context to fit token limits. Bugs here cause silent data loss or provider API errors.
6. **Ollama model role assignments** -- The router model (`gemma3:4b` default) powers AUTO routing. If misconfigured, all AUTO routing breaks.
7. **Log redaction** -- Pino is configured to redact `authorization`, `password`, `refreshToken`, `apiKey`, `token`, `secret`. Adding new sensitive fields requires updating redaction config.

---

## Common Tasks with File Locations

### Add a New Backend Endpoint

1. **DTO**: `apps/claw-<service>/src/modules/<domain>/dto/<name>.dto.ts` (Zod schema + inferred type)
2. **Controller**: `apps/claw-<service>/src/modules/<domain>/<domain>.controller.ts` (3-line method)
3. **Service**: `apps/claw-<service>/src/modules/<domain>/<domain>.service.ts` (business logic)
4. **Repository**: `apps/claw-<service>/src/modules/<domain>/<domain>.repository.ts` (data access)
5. **Test**: `apps/claw-<service>/src/__tests__/<domain>/<name>.spec.ts`
6. **Nginx**: `infra/nginx/nginx.conf` (add route mapping if new path prefix)

### Add a New RabbitMQ Event

1. **Payload type**: `packages/shared-types/src/events/<event-name>.event.ts`
2. **Export**: `packages/shared-types/src/index.ts`
3. **Publisher**: In the service module that owns the event
4. **Consumer**: In the service module(s) that react to it
5. **Update**: `CLAUDE.md` event bus table

### Add a New Frontend Page

1. **Page**: `apps/claw-frontend/src/app/(authenticated)/<route>/page.tsx` (render only, one controller hook)
2. **Controller hook**: `apps/claw-frontend/src/hooks/<domain>/use-<name>.ts`
3. **Repository**: `apps/claw-frontend/src/repositories/<domain>/<domain>.repository.ts`
4. **Types**: `apps/claw-frontend/src/types/<domain>.types.ts`
5. **i18n**: Add keys to all 8 locale files in `apps/claw-frontend/src/lib/i18n/locales/`
6. **Sidebar**: Update navigation components if needed

### Add a New Database Table

1. **Schema**: `apps/claw-<service>/prisma/schema.prisma`
2. **Migration**: `npx prisma migrate dev --name add-<table-name>` (run inside the service directory)
3. **Repository**: New or updated repository file
4. **Types**: Update shared types if exposed to other services

---

## How to Explore (Read These First)

| Priority | File                                                | Why                                                   |
| -------- | --------------------------------------------------- | ----------------------------------------------------- |
| 1        | `CLAUDE.md` (project root)                          | All mandatory rules, architecture, patterns, env vars |
| 2        | `docs/00-start-here/system-at-a-glance.md`          | Visual architecture, service map, key flows           |
| 3        | `packages/shared-types/src/`                        | All shared enums, event payloads, auth types          |
| 4        | `packages/shared-rabbitmq/src/`                     | RabbitMQ module, retry logic, structured logger       |
| 5        | `apps/claw-chat-service/src/modules/chat-messages/` | Most complex service -- context assembly + execution  |
| 6        | `apps/claw-routing-service/src/modules/routing/`    | Routing decision engine                               |
| 7        | `apps/claw-frontend/src/app/(authenticated)/chat/`  | Main chat UI pages and components                     |
| 8        | `apps/claw-frontend/src/hooks/chat/`                | Chat hooks -- demonstrate the hook pattern            |
| 9        | `infra/nginx/nginx.conf`                            | All route mappings                                    |
| 10       | `.env.example`                                      | Every environment variable the system uses            |

---

## Testing Expectations

- **Backend**: Jest. Tests in `apps/claw-<service>/src/__tests__/`. Unit tests for services and managers; integration tests for controllers.
- **Frontend**: Vitest. Tests colocated or in `__tests__` directories.
- **E2E**: Playwright. In `apps/claw-frontend/e2e/` or project root.
- **Every new function needs a test.** No exceptions.
- **Test files are exempt** from the no-`any` rule and inline restrictions.
- **Pre-commit hook runs all tests** -- they must pass before commit.
- **312+ tests** across 9 services as of baseline.

---

## What Not to Break

1. **Pre-commit hook** -- 5 steps (Prettier, ESLint, TypeScript, build, tests). All must pass. Do not add `eslint-disable` comments.
2. **Event contracts** -- Changing RabbitMQ event shapes without updating all consumers causes silent failures.
3. **Prisma migrations** -- Never delete or modify existing migration files. Always create new ones.
4. **Auth flow** -- JWT + refresh token rotation is security-critical. Test thoroughly after any auth changes.
5. **Connector encryption** -- AES-256-GCM. Changing encryption logic or key format breaks all stored API keys.
6. **i18n completeness** -- All 8 locales must have every key. Missing keys cause runtime errors in non-English locales.
7. **Database isolation** -- Services never share databases. Cross-service data access goes through RabbitMQ or HTTP.
8. **Import patterns** -- Third-party libraries are wrapped in utilities. Direct imports outside wrappers will fail linting.
9. **Nginx routes** -- Changing route patterns without updating both Nginx config and frontend API calls breaks the frontend.
10. **Shared packages** -- Changes to `packages/shared-types` or `packages/shared-rabbitmq` affect all services. Rebuild and test broadly.
