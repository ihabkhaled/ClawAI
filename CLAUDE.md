# ClawAI — Complete Project Reference

## What This Is

Local-first AI orchestration platform. 11 NestJS microservices + Next.js frontend + 7 PostgreSQL + MongoDB + Redis + RabbitMQ + Ollama. Monorepo with npm workspaces.

## Architecture at a Glance

```
Frontend (Next.js 16, port 3000)
  → Nginx reverse proxy (port 4000)
    → 11 backend services (ports 4001-4011)
      → RabbitMQ (async events, topic exchange: claw.events)
      → 7 PostgreSQL (pgvector), 1 MongoDB (3 databases), 1 Redis
      → Ollama (local AI runtime, port 11434)
```

## Workspace Layout

```
apps/
  claw-frontend/            # Next.js 16, React 19, TanStack Query, Zustand, Tailwind, shadcn/ui
  claw-auth-service/        # Port 4001, PG claw_auth   — JWT, RBAC, users, sessions
  claw-chat-service/        # Port 4002, PG claw_chat   — threads, messages, context assembly, execution
  claw-connector-service/   # Port 4003, PG claw_connectors — 5 cloud providers, health, model sync
  claw-routing-service/     # Port 4004, PG claw_routing — 7 modes, Ollama-assisted AUTO, policies
  claw-memory-service/      # Port 4005, PG claw_memory  — memory CRUD, extraction, context packs
  claw-file-service/        # Port 4006, PG claw_files   — upload, chunking (JSON/CSV/MD/text)
  claw-audit-service/       # Port 4007, MongoDB         — 10 audit events, usage ledger
  claw-ollama-service/      # Port 4008, PG claw_ollama  — model management, roles, generation
  claw-health-service/      # Port 4009, no DB           — aggregates health from all services
  claw-client-logs-service/ # Port 4010, MongoDB         — frontend logs, batched, TTL 30d
  claw-server-logs-service/ # Port 4011, MongoDB         — backend logs, Elasticsearch-ready, TTL 30d
packages/
  shared-types/      # 18 enums, event payloads, auth types
  shared-constants/  # Exchange name, ports, API prefix, pagination defaults
  shared-rabbitmq/   # RabbitMQModule, RabbitMQService (retry+DLQ), StructuredLogger
  shared-auth/       # AuthGuard, RolesGuard, @Public, @Roles, @CurrentUser decorators
infra/nginx/         # Reverse proxy config with 20+ route mappings
scripts/
  install.sh         # Automated setup (Linux/macOS)
  install.ps1        # Automated setup (Windows)
  claw.sh            # Service management (up/down/status/logs)
docs/                # 11 architecture audit documents
```

## Key Versions

- Node >= 20, NestJS 10.4, Next.js 16.2, React 19.2, Prisma 5.22, Zod 3.24, TypeScript 5.6+
- ESLint 9 (flat config), Prettier 3.8, Jest (backend), Vitest (frontend), Playwright (E2E)

---

## MANDATORY Change Checklist

**Every change you make MUST also consider updating these files if affected:**

1. **`.env.example`** — add/remove/rename any environment variable
2. **`.env`** — fill the new variable with a working dev value
3. **`scripts/install.sh`** — add the variable to the generated .env block
4. **`scripts/install.ps1`** — same for Windows PowerShell installer
5. **Docker compose files** — if new service, port, volume, or dependency
6. **i18n locale files** — if any new user-facing text (ALL 8 locales: en, ar, de, es, fr, it, pt, ru)
7. **Architecture docs** (`docs/`) — if the change affects documented architecture
8. **Prisma migrations** — if any schema change (`npx prisma migrate dev --name <name>`)
9. **Seed files** — if new default data needed (e.g., admin user, default policies)
10. **Test files** — create or update tests for every code change
11. **Frontend types** — sync `src/types/` with backend DTO/schema changes
12. **`CLAUDE.md`** — if adding new services, env vars, patterns, or rules

**Never skip any of these.** A feature is incomplete if any of these are missing.

---

## Universal Code Rules (MUST follow everywhere)

### Absolute Rules (Backend + Frontend)

