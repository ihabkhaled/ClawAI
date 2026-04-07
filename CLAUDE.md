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

## Universal Rules (MUST follow everywhere)

### Code Rules
1. NEVER use `any` — use `unknown`, generics, or proper types
2. NEVER disable ESLint rules — fix the underlying issue
3. NEVER use string literal unions — use enums from `src/enums/` or `src/common/enums/`
4. NEVER compare domain values with raw strings — use enum comparisons
5. NEVER log secrets, tokens, API keys, passwords
6. NEVER expose secrets to the frontend
7. NEVER allow missing explicit return types
8. NEVER build god-files — keep modules focused
9. NEVER define types/interfaces/enums/constants inline — extract to dedicated files
10. NEVER put business logic in controllers (3-line methods: extract, call, return)
11. NEVER put Prisma/Mongoose calls outside repositories
12. NEVER cross database boundaries — use RabbitMQ or HTTP
13. Each service owns its data — no shared databases
14. Use `type` over `interface` unless declaration merging needed

### Library Wrapping Rule
Every third-party library MUST be wrapped in `src/common/utilities/<name>.utility.ts`. Services/controllers NEVER import third-party packages directly.

### Extraction Rules (Backend)
| What | Where |
|------|-------|
| Types/interfaces | `src/modules/<domain>/types/<name>.types.ts` |
| Enums | `src/common/enums/<name>.enum.ts` |
| Constants | `src/common/constants/<name>.constants.ts` or `src/modules/<domain>/constants/` |
| Utilities | `src/common/utilities/<name>.utility.ts` |

### Extraction Rules (Frontend)
| What | Where |
|------|-------|
| Types | `src/types/<domain>.types.ts` |
| Enums | `src/enums/<name>.enum.ts` |
| Constants | `src/constants/<name>.constants.ts` |
| Hooks | `src/hooks/<domain>/use-<name>.ts` |
| Utilities | `src/utilities/<name>.utility.ts` |
| Repositories | `src/repositories/<domain>/<domain>.repository.ts` |
| Schemas | `src/lib/validation/<name>.schema.ts` |

### Frontend Rules
- TSX files = pure render composition ONLY — no logic, no hooks (except 1 controller hook)
- All GET requests via TanStack Query `useQuery`
- All mutations via TanStack Query `useMutation`
- No raw HTML inputs — use shadcn/ui components
- No `dangerouslySetInnerHTML`
- No `console.log` — only `console.warn` and `console.error`
- No default exports except Next.js pages/layouts

### Backend Architecture
```
Controller → Service → Repository (data access only)
                    → Manager (complex logic, external calls)
```
- Controllers: 3-line methods, no try/catch (use GlobalExceptionFilter)
- Services: max 30 lines per method
- Managers: max 80 lines per method, complexity limit 15
- Repositories: pure data access, no throw statements

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

