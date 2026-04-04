# Master Implementation Prompt — Enterprise Microservices Platform

You are a principal architect and full-stack engineer. Your task is to **design, scaffold, and implement** a complete microservices platform with extreme architectural discipline, strict lint compliance, strong security, high performance, full testability, and excellent UX.

This prompt is a **hard specification**. Follow every rule exactly.

---

# 1. MONOREPO STRUCTURE

Use **npm workspaces** monorepo:

```
project/
├── apps/
│   ├── frontend/                 # Next.js (App Router)
│   ├── auth-service/             # NestJS microservice
│   ├── chat-service/             # NestJS microservice
│   ├── connector-service/        # NestJS microservice
│   ├── routing-service/          # NestJS microservice
│   ├── memory-service/           # NestJS microservice
│   ├── file-service/             # NestJS microservice
│   ├── audit-service/            # NestJS microservice (MongoDB)
│   ├── ollama-service/           # NestJS microservice (no DB)
│   └── health-service/           # NestJS aggregator (stateless)
├── packages/
│   ├── shared-types/             # Shared enums, types, event contracts
│   ├── shared-constants/         # Service ports, names, exchange config
│   ├── shared-rabbitmq/          # RabbitMQ NestJS module
│   └── shared-auth/              # JWT guard + decorators
├── infra/
│   └── nginx/nginx.conf          # Reverse proxy config
├── docker-compose.yml            # Production (multi-stage builds)
├── docker-compose.dev.yml        # Dev overlay (hot-reload, volume mounts)
├── .env                          # All environment variables
├── .env.example                  # Template with placeholders
├── package.json                  # Root workspace config
├── commitlint.config.cjs         # Conventional commits
├── .lintstagedrc.cjs             # lint-staged config
├── .prettierrc                   # Prettier config
├── .husky/
│   ├── pre-commit                # lint-staged + lint + typecheck + build + test
│   ├── commit-msg                # commitlint
│   └── install.mjs               # Skip in CI/production
└── docs/
    ├── adrs/                     # Architecture Decision Records
    ├── MASTER_IMPLEMENTATION_PROMPT.md
    └── ...
```

Root `package.json`:
```json
{
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "format": "prettier --write \"**/*.{ts,tsx,json,md,css}\"",
    "docker:up": "docker compose up -d",
    "docker:dev": "docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d",
    "docker:down": "docker compose down",
    "prepare": "node .husky/install.mjs",
    "lint-staged": "lint-staged"
  }
}
```

---

# 2. TECHNOLOGY STACK

## Frontend
- **Next.js 14** (App Router), TypeScript (strict), Tailwind CSS, **shadcn/ui**
- **TanStack Query v5** for server state (useQuery/useMutation)
- **Zustand** for minimal client state
- **React Hook Form + Zod** for forms
- **Vitest + React Testing Library** for tests
- **Playwright** for E2E

## Backend (each microservice)
- **NestJS 10**, TypeScript (strict)
- **Prisma ORM** (PostgreSQL services) or **Mongoose** (MongoDB services)
- **ioredis** for Redis
- **amqplib** for RabbitMQ
- **Zod** for DTO validation (NOT class-validator)
- **argon2** for password hashing (NOT bcrypt)
- **jsonwebtoken** for JWT
- **nestjs-pino** for structured logging
- **Jest** for tests

## Infrastructure
- **6 PostgreSQL 16 instances** (pgvector) — one per relational service, fault-isolated
- **1 MongoDB 7** — audit/telemetry
- **1 Redis 7** — caching, sessions, rate limiting
- **1 RabbitMQ 3** — async event bus (topic exchange)
- **1 Nginx** — stateless reverse proxy
- **1 Ollama** — local AI runtime (optional profile)

---

# 3. ABSOLUTE CODING RULES (NEVER VIOLATE)