1. NEVER use `any` — use `unknown`, generics, or proper types
2. NEVER disable ESLint rules — fix the underlying issue
3. NEVER use string literal unions — use enums from `src/enums/` or `src/common/enums/`
4. NEVER compare domain values with raw strings — use enum comparisons
5. NEVER log secrets, tokens, API keys, passwords
6. NEVER expose secrets to the frontend
7. NEVER allow missing explicit return types
8. NEVER build god-files — keep modules focused and small
9. NEVER define types/interfaces/enums/constants inline — extract to dedicated files
10. NEVER put business logic in controllers (3-line methods: extract, call, return)
11. NEVER put Prisma/Mongoose calls outside repositories
12. NEVER cross database boundaries — use RabbitMQ or HTTP
13. Each service owns its data — no shared databases
14. Use `type` over `interface` unless declaration merging needed
15. NEVER use `process.env` directly — use AppConfig (Zod-validated)
16. NEVER use `console.log` — use NestJS Logger (backend) or logger utility (frontend)
17. NEVER use `!` non-null assertion — handle nullability explicitly
18. NEVER use `==` or `!=` — always use `===` and `!==`
19. NEVER use `var` — use `const`, or `let` only when reassignment is required
20. NEVER add features without tests — every new function needs a test
21. NEVER add user-facing text without i18n — extract to translation files

### Library Wrapping Rule

Every third-party library MUST be wrapped in `src/common/utilities/<name>.utility.ts`. Services/controllers NEVER import third-party packages directly. If the library changes, only the wrapper file needs updating.

---

## ESLint Rules (Enforced Across All Services)

### Backend ESLint (all 11 NestJS services share identical config)

**Plugins**: typescript-eslint (strict), eslint-plugin-security, eslint-plugin-unicorn, eslint-plugin-import-x

**TypeScript Rules (errors)**:

- `no-explicit-any` — use unknown/generics
- `no-unused-vars` — except `_` prefixed
- `no-non-null-assertion` — handle nullability explicitly
- `no-floating-promises` — await or void all promises
- `no-misused-promises` — no promises in boolean positions
- `default-param-last`, `no-useless-empty-export`, `no-loop-func`
- `return-await` — only in try-catch

**TypeScript Rules (warnings)**:

- `consistent-type-imports` — prefer `import type`, inline style
- `explicit-function-return-type` — allow expressions/higher-order
- `prefer-nullish-coalescing`, `prefer-optional-chain`, `no-shadow`

**Core JS (errors)**:

- `no-console` — only warn/error allowed
- `eqeqeq` — always strict equality
- `no-var`, `prefer-const`, `no-eval`, `no-implied-eval`, `no-new-func`
- `prefer-template`, `no-param-reassign` (props: false)

**Security (errors)**: detect-eval-with-expression, detect-no-csrf, detect-buffer-noassert, detect-disable-mustache-escape, detect-new-buffer
**Security (warnings)**: detect-object-injection, detect-non-literal-regexp, detect-timing-attacks, detect-non-literal-fs, detect-child-process, detect-pseudoRandomBytes, detect-unsafe-regex

**Unicorn (errors)**: prefer-node-protocol, no-nested-ternary, prefer-string-slice
**Unicorn (warnings)**: no-array-for-each, no-useless-undefined, prefer-ternary, prefer-array-find/some/includes, prefer-number-properties, no-lonely-if, no-array-push-push, prefer-spread, prefer-string-replace-all, prefer-at

**Import-x (errors)**: no-duplicates (prefer-inline), first, newline-after-import, no-mutable-exports, no-self-import, no-useless-path-segments
**Sort-imports (warn)**: ignoreCase, ignoreDeclarationSort

### Backend File-Specific Restrictions

**All logic files** (service, controller, repo, module, guard, interceptor, filter, pipe, manager, utility):

- NO inline `TSInterfaceDeclaration` — extract to types/ file
- NO inline `TSTypeAliasDeclaration` — extract to types/ file
- NO inline `TSEnumDeclaration` — extract to common/enums/
- NO top-level `const` — extract to constants/ file
- NO standalone `FunctionDeclaration` — extract to utilities/
- NO string literal unions (`'a' | 'b'`) — use enums

**Service files** (`*.service.ts`): max 50 lines/function, complexity 10
**Manager files** (`*.manager.ts`): max 80 lines/function, complexity 15
**Controller files** (`*.controller.ts`): + NO try/catch, NO throw
**Repository files** (`*.repository.ts`): + NO throw (return data, let services decide)
**Test files** (`*.spec.ts`): all restrictions OFF, `any` allowed

