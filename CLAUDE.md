# ClawAI — Complete Project Reference

## What This Is

Local-first AI orchestration platform. 13 NestJS microservices + Next.js frontend + 9 PostgreSQL + MongoDB + Redis + RabbitMQ + Ollama. Monorepo with npm workspaces.

## Architecture at a Glance

```
Frontend (Next.js 16, port 3000)
  → Nginx reverse proxy (port 4000)
    → 11 backend services (ports 4001-4011)
      → RabbitMQ (async events, topic exchange: claw.events)
      → 9 PostgreSQL (pgvector), 1 MongoDB (3 databases), 1 Redis
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
  claw-image-service/       # Port 4012, PG claw_images  — image generation, DALL-E/Gemini/SD adapters
  claw-file-generation-service/ # Port 4013, PG claw_file_generations — file export (PDF/DOCX/CSV/HTML/MD/TXT/JSON)
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
5. **ALL Docker compose files** — `docker-compose.dev.yml`, `docker-compose.yml` (prod), `docker-compose.dev.ollama.yml`, `docker-compose.prod.ollama.yml`, and any split compose files — if new service, port, volume, database, or AI runtime dependency
6. **i18n locale files** — if any new user-facing text (ALL 8 locales: en, ar, de, es, fr, it, pt, ru)
7. **Architecture docs** (`docs/`) — if the change affects documented architecture
8. **Prisma migrations** — if any schema change (`npx prisma migrate dev --name <name>`)
9. **Seed files** — if new default data needed (e.g., admin user, default policies)
10. **Test files** — create or update tests for every code change
11. **Frontend types** — sync `src/types/` with backend DTO/schema changes
12. **`CLAUDE.md`** — if adding new services, env vars, patterns, or rules

13. **`.github/workflows/ci.yml`** — add new service to the Prisma generate loop and test env vars
14. **`infra/nginx/nginx.conf`** — add upstream + location block for the new service
15. **`packages/shared-constants`** — add service port and service name constants
16. **`packages/shared-types`** — add new event patterns if the service publishes events
17. **Health service** (`apps/claw-health-service`) — add the new service URL to health check list
18. **`apps/claw-frontend`** — update model selectors, types, hooks, and components if user-facing

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

### No Inline Declarations Rule (Backend)

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in ANY of these file types:

- `*.service.ts`, `*.manager.ts`, `*.controller.ts`, `*.repository.ts`
- `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`
- `*.interceptor.ts`, `*.pipe.ts`, `*.module.ts`, `*.provider.ts`

All declarations MUST be in their dedicated files per the extraction table below.
The only exception: `private readonly logger = new Logger(...)` inside NestJS classes (this is the standard NestJS pattern).

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

- **Single responsibility** — each hook does exactly ONE thing (state, query, mutation, etc.)
- **Max 50 lines per hook** (excluding imports and types). If exceeded, split into smaller hooks.
- Controller hooks orchestrate smaller hooks, they don't contain business logic
- Pattern: `useSendMessage()`, `useThreadDetail()`, `useThreadSettings()` — NOT one giant `useChat()`
- All GET requests via TanStack Query `useQuery` with proper query key factories
- All mutations via TanStack Query `useMutation` with `onSuccess` invalidation
- Never call `useQuery`/`useMutation` directly in `.tsx` files — wrap in custom hooks
- Hooks go in `src/hooks/<domain>/use-<name>.ts` — NEVER inside component files
- **NEVER** define `type`, `interface`, `enum`, or `const` inline in hook files — extract to `src/types/`, `src/enums/`, `src/constants/`
- **NEVER** call React hooks directly in `.tsx` files — ALL hook usage must be via a single controller hook
- **NEVER** define inline sub-components (helper JSX functions) in `.tsx` files — extract each to its own `.tsx` file

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
| image.generated                   | image        | audit          |
| image.failed                      | image        | audit          |
| file.generated                    | file-gen     | audit          |
| file_generation.failed            | file-gen     | audit          |

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

### Parallel Multi-Model Flow

```
1. User sends parallel request → POST /chat-messages/parallel {content, models[], threadId, fileIds?}
2. Chat service creates USER message
3. ContextAssemblyManager.assemble() builds prompt once (shared across all models)
4. ParallelExecutionManager fires 2-5 LLM calls via Promise.allSettled()
5. Each fulfilled result stored as separate ASSISTANT message with provider/model metadata
6. All results returned in a single response with per-model latency and token counts
7. message.completed published for each successful response
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
Auto-pull list configurable via `AUTO_PULL_MODELS` env var (space-separated).