## Universal (Frontend + Backend)
1. NEVER use `any` — use `unknown`, generics, or proper types.
2. NEVER disable ESLint rules — no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
3. NEVER use `==` or `!=` — always `===` and `!==`.
4. NEVER use `var` — use `const` (preferred) or `let`.
5. NEVER use `!` non-null assertion — use proper null checks.
6. NEVER use string literal unions for domain values — define enums.
7. NEVER compare domain values with raw strings — use enum comparisons.
8. NEVER log secrets, tokens, API keys, passwords.
9. NEVER allow missing explicit return types on functions.
10. NEVER build god-files — keep modules focused and short.
11. NEVER define types, interfaces, enums, constants, or standalone functions inline in logic files (controllers, services, managers, repositories, hooks, components, stores). Extract to dedicated files and import.
12. NEVER import third-party libraries directly in business logic — wrap every library in a utility module (e.g., `hashing.utility.ts` wraps `argon2`). If the library changes, only the wrapper file is modified.
13. Use `type` over `interface` unless declaration merging is needed.
14. Use enums for ALL domain constants.
15. Prefer predictable code over clever code.

## Backend-Specific
16. NEVER use `console.log` — use NestJS Logger service.
17. NEVER use `process.env` directly — use Zod-validated AppConfig.
18. NEVER use class-validator or class-transformer — use Zod.
19. NEVER put business logic in controllers — call ONE service method.
20. NEVER put Prisma/Mongoose calls outside repositories.
21. NEVER put business logic in repositories — pure data access only.
22. NEVER use `@UsePipes()` at method level when `@Param()` is present.
23. EVERY exception must use `BusinessException` with a `messageKey`.
24. Service methods max 30 lines — extract to utility files.
25. Controllers are 3-line methods: extract params → call ONE service → return.
26. No floating promises — `await` or `void`.
27. No N+1 queries — use includes, batch queries.
28. Every FK indexed, every WHERE column indexed.
29. Paginate all list endpoints.
30. All Zod schemas must have `.max()` on every string and array field.

## Frontend-Specific
31. TSX files = pure render composition ONLY — no hooks, no logic, no constants.
32. All hooks in `src/hooks/`, one per file.
33. All types in `src/types/`, all enums in `src/enums/`, all constants in `src/constants/`.
34. All GET requests use TanStack Query `useQuery`.
35. All mutations use TanStack Query `useMutation`.
36. Query keys must be structured factories in `src/repositories/shared/query-keys.ts`.
37. All protected pages use auth guard.
38. Every page needs loading, empty, and error states.
39. Use shadcn/ui for all form inputs — no raw HTML inputs.
40. No `dangerouslySetInnerHTML`.
41. No secrets in localStorage or browser state.

---

# 4. ARCHITECTURE PATTERNS

## Backend: Controller → Service → Manager → Repository

| Layer | Responsibility | Rules |
|-------|---------------|-------|
| **Controller** | HTTP transport, DTO binding, guards | Call ONE service method. No business logic. No try/catch. No throw. |
| **Service** | Thin orchestrator, transaction coordination | Max 30 lines/method. Call managers/repos. Extract helpers to utilities. |
| **Manager** | Complex domain/process logic | Routing decisions, prompt assembly, fallback chains, multi-step orchestration. Max 80 lines/method. |
| **Repository** | Pure data access (Prisma/Mongoose) | No business logic. No throwing exceptions. Return raw results. |
| **Utilities** | Extracted helper functions | No types/enums/constants inline. Only exported functions. |

## Frontend: View → Controller (Hook) → Service → Repository

| Layer | Responsibility | Rules |
|-------|---------------|-------|
| **View (TSX)** | Pure render composition | No hooks except controller hook. No inline logic. |
| **Controller (Hook)** | Orchestrates state, queries, mutations | Returns view-ready data. Delegates to services. |
| **Service** | Business logic, data transformation | Thin wrappers. Delegates to repositories. |
| **Repository** | API transport, typed HTTP calls | One function per endpoint. Uses shared API client. |

---

# 5. MICROSERVICE DATABASE OWNERSHIP