### Frontend ESLint

**Additional Plugins**: eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y

**React Rules (errors)**: jsx-no-target-blank, jsx-boolean-value (never), jsx-curly-brace-presence (never), self-closing-comp, no-danger, no-unstable-nested-components, jsx-no-useless-fragment, jsx-no-constructed-context-values
**React Hooks (errors)**: rules-of-hooks, exhaustive-deps (warn)
**Accessibility**: alt-text, anchor-is-valid (errors); click-events-have-key-events, no-static-element-interactions, label-has-associated-control (warnings)

**Additional Core Rules**: no-nested-ternary, curly (all), no-else-return, object-shorthand, no-useless-rename, no-script-url

**Import Order**: enforced groups (builtin > external > internal > parent > sibling > index), `@/**` treated as internal, alphabetized, newlines between groups

### Frontend File-Specific Restrictions

**TSX component files**:

- NO inline types/interfaces/enums — extract to src/types/
- NO inline hooks (`useX`) — extract to src/hooks/
- NO SCREAMING_CASE constants — extract to src/constants/
- NO utility functions (format/parse/transform/etc.) — extract to src/utilities/
- NO module-level const (except component definitions) — extract to src/constants/
- NO non-PascalCase function declarations — only component definitions allowed

**Hooks/stores files**: NO inline types/enums, NO inline constants (except objects/calls)
**Service files**: NO inline types/enums, NO inline constants
**shadcn/ui files** (`src/components/ui/`): all restrictions OFF (auto-generated, do not edit)
**Test files**: all restrictions OFF

### Commit Lint

Conventional commits required: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`
Subject: max 100 chars, no sentence-case/start-case/pascal-case/upper-case

---

## Backend Architecture Rules

### Layer Responsibilities

```
Controller → Service → Repository (data access only)
                    → Manager (complex logic, external calls)