| Event | Publisher | Consumers |
|-------|-----------|-----------|
| message.created | chat | routing |
| message.routed | routing | chat |
| message.completed | chat | audit, memory |
| thread.created | chat | — |
| user.login/logout | auth | audit |
| connector.created/updated/deleted | connector | audit |
| connector.synced | connector | audit, routing |
| connector.health_checked | connector | audit, routing |
| routing.decision_made | routing | audit |
| memory.extracted | memory | audit |
| file.uploaded/chunked | file | — |
| log.server | all services | server-logs |

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
10. Memory service extracts FACT/PREFERENCE/INSTRUCTION/SUMMARY via Ollama
11. Audit service records usage + audit log
```

---

## Routing Modes
| Mode | Behavior |
|------|----------|
| AUTO | Ollama router decides (temp=0, Zod schema, provider allowlist, 5s timeout → heuristic fallback) |
| MANUAL_MODEL | User-selected provider+model (forcedProvider/forcedModel) |
| LOCAL_ONLY | Always local-ollama/tinyllama |
| PRIVACY_FIRST | Local if healthy, else Anthropic |
| LOW_LATENCY | OpenAI/gpt-4o-mini |
| HIGH_REASONING | Anthropic/claude-opus-4 |
| COST_SAVER | Local if healthy, else cheapest cloud |

Active policies (sorted by priority) can override the mode.

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

## Frontend (Next.js)

### Pages (17)
login, dashboard, chat, chat/[threadId], connectors, connectors/[id], models, models/local, routing, memory, context, files, observability, audits, logs, admin, settings

### State Management
- TanStack Query: all server state (queries + mutations)
- Zustand: minimal client state (auth, sidebar, log filters)
- React hooks: component-level state

### UI
- shadcn/ui + Radix UI primitives + Tailwind CSS + Lucide icons
- Dark mode via CSS variables (no `dark:` prefix), system preference detection
- i18n: 8 languages (EN, AR, FR, DE, ES, IT, PT, RU), RTL support for Arabic
- Mobile responsive (collapsible sidebar, responsive grids)

### Key Chat Components
- `ModelSelector` — grouped dropdown (Auto + provider groups)
- `FileAttachmentPicker` — paperclip button with file checkboxes
- `ContextPackSelector` — checkbox list in thread settings
- `RoutingTransparency` — expandable decision details (confidence, reasons, privacy/cost)
- `MessageBubble` — provider/model badge, feedback, regenerate, token counts

---

## Docker Compose
```bash
docker compose -f docker-compose.dev.yml up -d    # Full dev environment (~22 containers)
./scripts/claw.sh up                              # Via management script
./scripts/claw.sh --prod up                       # Production mode
```

All services use `env_file: .env` from root. Single `.env` file for everything.

### Hot Reload
- Source code changes: auto-detected by `node --watch` (no rebuild)
- Prisma schema changes: rebuild container (runs `prisma migrate deploy` in entrypoint)
- package.json changes: rebuild container
- .env changes: restart container
- Shared packages: rebuild package + restart dependent services

---

## Environment Variables
Single root `.env` (copy from `.env.example`). Groups:
- General: NODE_ENV, CORS_ORIGINS, THROTTLE_TTL/LIMIT
- PostgreSQL: PG_*_USER/PASSWORD/DB/PORT (7 instances)
- MongoDB: MONGO_USER/PASSWORD/DB/PORT
- Redis: REDIS_URL/PORT
- RabbitMQ: RABBITMQ_USER/PASSWORD/URL/PORT/MANAGEMENT_PORT
- JWT: JWT_SECRET/ACCESS_EXPIRY/REFRESH_EXPIRY
- Encryption: ENCRYPTION_KEY (64 hex chars)
- Admin: ADMIN_EMAIL/USERNAME/PASSWORD
- Frontend: NEXT_PUBLIC_API_URL/APP_NAME/APP_URL, FRONTEND_PORT
- Ollama: OLLAMA_BASE_URL, OLLAMA_ROUTER_MODEL, OLLAMA_ROUTER_TIMEOUT_MS, MEMORY_EXTRACTION_MODEL
- Files: FILE_STORAGE_PATH
- Inter-service URLs: *_SERVICE_URL (11 entries)
- Per-service ports: *_PORT (11 entries)
- Per-service database URLs: *_DATABASE_URL/*_MONGODB_URI (10 entries)

**MANDATORY**: When adding new env vars, update ALL of: `.env`, `.env.example`, `scripts/install.sh`, `scripts/install.ps1`

---

## Quality Gates (Pre-Commit Hook)
```bash
1. prettier --write        # Format staged files
2. npm run lint            # ESLint all workspaces (0 errors required)
3. npm run typecheck       # TypeScript strict (0 errors required)
4. npm run build           # Production build all workspaces
5. npm run test            # All tests pass (312 tests across 9 services)
```

## CI/CD (GitHub Actions)
4 jobs: lint → typecheck → test → build (build depends on all 3 passing)

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