| Service | Port | Database Engine | Database Name | Tables Owned |
|---------|------|----------------|---------------|-------------|
| Auth | 4001 | PostgreSQL | `svc_auth` | users, sessions, system_settings |
| Chat | 4002 | PostgreSQL | `svc_chat` | chat_threads, chat_messages, message_attachments |
| Connector | 4003 | PostgreSQL | `svc_connectors` | connectors, connector_models, health_events, sync_runs |
| Routing | 4004 | PostgreSQL | `svc_routing` | routing_decisions, routing_policies |
| Memory | 4005 | PostgreSQL+pgvector | `svc_memory` | memory_records, context_packs, context_pack_items |
| File | 4006 | PostgreSQL | `svc_files` | files, file_chunks |
| Audit | 4007 | MongoDB | `svc_audit` | audit_logs, usage_ledger |
| Ollama | 4008 | None (Redis) | — | Local model proxy |
| Health | 4009 | None (stateless) | — | Aggregates health from all |

**Each service has its own database instance (separate Docker container).** No shared databases. Inter-service data via RabbitMQ events or HTTP calls.

---

# 6. INTER-SERVICE COMMUNICATION

| Pattern | When | Example |
|---------|------|---------|
| **RabbitMQ (async)** | Fire-and-forget events | `message.created`, `connector.synced`, `audit.event` |
| **HTTP (sync)** | Need immediate response | Chat calls Auth to validate user |
| **Nginx (frontend→services)** | All frontend API calls | Path-based routing: `/api/v1/auth/*` → auth-service |

RabbitMQ exchange: topic exchange named `claw.events`. Durable queues per service.

---

# 7. DOCKER INFRASTRUCTURE

## docker-compose.yml (production)
- 6 PostgreSQL instances (ports 5441-5446)
- 1 MongoDB (port 27018 host)
- 1 Redis (port 6380 host)
- 1 RabbitMQ (ports 5672 + 15672 management)
- 9 microservices (ports 4001-4009), multi-stage Dockerfiles
- 1 Nginx reverse proxy (port 80)
- 1 Frontend (port 3000)
- 1 Ollama (port 11434, optional `local-ai` profile)
- ALL values from `.env` — nothing hardcoded in docker-compose.yml

## docker-compose.dev.yml (development overlay)
- Volume mounts `src/` for hot-reload
- Uses `Dockerfile.dev` (npm run dev, no multi-stage)
- Usage: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`

## Per-service Dockerfile (production)
```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN npm install --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate  # if Prisma service
RUN npm run build
RUN cp -r src/generated dist/generated  # if Prisma service

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma  # if Prisma service
EXPOSE <PORT>
CMD ["node", "dist/main.js"]
```

## Per-service Dockerfile.dev (development)
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate  # if Prisma service
EXPOSE <PORT>
CMD ["npm", "run", "dev"]
```

---

# 8. ENVIRONMENT VARIABLES

ALL configuration from `.env` files. Never hardcode in docker-compose or source code.

```env
# Per PostgreSQL instance
PG_<SERVICE>_USER=user
PG_<SERVICE>_PASSWORD=secret
PG_<SERVICE>_DB=svc_name

# MongoDB
MONGO_USER=user
MONGO_PASSWORD=secret
MONGO_DB=svc_audit

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
RABBITMQ_USER=user
RABBITMQ_PASSWORD=secret

# JWT (shared across services)
JWT_SECRET=random-64-char-string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption (AES-256-GCM)
ENCRYPTION_KEY=64-hex-chars

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:80,http://localhost

# Admin seed
ADMIN_EMAIL=admin@app.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:80
FRONTEND_PORT=3000

# Ollama
OLLAMA_BASE_URL=http://ollama:11434
```

Each service has Zod-validated `AppConfig` that reads from `process.env` at startup and fails loudly if required vars are missing.

---

# 9. ESLINT CONFIGURATION (STRICT)