```

### Controller Rules

- 3-line methods ONLY: extract params, call ONE service method, return result
- NO try/catch — use GlobalExceptionFilter
- NO business logic — delegate everything to services
- NO direct database access
- ONE service call per endpoint

### Service Rules

- **Max 30 lines per method** — if longer, extract helper methods or delegate to manager
- Split complex methods into smaller private methods
- Each public method does ONE thing
- Validate ownership/permissions here (not in controller or repository)
- Publish events here (not in controller)
- If a method grows beyond 30 lines, refactor immediately:
  - Extract validation logic to a private method
  - Extract transformation logic to a private method
  - Move complex orchestration to a Manager class

### Manager Rules

- **Max 80 lines per method, complexity limit 15**
- Handles complex orchestration (multiple service calls, external APIs, retries)
- If a method grows beyond 80 lines, break into smaller private methods
- Each private helper should be <30 lines
- Name clearly: `buildPromptString()`, `fetchConnectorConfig()`, `parseResponse()`

### Repository Rules

- Pure data access ONLY — no business logic, no throw statements
- Return data or null — let services decide what to do
- Each method maps to ONE database operation
- Use Prisma/Mongoose query builders — no raw SQL

### DTO/Validation Rules

- ALL input validated with Zod schemas
- Every `z.string()` MUST have `.max()` for length limits
- Every `z.array()` MUST have `.max()` for size limits
- Zod schemas go in `src/modules/<domain>/dto/<name>.dto.ts`
- Export both the schema and the inferred type

### Error Handling

- All errors use `BusinessException` with a machine-readable `code` string
- Entity-not-found uses `EntityNotFoundException`
- Forbidden access uses `BusinessException` with `HttpStatus.FORBIDDEN`
- NEVER swallow errors silently — always log and rethrow or handle explicitly

### Extraction Rules (Backend)

| What             | Where                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| Types/interfaces | `src/modules/<domain>/types/<name>.types.ts`                                    |
| Enums            | `src/common/enums/<name>.enum.ts`                                               |
| Constants        | `src/common/constants/<name>.constants.ts` or `src/modules/<domain>/constants/` |
| Utilities        | `src/common/utilities/<name>.utility.ts`                                        |
| DTOs             | `src/modules/<domain>/dto/<name>.dto.ts`                                        |
| Errors           | `src/common/errors/`                                                            |
| Pipes            | `src/app/pipes/`                                                                |
| Guards           | `src/app/guards/`                                                               |
| Filters          | `src/app/filters/`                                                              |
| Interceptors     | `src/app/interceptors/`                                                         |
| Decorators       | `src/app/decorators/`                                                           |

---

## Frontend Architecture Rules

### Component Architecture

```
Page (.tsx) → Controller Hook (useX) → Service → Repository/API
```

### Page Rules (`.tsx` files in `src/app/`)

- Pure render composition ONLY — no logic, no hooks (except ONE controller hook)
- Must handle: loading state, empty state, error state
- No inline styles — use Tailwind classes via `cn()` utility
- No default exports except Next.js pages/layouts

### Component Rules

- Each component does ONE thing — if it's doing two things, split it
- Props-only data flow — components NEVER fetch data internally
- Use shadcn/ui for ALL form inputs (Input, Select, Textarea, Checkbox, etc.)
- No raw HTML `<select>`, `<input>`, `<textarea>`
- No `dangerouslySetInnerHTML`
- Every component that needs logic gets its own hook

### Hook Rules

- **Split large hooks into smaller focused hooks** — each hook does ONE thing
- Controller hooks orchestrate smaller hooks, they don't contain business logic
- Pattern: `useSendMessage()`, `useThreadDetail()`, `useThreadSettings()` — NOT one giant `useChat()`
- All GET requests via TanStack Query `useQuery` with proper query key factories
- All mutations via TanStack Query `useMutation` with `onSuccess` invalidation
- Never call `useQuery`/`useMutation` directly in `.tsx` files — wrap in custom hooks
- Hooks go in `src/hooks/<domain>/use-<name>.ts` — NEVER inside component files

### State Management Rules

- TanStack Query for ALL server state (queries + mutations)
- Zustand for MINIMAL client-only state (auth, sidebar, log filters)
- React hooks for component-level state
- No prop drilling beyond 2 levels — use context or composition
- No redundant state — if it can be derived, derive it

### Styling Rules

- CSS variables for theming (`--background`, `--foreground`, `--primary`, etc.)
- Semantic Tailwind classes (`text-muted-foreground`, `bg-card`, `border-border`)
- NO `dark:` prefixes — CSS variables handle dark mode automatically
- NO raw color classes (`text-blue-500`) for semantic meaning
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Mobile-first with `sm:`, `md:`, `lg:` breakpoints

### Extraction Rules (Frontend)

| What                 | Where                                              |
| -------------------- | -------------------------------------------------- |
| Types                | `src/types/<domain>.types.ts`                      |
| Component prop types | `src/types/component.types.ts`                     |
| Enums                | `src/enums/<name>.enum.ts`                         |
| Constants            | `src/constants/<name>.constants.ts`                |
| Hooks                | `src/hooks/<domain>/use-<name>.ts`                 |
| Utilities            | `src/utilities/<name>.utility.ts`                  |
| Repositories         | `src/repositories/<domain>/<domain>.repository.ts` |
| Query keys           | `src/repositories/shared/query-keys.ts`            |
| Zod schemas          | `src/lib/validation/<name>.schema.ts`              |
| Stores               | `src/stores/<name>.store.ts`                       |
| i18n types           | `src/types/i18n.types.ts`                          |

### i18n Rules

- 8 languages: EN, AR, DE, ES, FR, IT, PT, RU (Arabic is RTL)
- ALL user-facing text must use `t('key')` from `useTranslation()`
- NEVER hardcode text in components
- Locale files: `src/lib/i18n/locales/{en,ar,de,es,fr,it,pt,ru}.ts`
- When adding new text: add to ALL 8 locale files
- Type-safe keys defined in `src/types/i18n.types.ts`

### Frontend Key Rules Summary

- No `any` types anywhere
- No `eslint-disable` comments
- No `console.log` — only `console.warn` and `console.error`
- All imports of types use `import type { ... }` syntax
- All new pages need loading, empty, and error states
- All new API calls go through repositories
- TSX files contain only render composition — ZERO business logic

---

## Data Models (Quick Reference)

### Auth (PostgreSQL)

- `User` — email, username, passwordHash, role (ADMIN/OPERATOR/VIEWER), status, preferences
- `Session` — userId, refreshToken, expiresAt (rotation implemented)
- `SystemSetting` — key/value store

### Chat (PostgreSQL)

- `ChatThread` — userId, title, routingMode, preferredProvider/Model, contextPackIds[], systemPrompt, temperature, maxTokens
- `ChatMessage` — threadId, role, content, provider, model, routingMode, inputTokens, outputTokens, latencyMs, feedback, metadata(JSON)
- `MessageAttachment` — messageId, fileId, type

### Connectors (PostgreSQL)

- `Connector` — name, provider (6 types), status, encryptedConfig (AES-256-GCM), baseUrl
- `ConnectorModel` — modelKey, displayName, lifecycle, capability flags (streaming/tools/vision/audio)
- `ConnectorHealthEvent`, `ModelSyncRun`

### Routing (PostgreSQL)

- `RoutingDecision` — selectedProvider/Model, confidence, reasonTags[], privacyClass, costClass, fallback
- `RoutingPolicy` — name, routingMode, priority, config(JSON), isActive

### Memory (PostgreSQL + pgvector)

- `MemoryRecord` — userId, type (FACT/PREFERENCE/INSTRUCTION/SUMMARY), content, sourceThreadId/MessageId, isEnabled
- `ContextPack` — name, description, scope
- `ContextPackItem` — type, content, fileId, sortOrder

### Files (PostgreSQL)

- `File` — userId, filename, mimeType, sizeBytes, storagePath, ingestionStatus
- `FileChunk` — fileId, chunkIndex, content

### Ollama (PostgreSQL)

- `LocalModel` — name, tag, runtime, family, parameters, sizeBytes
- `LocalModelRoleAssignment` — modelId, role (ROUTER/FALLBACK_CHAT/REASONING/CODING), isActive
- `PullJob`, `RuntimeConfig`

### Audit (MongoDB)

- `AuditLog` — userId, action, entityType, entityId, severity, details
- `UsageLedger` — resourceType, action, quantity, unit, metadata

### Logs (MongoDB, TTL 30 days)

- `ClientLog` — level, message, component, action, userId, route, userAgent
- `ServerLog` — level, serviceName, module, action, requestId, traceId, userId, threadId

---

## Event Bus (RabbitMQ)

Exchange: `claw.events` (topic, durable). DLQ + 3 retries with backoff.

| Event                             | Publisher    | Consumers      |
| --------------------------------- | ------------ | -------------- |
| message.created                   | chat         | routing        |
| message.routed                    | routing      | chat           |
| message.completed                 | chat         | audit, memory  |
| thread.created                    | chat         | —              |
| user.login/logout                 | auth         | audit          |
| connector.created/updated/deleted | connector    | audit          |
| connector.synced                  | connector    | audit, routing |
| connector.health_checked          | connector    | audit, routing |
| routing.decision_made             | routing      | audit          |
| memory.extracted                  | memory       | audit          |
| file.uploaded/chunked             | file         | —              |
| log.server                        | all services | server-logs    |

---

## Message Flow (End-to-End)

```
1. User sends message → POST /chat-messages {content, provider?, model?, fileIds?}
2. Chat service creates USER message, publishes message.created
3. Routing service receives → Ollama router (temp=0, Zod validated) or heuristic
4. Routing publishes message.routed {selectedProvider, selectedModel, fallback}
5. Chat service receives → ContextAssemblyManager.assemble():
   - Fetch memories from memory-service (HTTP, user-scoped, limit 20)
   - Fetch context pack items from memory-service (HTTP, per attached pack)
   - Fetch file chunks from file-service (HTTP, per attached file)
   - Build prompt: system → memories → packs → files → thread history
   - Token budget truncation (keeps head, drops tail)