## Model Catalog (30 Models, 6 Categories)

Users browse and download models from the built-in catalog at `/models/catalog`. Models are organized by category:

| Category         | Models                                                                         | Runtime |
| ---------------- | ------------------------------------------------------------------------------ | ------- |
| Coding           | Qwen 2.5 Coder 32B/14B/7B, DeepSeek Coder V2 16B, StarCoder2 7B                | Ollama  |
| File Generation  | Qwen 3 7B, Llama 3.3 8B, Mistral Small 3 7B, Phi-4 14B, Gemma 3 9B             | Ollama  |
| Image Generation | FLUX.2 Dev, FLUX.1 Schnell, SD 3.5, SDXL-Lightning, Z-Image-Turbo              | ComfyUI |
| Routing          | Qwen 3 1.7B, Phi-4-mini 3.8B, SmolLM2 1.7B, Gemma 3 4B, Mistral Small 3 7B     | Ollama  |
| Reasoning        | DeepSeek R1 32B/14B/7B, QwQ 32B, Phi-4 14B                                     | Ollama  |
| Thinking         | GLM-4.7 Thinking, DeepSeek V3.2, MiMo-V2-Flash, Qwen 3.5 27B, Llama 4 Maverick | Ollama  |

### Model Roles

| Role                   | Purpose                             |
| ---------------------- | ----------------------------------- |
| ROUTER                 | Makes routing decisions (AUTO mode) |
| LOCAL_FALLBACK_CHAT    | Default local chat model            |
| LOCAL_CODING           | Specialized for code tasks          |
| LOCAL_REASONING        | Chain-of-thought reasoning          |
| LOCAL_FILE_GENERATION  | Structured output for files         |
| LOCAL_THINKING         | Agentic/search/research tasks       |
| LOCAL_IMAGE_GENERATION | Local diffusion model               |

### Catalog API Endpoints

| Endpoint                              | Method    | Description                 |
| ------------------------------------- | --------- | --------------------------- |
| /api/v1/ollama/catalog                | GET       | Browse catalog with filters |
| /api/v1/ollama/catalog/:id            | GET       | Single catalog entry        |
| /api/v1/ollama/catalog/:id/pull       | POST      | Download model from catalog |
| /api/v1/ollama/pull-jobs              | GET       | List active downloads       |
| /api/v1/ollama/pull-jobs/:id/progress | GET (SSE) | Real-time download progress |
| /api/v1/ollama/pull-jobs/:id          | DELETE    | Cancel download             |

### Dynamic Routing

The router prompt is now built dynamically based on installed models:

- `PromptBuilderManager` fetches installed models from ollama-service internal API
- Groups by category, only includes healthy + installed models
- Cached with 5-minute TTL, invalidated on MODEL_PULLED/MODEL_DELETED events
- Category-aware routing: coding tasks → LOCAL_CODING model, reasoning → LOCAL_REASONING, etc.
- 1650+ detection keywords across 33 capability classes (2274 lines in routing.constants.ts)
- 30 privacy keywords force local routing (zero cloud exposure)
- 5-stage routing pipeline: Privacy → Image → File → Category → Ollama/Heuristic
- 115 models in catalog across 13 domains
- Validated at 99.1% accuracy (150-prompt final validation, 500+ total experiments)

### 33 Capability Classes (1650+ Keywords)

The routing engine classifies messages into 33 capability classes with 1650+ keywords across 2274 lines of routing constants. Below are the top 15 classes by keyword count:

| Class                 | Keywords    | Local Role              |
| --------------------- | ----------- | ----------------------- |
| Coding                | 100         | LOCAL_CODING            |
| Image Generation      | 70+         | LOCAL_IMAGE_GENERATION  |
| Infrastructure        | 33          | LOCAL_CODING            |
| Data Analysis         | 33          | LOCAL_REASONING         |
| Privacy (enforcement) | 30          | Forces local (no cloud) |
| Business              | 30          | LOCAL_FILE_GENERATION   |
| Creative Writing      | 26          | LOCAL_FALLBACK_CHAT     |
| Security              | 25          | LOCAL_CODING            |
| Reasoning             | 21          | LOCAL_REASONING         |
| Legal                 | 21          | LOCAL_REASONING         |
| Medical               | 19          | LOCAL_REASONING         |
| File Generation       | 34          | LOCAL_FILE_GENERATION   |
| Thinking              | 15          | LOCAL_THINKING          |
| Translation           | 12          | LOCAL_FALLBACK_CHAT     |
| General Chat          | 0 (default) | LOCAL_FALLBACK_CHAT     |

Additional 18 classes cover: HR, Education, Sales, Logistics, Hospitality, Science, Government, Finance, Executive, and other specialty domains with dedicated keyword arrays.

## Routing Modes

| Mode           | Behavior                                                                       |
| -------------- | ------------------------------------------------------------------------------ |
| AUTO           | 5-stage pipeline: privacy → image → file → category → Ollama/heuristic         |
| MANUAL_MODEL   | User-selected provider+model (forcedProvider/forcedModel)                      |
| LOCAL_ONLY     | Category-aware: coding→LOCAL_CODING, reasoning→LOCAL_REASONING, else gemma3:4b |
| PRIVACY_FIRST  | Local if healthy, else Anthropic                                               |
| LOW_LATENCY    | OpenAI/gpt-4o-mini                                                             |
| HIGH_REASONING | Anthropic/claude-opus-4                                                        |
| COST_SAVER     | Local if healthy, else cheapest cloud                                          |

Active policies (sorted by priority) can override the mode.

### Routing Replay Lab

`POST /routing/replay` -- re-runs historical routing decisions against the current router configuration. Returns old-vs-new comparison per decision and an aggregated summary (totalReplayed, changedCount, improvedCount, regressedCount, avgConfidenceDelta). Managed by `ReplayManager` in the routing service. Frontend page at `/routing/replay` with filters, summary card, and results table.

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

### File Upload Security (FileSecurityManager)

Every file upload goes through 4 security checks before being saved:

1. **Antivirus Scan** — ClamAV Docker container (`clamav/clamav:stable`, port 3310). Files sent via TCP INSTREAM protocol. Graceful degradation if ClamAV is down (fail-safe: rejects).
2. **Magic Byte Validation** — Verifies file content matches declared MIME type (PDF, PNG, JPEG, GIF, WebP, ZIP/DOCX signatures).
3. **Filename Validation** — Blocks path traversal (`../`, `\`, `/`), null bytes, double extensions (`.exe.pdf`), 30+ dangerous extensions (`.exe`, `.dll`, `.bat`, `.ps1`, `.vbs`, etc.).
4. **ZIP Bomb Detection** — Checks for suspicious null byte patterns in archives.

Failed checks → HTTP 422 with reason codes. Filenames sanitized before storage (special chars → underscores).

**Env vars**: `CLAMAV_HOST` (default: `clamav`), `CLAMAV_PORT` (default: `3310`), `CLAMAV_ENABLED` (default: `true`)

---

## Nginx Route Map (port 4000 → services)

| Frontend Path            | Backend Service  | Notes                              |
| ------------------------ | ---------------- | ---------------------------------- |
| /api/v1/auth/\*          | auth:4001        | Login, refresh, logout, me         |
| /api/v1/users/\*         | auth:4001        | User CRUD (admin)                  |
| /api/v1/chat-threads/\*  | chat:4002        | Thread CRUD                        |
| /api/v1/chat-messages/\* | chat:4002        | Message CRUD, feedback, regenerate, parallel compare |
| /api/v1/connectors/\*    | connector:4003   | Connector CRUD, test, sync         |
| /api/v1/routing/\*       | routing:4004     | Policies, decisions, evaluate, replay |
| /api/v1/memories/\*      | memory:4005      | Memory CRUD                        |
| /api/v1/context-packs/\* | memory:4005      | Context pack CRUD                  |
| /api/v1/files/\*         | file:4006        | Upload, list, chunks               |
| /api/v1/audits/\*        | audit:4007       | Audit logs                         |
| /api/v1/usage/\*         | audit:4007       | Usage statistics                   |
| /api/v1/ollama/\*        | ollama:4008      | Models, pull, generate             |
| /api/v1/health           | health:4009      | Aggregated health                  |
| /api/v1/client-logs      | client-logs:4010 | Frontend log ingestion             |
| /api/v1/server-logs      | server-logs:4011 | Backend log viewer                 |
| /api/v1/images           | image:4012       | Image generation                   |
| /api/v1/file-generations | file-gen:4013    | File export (PDF/DOCX/CSV/etc.)    |

---

## Frontend (Next.js)

### Pages (19)

login, dashboard, chat, chat/[threadId], chat/compare, connectors, connectors/[id], models, models/local, routing, routing/replay, memory, context, files, observability, audits, logs, admin, settings

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
- Per-service ports: \*\_PORT (12 entries)
- Per-service database URLs: _\_DATABASE_URL/_\_MONGODB_URI (11 entries)
- Image: STABLE_DIFFUSION_URL, IMAGE_SERVICE_URL, IMAGE_PORT, IMAGE_DATABASE_URL
- ComfyUI: COMFYUI_BASE_URL, COMFYUI_PORT
- Model Catalog: AUTO_PULL_MODELS (space-separated list of models to auto-pull on Docker startup)

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

---

## Complete Software Development Lifecycle

**Every feature implementation MUST follow this exact process from start to finish. No shortcuts.**

### Phase 1: Understand the Feature

1. Read the requirements fully before writing any code
2. Identify ALL services that will be affected (backend + frontend + infrastructure)
3. Check the Event Bus table — does this feature need new events?
4. Check the Nginx Route Map — does this feature need new routes?
5. Check the Data Models — does this need schema changes?

### Phase 2: Plan the Implementation

1. List every file that needs to change (controllers, services, repositories, DTOs, types, hooks, components, tests, configs)
2. Determine the order: shared packages → backend → events → frontend → tests → docs
3. Identify cross-service communication needed (HTTP internal endpoints, RabbitMQ events, SSE)

### Phase 3: Backend Implementation

For each affected backend service, follow this exact order:

1. **Prisma schema** — Add/modify models, then `npx prisma migrate dev --name <name>`
2. **Enums** — Add to `src/common/enums/` AND `packages/shared-types` if cross-service
3. **Types** — Add to `src/modules/<domain>/types/<name>.types.ts`
4. **Constants** — Add to `src/common/constants/` or `src/modules/<domain>/constants/`
5. **DTOs** — Create Zod schemas in `src/modules/<domain>/dto/<name>.dto.ts`
6. **Repository** — Pure data access, no business logic, no throw
7. **Service** — Business logic, max 30 lines/method, ownership validation here
8. **Manager** — Complex orchestration only if needed, max 80 lines/method
9. **Controller** — 3-line methods only: extract params, call service, return
10. **Module** — Register new providers/controllers in the module file
11. **Events** — Add event pattern to `packages/shared-types`, publish in service, subscribe in consumers
12. **Tests** — Unit tests for every new service method and DTO

### Phase 4: SSE / Real-time Features (Critical Lessons Learned)

When implementing SSE (Server-Sent Events) endpoints:

1. **Use `@SkipLogging()` decorator** on SSE controllers — pino-http's autoLogging conflicts with SSE streaming, causing "Cannot set headers after they are sent to the client"
2. **Use `@SkipThrottle()`** on SSE endpoints — rate limiting on long-lived connections is wrong
3. **Exclude SSE routes from pino-http autoLogging** in `app.module.ts`:
   ```typescript
   autoLogging: {
     ignore: (req) => req.url?.includes('/stream/') ?? false,
   }
   ```
4. **GlobalExceptionFilter** must check `response.headersSent` before writing error responses
5. **Nginx config** for SSE endpoints MUST have:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Connection "";
   proxy_read_timeout 86400;
   proxy_buffering off;
   proxy_cache off;
   ```
6. **Never use EventSource API** — it cannot set Authorization headers. Use `fetch()` with `ReadableStream` instead (see `src/utilities/sse.utility.ts`)
7. **Never pass JWT tokens in URL query params** — they leak in server logs, browser history, and Referer headers

### Phase 5: Error Handling in Async Flows (Critical Lessons Learned)

When a background/async operation fails (e.g., all LLM providers fail):

1. **Always store an error message in the database** — the frontend polls for new messages; if no message is stored, polling runs forever
2. **Emit SSE error events** so the frontend can react immediately (before the next poll)
3. **Frontend must handle both paths**: SSE error event (fast) AND polling finding the error message (fallback)
4. The error message should be stored as a regular record (e.g., ASSISTANT role with `metadata: { error: true }`) so the frontend's existing polling logic naturally picks it up
5. Never silently swallow errors in RabbitMQ event handlers — at minimum log AND store a user-visible error

### Phase 6: Frontend Implementation

For each frontend change, follow this exact order:

1. **Types** — Add to `src/types/<domain>.types.ts` AND export from `src/types/index.ts`
2. **Enums** — Add to `src/enums/<name>.enum.ts` AND export from `src/enums/index.ts`
3. **Constants** — Add to `src/constants/<name>.constants.ts` AND export from `src/constants/index.ts`
4. **Repository** — Add API call in `src/repositories/<domain>/<domain>.repository.ts`
5. **Query keys** — Add to `src/repositories/shared/query-keys.ts`
6. **Hooks** — Create in `src/hooks/<domain>/use-<name>.ts` (one hook = one responsibility)
7. **Components** — Build in `src/components/<feature>/`, TSX = render only
8. **Page** — Wire in `src/app/(portal)/<route>/page.tsx` with ONE controller hook
9. **i18n** — Add text to ALL 8 locale files
10. **Utilities** — If needed, wrap in `src/utilities/<name>.utility.ts` AND export from index
11. **Tests** — Vitest tests for utilities, hooks, components

### Phase 7: Infrastructure & Config Updates (MANDATORY — every single one)

Check and update ALL of these:

1. **`.env.example`** — add/remove/rename any environment variable with example values
2. **`.env`** — fill the new variable with a working dev value
3. **`scripts/install.sh`** — add the variable to the generated .env block
4. **`scripts/install.ps1`** — same for Windows PowerShell installer
5. **ALL Docker compose files** — `docker-compose.dev.yml`, `docker-compose.yml` (prod), `docker-compose.dev.ollama.yml`, `docker-compose.prod.ollama.yml`, and any split compose files — if new service, port, volume, database, or AI runtime dependency
6. **`infra/nginx/nginx.conf`** — add upstream + location block for the new service (SSE routes need `proxy_buffering off`)
7. **`packages/shared-constants`** — add service port and service name constants
8. **`packages/shared-types`** — add new event patterns if the service publishes events
9. **`apps/claw-health-service`** — add the new service URL to health check list
10. **`.github/workflows/ci.yml`** — add new service to the Prisma generate loop and test env vars
11. **i18n locale files** — if any new user-facing text (ALL 8 locales: en, ar, de, es, fr, it, pt, ru)
12. **Architecture docs** (`docs/`) — if the change affects documented architecture
13. **Prisma migrations** — if any schema change (`npx prisma migrate dev --name <name>`)
14. **Seed files** — if new default data needed (e.g., catalog entries, default policies)
15. **Test files** — create or update tests for every code change
16. **Frontend types** — sync `src/types/` with backend DTO/schema changes
17. **`CLAUDE.md`** — if adding new services, env vars, patterns, or rules
18. **`apps/claw-frontend`** — update model selectors, types, hooks, and components if user-facing

**Never skip any of these.** A feature is incomplete if any of these are missing.

### Phase 8: Validation (ALL must pass before considering done)

```bash
# 1. TypeScript — 0 errors in ALL changed workspaces
npm run typecheck

# 2. ESLint — 0 errors (warnings OK if pre-existing)
npm run lint

# 3. Tests — ALL pass
npm run test

# 4. Build — production build succeeds
npm run build

# 5. Docker — restart affected services and verify healthy
docker compose -f docker-compose.dev.yml restart <service-name>
docker compose -f docker-compose.dev.yml ps <service-name>  # must show (healthy)
```

**NEVER skip pre-commit hooks.** The pre-commit hook runs 5 steps:

1. `prettier --write` — format staged files
2. `npm run lint` — ESLint all workspaces (0 errors required)
3. `npm run typecheck` — TypeScript strict (0 errors required)
4. `npm run build` — production build all workspaces
5. `npm run test` — all tests pass

If pre-commit fails, fix the issue and create a NEW commit. NEVER use `--no-verify`.

### Phase 9: E2E API Testing

Test the feature end-to-end using curl or the frontend:

1. **Get a valid JWT token**: `POST /api/v1/auth/login`
2. **Test the happy path**: send a valid request, verify response
3. **Test through nginx** (port 4000): verify nginx routes correctly
4. **Test directly to service** (e.g., port 4002): isolate service issues from nginx issues
5. **Test error paths**: invalid input, missing auth, forbidden access, provider failures
6. **Test async flows**: send message → verify SSE events → verify DB records → verify polling stops
7. **Check service logs**: `docker compose logs <service> --since 1m` for errors

### Phase 10: Cross-Service Flow Verification

For features involving multiple services (e.g., message flow):

1. Verify RabbitMQ events are published: check logs for "Published event: <pattern>"
2. Verify events are consumed: check consumer service logs
3. Verify SSE events reach the frontend (if applicable)
4. Verify database records are created in the correct service's DB
5. Verify audit logging captures the action

### Phase 11: Documentation

1. Update `CLAUDE.md` if new patterns, services, env vars, or rules were added
2. Update `docs/` if architecture changed
3. Update service-specific `CLAUDE.md` files (e.g., `apps/claw-chat-service/CLAUDE.md`)

---

## How to Add a New Local Model

1. **Add to model catalog seed** (`apps/claw-ollama-service/prisma/seed-catalog.ts`):
   ```typescript
   { name: 'model-name', tag: '7b', displayName: 'Model Name 7B',
     category: 'CODING', description: '...', sizeBytes: BigInt(5_000_000_000),
     parameterCount: '7B', runtime: 'OLLAMA', ollamaName: 'model-name:7b',
     isRecommended: false, capabilities: ['code_generation'] }
   ```
2. **Run seed**: `cd apps/claw-ollama-service && npx tsx prisma/seed-catalog.ts`
3. **Update routing constants** if the model has a new category pattern (`apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts`)
4. **Update CLAUDE.md** — add to the Model Catalog table
5. **Update docker auto-pull** if the model should be pre-installed (`.env` → `AUTO_PULL_MODELS`)

## How to Add a New Backend Service

1. **Copy boilerplate** from closest existing service (e.g., `claw-ollama-service`)
2. **Create PostgreSQL database** in all Docker compose files (dev, prod, ollama variants)
3. **Add service container** to all Docker compose files with port, env_file, depends_on, healthcheck
4. **Assign port** — next available after 4013 (add to `packages/shared-constants`)
5. **Add env vars** to `.env`, `.env.example`, `scripts/install.sh`, `scripts/install.ps1`
6. **Add nginx route** in `infra/nginx/nginx.conf` (use resolver pattern, not upstream blocks)
7. **Add health check** in `apps/claw-health-service`
8. **Add to CI** in `.github/workflows/ci.yml` — Prisma generate loop + test env vars
9. **Add event patterns** to `packages/shared-types` if the service publishes events
10. **Add frontend types/hooks/pages** if user-facing
11. **Add to ALL 8 i18n locales** if new user-facing text
12. **Update CLAUDE.md** — workspace layout, nginx table, event bus table, env vars section

## How to Add a New Frontend Feature

1. **Types** → `src/types/<domain>.types.ts` + export from `src/types/index.ts`
2. **Enums** → `src/enums/<name>.enum.ts` + export from `src/enums/index.ts`
3. **Constants** → `src/constants/<name>.constants.ts` + export from `src/constants/index.ts`
4. **Repository** → `src/repositories/<domain>/<domain>.repository.ts` (API calls)
5. **Query keys** → `src/repositories/shared/query-keys.ts`
6. **Hooks** → `src/hooks/<domain>/use-<name>.ts` (ONE hook = ONE responsibility)
7. **Components** → `src/components/<feature>/` (TSX = pure render, ZERO hooks)
8. **Page** → `src/app/(portal)/<route>/page.tsx` (ONE controller hook, loading/empty/error states)
9. **i18n** → ALL 8 locale files (`src/lib/i18n/locales/{en,ar,de,es,fr,it,pt,ru}.ts`)
10. **Navigation** → `src/constants/sidebar.constants.ts` + `src/constants/routes.constants.ts`
11. **No inline types/consts/enums** in any .tsx or hook file — extract to dedicated files
12. **No React hooks in .tsx** — only ONE controller hook call per page/component

---

## Known Gotchas & Hard-Won Lessons

### SSE Streaming

- pino-http `autoLogging` + NestJS `@Sse` = "Cannot set headers" crash. Always exclude SSE routes.
- `LoggingInterceptor` calling `response.setHeader()` also conflicts. Use `@SkipLogging()`.
- Nginx MUST have `proxy_buffering off` for SSE. Without it, events are buffered and never reach the client.
- The SSE location block in nginx MUST come BEFORE the generic service location block (nginx uses longest prefix match, but explicit ordering prevents surprises).

### Fallback & Error Handling

- When all LLM providers fail, you MUST store an error message as an ASSISTANT record. Without it, the frontend's polling condition (`lastMessage.role === ASSISTANT`) is never met, and "AI is thinking..." spins forever.
- The `ChatExecutionManager` emits SSE error events AND throws. The `handleMessageRouted` catch block must store the error message BEFORE re-throwing.
- Frontend polling has a 3-minute max (90 polls at 1s interval) as a safety net.

### Authentication

- Never use `EventSource` API for authenticated SSE — it can't set headers
- Use `fetch()` with `Authorization: Bearer` header instead (see `sse.utility.ts`)
- Token refresh interceptor in `http-client.ts` handles 401 → refresh → retry automatically for REST calls, but NOT for SSE connections

### Docker & Hot Reload

- Source changes in `src/` are auto-detected by `node --watch` — no restart needed
- Shared package changes (`packages/*`) require rebuilding the package AND restarting dependent services
- Prisma schema changes require container rebuild (migration runs in entrypoint)
- Nginx config changes require `docker compose restart nginx`

### Testing

- Frontend tests may fail on the host due to rollup native binary issues with Node.js v24+. Run inside Docker or use the vitest process cache.
- Backend tests run with Jest, frontend with Vitest — different APIs
- Test files (`*.spec.ts`, `*.test.ts`) have all ESLint restrictions OFF

---

## Documentation System

Full documentation lives in `docs/` organized by layer:

```
docs/
  00-start-here/          # Index, onboarding, system overview
  01-executive-context/   # Product vision, business overview
  02-business-product/    # Personas, features, user journeys
  03-architecture/        # System architecture, message flow, routing, events, security
  04-backend/             # Services index, controllers reference, coding standards, shared packages
  05-frontend/            # Frontend architecture, coding standards
  06-data/                # Database reference, environment variables
  07-integrations/        # AI provider catalog
  08-runtime-devops/      # Docker guide, CI/CD, nginx reference
  09-testing/             # Testing strategy
  10-uat-acceptance/      # UAT guide, business acceptance
  11-runbooks/            # Troubleshooting, operational runbooks
  12-reference/           # API reference, error catalog
  13-adr/                 # Architecture Decision Records
  14-risk-debt/           # Technical debt, risk register
  15-ai-context/          # AI agent context pack, codebase navigation
```