## Backend (per service — eslint.config.mjs)
- Base: `js.configs.recommended` + `tseslint.configs.strict`
- Plugins: `eslint-plugin-security`, `eslint-plugin-unicorn`, `eslint-plugin-import-x`
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-non-null-assertion`: error
- `@typescript-eslint/no-unused-vars`: error (allow `_` prefix)
- `@typescript-eslint/consistent-type-imports`: warn (inline style)
- `@typescript-eslint/explicit-function-return-type`: warn
- `@typescript-eslint/no-floating-promises`: error
- `@typescript-eslint/no-misused-promises`: error
- `@typescript-eslint/no-extraneous-class`: off (NestJS modules)
- `eqeqeq`: error
- `no-console`: warn (allow warn/error)
- `prefer-const`: error
- `no-var`: error
- `prefer-template`: warn
- `no-nested-ternary`: warn
- `complexity`: warn (15 global, 10 services)
- **no-restricted-syntax** for ALL logic files (controller, service, repository, module, guard, interceptor, filter, pipe):
  - Ban `TSInterfaceDeclaration` — extract to types files
  - Ban `TSTypeAliasDeclaration` — extract to types files
  - Ban `TSEnumDeclaration` — extract to enums files
  - Ban `Program > VariableDeclaration[kind="const"]` — extract to constants files
  - Ban `FunctionDeclaration` — extract to utility files
  - Ban string literal union types
- **Repository-specific**: also ban `ThrowStatement`
- **Controller-specific**: also ban `TryStatement`, `ThrowStatement`
- **Service-specific**: `max-lines-per-function: 50`, `complexity: 10`
- **Manager-specific**: `max-lines-per-function: 80`, `complexity: 15`
- **Utility-specific**: ban types, enums, constants (only functions allowed)
- **Test files**: relax strict rules
- **Ignore**: `dist/`, `node_modules/`, `coverage/`, `src/generated/`

## Frontend (eslint.config.mjs)
- Base: TypeScript strict + React + React Hooks + JSX-A11y
- Plugins: `eslint-plugin-security`, `eslint-plugin-unicorn`, `eslint-plugin-import-x`
- Same TypeScript strict rules as backend
- **no-restricted-syntax** for TSX files:
  - Ban `TSEnumDeclaration` (→ src/enums/)
  - Ban `TSInterfaceDeclaration`, `TSTypeAliasDeclaration` (→ src/types/)
  - Ban inline hooks (`FunctionDeclaration[id.name=/^use[A-Z]/]`) (→ src/hooks/)
  - Ban SCREAMING_CASE const declarations (→ src/constants/)
  - Ban utility function declarations (→ src/utilities/)
- **shadcn/ui components** (`src/components/ui/`): exempt from separation-of-concerns rules
- **Test files**: relax strict rules

---

# 10. TYPESCRIPT CONFIGURATION (ALL STRICT FLAGS)

```json
{
  "compilerOptions": {
    "strict": true,
    "alwaysStrict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitOverride": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnusedLabels": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "allowUnreachableCode": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

Backend adds: `experimentalDecorators`, `emitDecoratorMetadata`, `target: ES2022`, `module: commonjs`.
Frontend adds: `jsx: preserve`, `module: esnext`, `moduleResolution: bundler`.

---

# 11. PRETTIER CONFIGURATION

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Frontend additionally uses `prettier-plugin-tailwindcss`.

---

# 12. HUSKY + COMMITLINT + LINT-STAGED

## .husky/pre-commit (5 steps)
```sh
#!/usr/bin/env sh
echo "HUSKY PRE-COMMIT RUNNING"

echo "Step 1/5: lint-staged (prettier)"
npx lint-staged || exit 1

echo "Step 2/5: lint (eslint per workspace)"
npm run lint || exit 1

echo "Step 3/5: typecheck"
npm run typecheck || exit 1

echo "Step 4/5: build"
npm run build || exit 1

echo "Step 5/5: test"
npm run test || exit 1

echo "All pre-commit checks passed"
```

## .husky/commit-msg
```sh
#!/usr/bin/env sh
npx --no -- commitlint --edit ${1}
```

## commitlint.config.cjs
Conventional commits: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Subject max 100 chars.

## .lintstagedrc.cjs
- `*.{ts,tsx,js,jsx,json,css,md,yml,yaml}` → prettier --write

---

# 13. TESTING STRATEGY

## Backend (Jest per service)
- Coverage threshold: 70% (branches, functions, lines, statements)
- Unit tests for services, managers, utilities, guards, pipes
- Integration tests for API endpoints
- `--passWithNoTests` flag for services without tests yet
- Path aliases in jest.config.ts matching tsconfig paths

## Frontend (Vitest + React Testing Library)
- Coverage threshold: 60%
- Unit tests for utilities, enums, stores, query keys
- Component tests with Testing Library
- E2E tests with Playwright
- Exclude `src/components/ui/` from coverage (auto-generated shadcn)

---

# 14. SECURITY

- **Passwords**: argon2id (never bcrypt, never plaintext)
- **JWT**: access tokens (15min) + refresh tokens (7d) with rotation
- **Secrets at rest**: AES-256-GCM encryption for provider API keys
- **Auth guards**: JWT validation in every service via shared-auth package
- **Role-based access**: ADMIN, OPERATOR, VIEWER roles
- **Rate limiting**: Auth endpoints 5/min, AI endpoints 10/min
- **Input validation**: Zod DTOs with .max() on all strings/arrays
- **CORS**: Explicit origins from env, credentials enabled
- **No secret leakage**: Never in logs, API responses, frontend state
- **Database isolation**: Each service has its own DB container

---

# 15. DOCUMENTATION REQUIREMENTS

Create these files:
- `README.md` — Project overview, quick start, architecture diagram, service table
- `INSTALL.md` — Prerequisites, Docker setup, migrations, seeding, first login
- `ARCHITECTURE.md` — System diagram, service boundaries, communication patterns
- `SECURITY.md` — Secret handling, auth flow, rate limiting, CORS
- `TESTING.md` — Testing strategy, running tests, coverage
- `CONTRIBUTING.md` — Development workflow, code standards, PR process, commit conventions
- `ENVIRONMENT_VARIABLES.md` — Complete reference for all env vars
- `CHANGELOG.md` — Version history
- `CODE_OF_CONDUCT.md` — Contributor Covenant
- `CLAUDE.md` (root) — Universal rules, architecture, commands
- `CLAUDE.md` (per service) — Service-specific rules, ownership, events
- `docs/adrs/` — Architecture Decision Records

---

# 16. PER-SERVICE MODULE STRUCTURE

```
apps/<service-name>/
├── src/
│   ├── app/
│   │   ├── app.module.ts
│   │   ├── config/app.config.ts        # Zod-validated env
│   │   ├── guards/auth.guard.ts        # JWT guard
│   │   ├── guards/roles.guard.ts       # Role guard
│   │   ├── decorators/                 # @Public, @CurrentUser, @Roles
│   │   ├── filters/                    # GlobalExceptionFilter
│   │   ├── pipes/                      # ZodValidationPipe
│   │   └── interceptors/              # LoggingInterceptor
│   ├── common/
│   │   ├── enums/                      # Domain enums
│   │   ├── types/                      # Shared types
│   │   ├── constants/                  # Constants
│   │   ├── errors/                     # BusinessException
│   │   └── utilities/                  # Library wrappers + helpers
│   ├── infrastructure/
│   │   ├── database/prisma/            # PrismaModule, PrismaService
│   │   └── redis/                      # RedisModule, RedisService
│   ├── modules/<domain>/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── managers/                   # Complex logic (optional)
│   │   ├── repositories/
│   │   ├── dto/
│   │   ├── types/
│   │   ├── constants/
│   │   ├── service.utilities/
│   │   └── <domain>.module.ts
│   ├── generated/prisma/              # Prisma generated client
│   └── main.ts
├── prisma/
│   ├── schema.prisma                   # Only this service's tables
│   ├── migrations/
│   └── seed.ts
├── CLAUDE.md
├── Dockerfile
├── Dockerfile.dev
├── .env
├── .env.example
├── eslint.config.mjs
├── tsconfig.json
├── jest.config.ts
└── package.json
```

---

# 17. FRONTEND STRUCTURE

```
apps/frontend/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/login/page.tsx
│   │   ├── (portal)/layout.tsx        # Auth guard + sidebar shell
│   │   ├── (portal)/chat/page.tsx
│   │   ├── (portal)/connectors/page.tsx
│   │   └── ...
│   ├── components/
│   │   ├── ui/                        # shadcn/ui (auto-generated, exempt from rules)
│   │   ├── common/                    # DataTable, PageHeader, EmptyState, StatusBadge
│   │   └── layout/                    # Sidebar, Topbar, UserMenu
│   ├── hooks/                         # Controller hooks (one per file)
│   ├── services/                      # Business logic orchestration
│   ├── repositories/                  # API call wrappers
│   ├── enums/                         # All domain enums
│   ├── types/                         # All domain types
│   ├── constants/                     # All constants
│   ├── utilities/                     # All utility functions
│   ├── stores/                        # Zustand stores
│   └── lib/                           # Framework utils (cn, validation schemas)
├── CLAUDE.md
├── eslint.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── next.config.mjs                    # output: 'standalone' for Docker
└── package.json
```

---

# 18. SHARED PACKAGES

## @shared/types
All enums (UserRole, ConnectorProvider, RoutingMode, etc.), shared types (JwtPayload, PaginatedResult), and RabbitMQ event contracts (EventPattern enum + typed payloads).

## @shared/constants
Service ports (4001-4009), service names, RabbitMQ exchange name, pagination defaults.

## @shared/rabbitmq
NestJS dynamic module with `RabbitMQService.publish(pattern, payload)` and `subscribe(pattern, handler)`.

## @shared/auth
Standalone JWT `AuthGuard`, `RolesGuard`, and decorators (`@Public()`, `@Roles()`, `@CurrentUser()`).

---

# 19. NGINX REVERSE PROXY

```nginx
events { worker_connections 1024; }
http {
    server {
        listen 80;
        location /api/v1/auth/   { proxy_pass http://auth-service:4001; }
        location /api/v1/users/  { proxy_pass http://auth-service:4001; }
        location /api/v1/chat/   { proxy_pass http://chat-service:4002; }
        location /api/v1/connectors/ { proxy_pass http://connector-service:4003; }
        location /api/v1/routing/ { proxy_pass http://routing-service:4004; }
        location /api/v1/memory/ { proxy_pass http://memory-service:4005; }
        location /api/v1/files/  { proxy_pass http://file-service:4006; }
        location /api/v1/audits/ { proxy_pass http://audit-service:4007; }
        location /api/v1/ollama/ { proxy_pass http://ollama-service:4008; }
        location /api/v1/health  { proxy_pass http://health-service:4009; }

        # WebSocket/SSE for streaming
        location /api/v1/chat/stream {
            proxy_pass http://chat-service:4002;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

# 20. IMPLEMENTATION ORDER

1. Architecture docs + rule files (CLAUDE.md, ADRs)
2. Monorepo scaffolding (npm workspaces, root configs)
3. Shared packages (types, constants, rabbitmq, auth)
4. Docker infrastructure (docker-compose.yml with all containers)
5. Auth service (users, sessions, JWT, seed admin)
6. Health service (aggregator)
7. Remaining services (chat, connector, routing, memory, file, audit, ollama)
8. Nginx reverse proxy
9. Frontend scaffold (Next.js, shadcn/ui, auth flow, portal shell)
10. Per-service Prisma migrations
11. ESLint + Prettier + Husky + commitlint
12. Tests (unit + component + integration)
13. Dev Docker overlay (hot-reload)
14. Documentation (README, INSTALL, SECURITY, TESTING, etc.)
15. Fill all .env files with working dev values
16. Verify: `docker compose up -d` starts all containers healthy

---

# 21. QUALITY GATES

Before ANY milestone:
- `npm run lint` — 0 errors across all workspaces
- `npm run typecheck` — 0 TypeScript errors
- `npm run build` — all services build successfully
- `npm run test` — all tests pass
- Documentation updated
- Migrations current
- `.env.example` files current