6. ChatExecutionManager.execute(): calls Ollama or cloud provider with fallback chain
7. Store ASSISTANT message, update thread.lastProvider/Model
8. SSE emitCompletion() to connected clients
9. Publish message.completed (includes content for memory extraction)
10. Memory service extracts FACT/PREFERENCE/INSTRUCTION/SUMMARY via Ollama (with dedup check)
11. Audit service records usage + audit log
```

---

## Local Ollama Models (auto-pulled on startup)

| Model       | Params | Size  | Best For                                      |
| ----------- | ------ | ----- | --------------------------------------------- |
| gemma3:4b   | 4B     | 3.3GB | Default local chat + routing (Google Gemma 3) |
| llama3.2:3b | 3B     | 2.0GB | Local reasoning (Meta Llama 3.2)              |
| phi3:mini   | 3.8B   | 2.2GB | Local coding + math (Microsoft Phi-3)         |
| gemma2:2b   | 2B     | 1.6GB | Fast local general purpose (Google Gemma 2)   |
| tinyllama   | 1.1B   | 637MB | Very fast but limited — routing fallback only |

Default router model: `gemma3:4b` (configurable via `OLLAMA_ROUTER_MODEL`)
Default memory extraction model: `gemma3:4b` (configurable via `MEMORY_EXTRACTION_MODEL`)
Models auto-synced to DB on ollama-service startup.

## Routing Modes

| Mode           | Behavior                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------ |
| AUTO           | Ollama router decides (temp=0, Zod schema, provider allowlist, 10s timeout → heuristic fallback) |
| MANUAL_MODEL   | User-selected provider+model (forcedProvider/forcedModel)                                        |
| LOCAL_ONLY     | Always local-ollama/gemma3:4b                                                                    |
| PRIVACY_FIRST  | Local if healthy, else Anthropic                                                                 |
| LOW_LATENCY    | OpenAI/gpt-4o-mini                                                                               |
| HIGH_REASONING | Anthropic/claude-opus-4                                                                          |
| COST_SAVER     | Local if healthy, else cheapest cloud                                                            |

Active policies (sorted by priority) can override the mode.

### Intelligent Routing Rules (AUTO mode)

| Task                           | Routes To                              |
| ------------------------------ | -------------------------------------- |
| Coding, debugging, code review | Anthropic / claude-sonnet-4            |
| Deep reasoning, architecture   | Anthropic / claude-opus-4              |
| Image/video/YouTube/web search | Gemini / gemini-2.5-flash              |
| Math, algorithms               | DeepSeek or local phi3:mini            |
| Creative writing, chat         | OpenAI / gpt-4o-mini                   |
| Simple Q&A, translations       | local-ollama / gemma3:4b               |
| File/data analysis             | Gemini / gemini-2.5-flash              |
| Privacy-sensitive              | local-ollama / gemma3:4b (never cloud) |

---

## Security

- JWT + refresh token rotation (argon2 password hashing)
- RBAC: ADMIN, OPERATOR, VIEWER (AuthGuard + RolesGuard on all services)
- Rate limiting: @nestjs/throttler (100 req/min, configurable via THROTTLE_TTL/THROTTLE_LIMIT)
- Helmet security headers on all 11 services
- Zod validation on all DTOs
- Prisma ORM (no raw SQL)
- AES-256-GCM encryption for connector API keys
- Pino log redaction (authorization, password, refreshToken, apiKey, token, secret)
- X-Request-ID correlation from frontend to backend

---

## Nginx Route Map (port 4000 → services)

| Frontend Path            | Backend Service  | Notes                              |
| ------------------------ | ---------------- | ---------------------------------- |
| /api/v1/auth/\*          | auth:4001        | Login, refresh, logout, me         |
| /api/v1/users/\*         | auth:4001        | User CRUD (admin)                  |
| /api/v1/chat-threads/\*  | chat:4002        | Thread CRUD                        |
| /api/v1/chat-messages/\* | chat:4002        | Message CRUD, feedback, regenerate |
| /api/v1/connectors/\*    | connector:4003   | Connector CRUD, test, sync         |
| /api/v1/routing/\*       | routing:4004     | Policies, decisions, evaluate      |
| /api/v1/memories/\*      | memory:4005      | Memory CRUD                        |
| /api/v1/context-packs/\* | memory:4005      | Context pack CRUD                  |
| /api/v1/files/\*         | file:4006        | Upload, list, chunks               |
| /api/v1/audits/\*        | audit:4007       | Audit logs                         |
| /api/v1/usage/\*         | audit:4007       | Usage statistics                   |
| /api/v1/ollama/\*        | ollama:4008      | Models, pull, generate             |
| /api/v1/health           | health:4009      | Aggregated health                  |
| /api/v1/client-logs      | client-logs:4010 | Frontend log ingestion             |
| /api/v1/server-logs      | server-logs:4011 | Backend log viewer                 |

---

## Frontend (Next.js)

### Pages (17)

login, dashboard, chat, chat/[threadId], connectors, connectors/[id], models, models/local, routing, memory, context, files, observability, audits, logs, admin, settings

### State Management

- TanStack Query: all server state (queries + mutations)
- Zustand: minimal client state (auth, sidebar, log filters)
- React hooks: component-level state

### UI Stack

- shadcn/ui + Radix UI primitives + Tailwind CSS + Lucide icons
- Dark mode via CSS variables, system preference detection
- i18n: 8 languages (EN, AR, FR, DE, ES, IT, PT, RU), RTL support for Arabic
- Mobile responsive (collapsible sidebar, responsive grids)

### Key Chat Components

- `ModelSelector` — grouped dropdown (Auto + provider groups)
- `FileAttachmentPicker` — paperclip button with file checkboxes
- `ContextPackSelector` — checkbox list in thread settings
- `RoutingTransparency` — expandable decision details (confidence, reasons, privacy/cost)
- `MessageBubble` — provider/model badge, feedback, regenerate, token counts
- `MessageComposer` — textarea + model selector + file picker
- `ThreadSettings` — system prompt, temperature, max tokens, model, context packs
- `ThinkingIndicator` — shown during polling for AI response

---

## Docker Compose

```bash
docker compose -f docker-compose.dev.yml up -d    # Full dev environment (~22 containers)
./scripts/claw.sh up                              # Via management script
./scripts/claw.sh --prod up                       # Production mode
```

All services use `env_file: .env` from root. Single `.env` file for everything.

### Hot Reload Matrix

| Change                | Action                                                    | Downtime |
| --------------------- | --------------------------------------------------------- | -------- |
| Source code (src/)    | Auto-detected by `node --watch`                           | None     |
| Prisma schema         | Rebuild container (`prisma migrate deploy` in entrypoint) | ~30s     |
| package.json deps     | Rebuild container                                         | ~60s     |
| Docker compose config | `docker compose up -d` (recreate)                         | ~10s     |
| .env values           | Restart containers                                        | ~5s      |
| Shared packages       | Rebuild package + restart dependents                      | ~30s     |
| Nginx config          | Restart nginx container                                   | ~2s      |

---

## Environment Variables

Single root `.env` (copy from `.env.example`). Groups:

- General: NODE_ENV, CORS_ORIGINS, THROTTLE_TTL/LIMIT
- PostgreSQL: PG\_\*\_USER/PASSWORD/DB/PORT (7 instances)
- MongoDB: MONGO_USER/PASSWORD/DB/PORT
- Redis: REDIS_URL/PORT
- RabbitMQ: RABBITMQ_USER/PASSWORD/URL/PORT/MANAGEMENT_PORT
- JWT: JWT_SECRET/ACCESS_EXPIRY/REFRESH_EXPIRY
- Encryption: ENCRYPTION_KEY (64 hex chars)
- Admin: ADMIN_EMAIL/USERNAME/PASSWORD
- Frontend: NEXT_PUBLIC_API_URL/APP_NAME/APP_URL, FRONTEND_PORT
- Ollama: OLLAMA_BASE_URL, OLLAMA_ROUTER_MODEL, OLLAMA_ROUTER_TIMEOUT_MS, MEMORY_EXTRACTION_MODEL
- Files: FILE_STORAGE_PATH
- Inter-service URLs: \*\_SERVICE_URL (11 entries)
- Per-service ports: \*\_PORT (11 entries)
- Per-service database URLs: _\_DATABASE_URL/_\_MONGODB_URI (10 entries)

---

## Quality Gates

### Pre-Commit Hook (5 steps, all must pass)

```bash
1. prettier --write        # Format staged files
2. npm run lint            # ESLint all workspaces (0 errors required)
3. npm run typecheck       # TypeScript strict (0 errors required)
4. npm run build           # Production build all workspaces
5. npm run test            # All tests pass (312+ tests across 9 services)
```

### CI/CD (GitHub Actions)

4 jobs: lint → typecheck → test → build (build depends on ALL 3 passing)

## Commands

```bash
npm run lint               # Lint all
npm run typecheck          # TypeScript check all
npm run build              # Build all
npm run test               # Test all
docker compose -f docker-compose.dev.yml up -d   # Start dev
docker compose -f docker-compose.dev.yml down     # Stop
docker compose -f docker-compose.dev.yml logs -f chat-service  # Follow logs
./scripts/claw.sh status   # Check all service status
```
