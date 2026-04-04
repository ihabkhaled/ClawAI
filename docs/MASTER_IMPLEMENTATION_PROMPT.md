# Master Implementation Prompt — Enterprise Microservices Platform

You are a principal architect, staff engineer, security reviewer, DevOps engineer, and documentation owner. Your task is to **design, scaffold, and iteratively implement** a complete enterprise-grade microservices platform.

This prompt is a **hard specification**, not vague guidance. Follow every rule exactly.

---

# 1. ARCHITECTURE PHILOSOPHY

## 1.1 Core Principles
- **Microservices**: Each domain gets its own independently deployable service
- **Database-per-service**: Each service owns its database instance — no shared databases
- **Fault isolation**: If one database or service crashes, others continue operating
- **Event-driven**: Async communication via message broker (RabbitMQ topic exchange)
- **Sync when needed**: Direct HTTP calls between services for immediate responses
- **No single point of failure**: Stateless reverse proxy, durable message queues
- **Local-first**: Support offline/local operation where applicable

## 1.2 Monorepo Structure
Use **npm workspaces** monorepo with this layout:

```
project/
├── apps/
│   ├── <frontend-app>/              # Next.js (App Router)
│   ├── <service-a>/                 # NestJS microservice
│   ├── <service-b>/                 # NestJS microservice
│   ├── <service-n>/                 # As many services as needed
│   └── <health-aggregator>/         # Stateless health aggregator
├── packages/
│   ├── shared-types/                # Shared enums, types, event contracts
│   ├── shared-constants/            # Service ports, names, config
│   ├── shared-messaging/            # Message broker NestJS module
│   └── shared-auth/                 # JWT guard + decorators
├── infra/
│   └── nginx/                       # Reverse proxy config
├── docker-compose.yml               # Production (multi-stage builds)
├── docker-compose.dev.yml           # Dev (self-contained, hot-reload, all ports)
├── .env / .env.example              # All environment variables
├── .husky/                          # Git hooks
├── commitlint.config.cjs            # Conventional commits
├── .lintstagedrc.cjs                # lint-staged config
├── .prettierrc                      # Prettier config
├── CLAUDE.md                        # AI assistant rules
└── docs/                            # Architecture docs, ADRs
```

---

# 2. TECHNOLOGY STACK

## 2.1 Frontend
| Concern | Technology |
|---------|-----------|
| Framework | **Next.js** (latest, App Router) with **Turbopack** for dev |
| Language | **TypeScript** (strict mode, all flags enabled) |
| Styling | **Tailwind CSS** with CSS variable theming |
| UI Primitives | **shadcn/ui** (Radix-based components) |
| Server State | **TanStack Query v5** (useQuery for reads, useMutation for writes) |
| Client State | **Zustand** (minimal, only for truly client-side state) |
| Forms | **React Hook Form + Zod** |
| HTTP Client | **Axios** (wrapped in a module — never imported directly) |
| Virtualization | **react-virtuoso** (wrapped in a module) |
| Unit Tests | **Vitest + React Testing Library** |
| E2E Tests | **Playwright** |

## 2.2 Backend (per microservice)
| Concern | Technology |
|---------|-----------|
| Framework | **NestJS** (latest), TypeScript (strict) |
| ORM (relational) | **Prisma** (each service generates its own client) |
| ORM (document) | **Mongoose** (for services using MongoDB) |
| Validation | **Zod** (NOT class-validator, NOT class-transformer) |
| Password Hashing | **argon2** (NOT bcrypt — wrapped in utility module) |
| JWT | **jsonwebtoken** (wrapped in utility module) |
| Logging | **nestjs-pino / pino** (structured JSON logs) |
| Cache | **ioredis** (wrapped in NestJS module) |
| Message Broker | **amqplib** for RabbitMQ (wrapped in NestJS module) |
| Unit Tests | **Jest** with 70% coverage threshold |

## 2.3 Infrastructure (Docker)
| Service | Image | Purpose |
|---------|-------|---------|
| **PostgreSQL** (one per relational service) | `pgvector/pgvector:pg16` | Relational data + vector embeddings |
| **MongoDB** (for append-heavy/document services) | `mongo:7` | Logs, telemetry, flexible schemas |
| **Redis** | `redis:7-alpine` | Caching, sessions, rate limiting |
| **RabbitMQ** | `rabbitmq:3-management-alpine` | Async event bus (topic exchange) |
| **Nginx** | `nginx:alpine` | Stateless reverse proxy (path-based routing) |

---

# 3. ABSOLUTE CODING RULES

These rules are **non-negotiable** and apply to every file in every service.

## 3.1 Universal Rules (Frontend + Backend)
1. **NEVER** use `any` — use `unknown`, generics, or proper types.
2. **NEVER** disable ESLint rules — no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
3. **NEVER** use `==` or `!=` — always `===` and `!==`.
4. **NEVER** use `var` — use `const` (preferred) or `let`.
5. **NEVER** use `!` non-null assertion — use proper null checks (`if`, `??`, `?.`).
6. **NEVER** use string literal unions for domain values — define enums in dedicated files.
7. **NEVER** compare domain values with raw strings — use enum comparisons.
8. **NEVER** log secrets, tokens, API keys, or passwords.
9. **NEVER** allow missing explicit return types on functions.
10. **NEVER** build god-files — keep modules focused and under 200 lines.
11. **NEVER** define types, interfaces, enums, constants, or standalone functions inline in logic files — extract to dedicated files and import.
12. **NEVER** import third-party libraries directly in business logic — wrap every library in a utility/module file. If the library changes, only the wrapper is modified.
13. Use `type` over `interface` unless declaration merging is truly needed.
14. Use enums for ALL domain constants.
15. Prefer predictable code over clever code.
16. No circular dependencies between modules.
17. No default exports (except Next.js pages/layouts which require them).

## 3.2 Backend-Specific Rules
18. **NEVER** use `console.log` — use NestJS Logger service.
19. **NEVER** use `process.env` directly — use Zod-validated AppConfig that fails at startup if required vars are missing.
20. **NEVER** use class-validator or class-transformer — use Zod for all validation.
21. **NEVER** put business logic in controllers — controllers call exactly ONE service method.
22. **NEVER** put ORM/database calls outside repositories — repositories are the sole data-access layer.
23. **NEVER** put business logic in repositories — pure data access only.
24. **NEVER** use `@UsePipes()` at method level when `@Param()` is present.
25. **EVERY** exception must use a typed BusinessException with a `messageKey` for i18n.
26. **EVERY** function must have an explicit return type annotation.
27. Service methods max **30 lines** — extract complex logic to utility files.
28. Controllers are **3-line methods**: extract params → call ONE service → return.
29. No floating promises — every promise must be `await`ed or explicitly `void`ed.
30. No N+1 queries — use includes, batch queries, or joins.
31. Every foreign key must be indexed, every WHERE column must be indexed.
32. Paginate ALL list endpoints — no unbounded queries.
33. All Zod schemas must have `.max()` on every string and array field.
34. No magic numbers or strings — extract to constants files.

## 3.3 Frontend-Specific Rules
35. TSX files = **pure render composition ONLY** — no hooks, no logic, no constants, no functions.
36. All custom hooks in `src/hooks/`, one hook per file.
37. All types in `src/types/`, all enums in `src/enums/`, all constants in `src/constants/`.
38. All GET requests use TanStack Query `useQuery`.
39. All mutations use TanStack Query `useMutation`.
40. Query keys must be structured factories in a dedicated file.
41. All protected pages must use an auth guard.
42. Every page must handle loading, empty, and error states.
43. Use shadcn/ui for all form inputs — no raw HTML `<input>`, `<select>`, `<textarea>`.
44. No `dangerouslySetInnerHTML`.
45. No secrets in localStorage or browser state.
46. Use CSS variables for theming — no hardcoded colors, no `dark:` prefixes.

---

# 4. ARCHITECTURE LAYERS

## 4.1 Backend: Controller → Service → Manager → Repository

| Layer | Responsibility | Rules |
|-------|---------------|-------|
| **Controller** | HTTP transport, DTO binding, auth guards | Call ONE service method. No business logic. No try/catch. No throw. |
| **Service** | Thin orchestrator, transaction coordination | Max 30 lines/method. Delegates to managers/repos. Extract helpers to utility files. |
| **Manager** | Complex domain/process logic | Multi-step orchestration, provider selection, fallback chains. Max 80 lines/method. |
| **Repository** | Pure data access (Prisma/Mongoose) | No business logic. No throwing exceptions. Return raw results. |
| **Utility** | Extracted helper functions | No types/enums/constants inline. Only exported pure functions. |

## 4.2 Frontend: View → Controller Hook → Service → Repository

| Layer | Responsibility | Rules |
|-------|---------------|-------|
| **View (TSX)** | Pure render composition | No hooks except a single controller hook. No inline logic. |
| **Controller Hook** | Orchestrates state, queries, mutations | Returns view-ready data. Delegates to services. |
| **Service** | Business logic, data transformation | Thin wrappers. Delegates to repositories. |
| **Repository** | API transport, typed HTTP calls | One function per endpoint. Uses shared HTTP client module. |

---

# 5. LIBRARY WRAPPING RULE (CRITICAL)

**Every third-party library must be wrapped in a dedicated module/utility file.** Business logic files (controllers, services, hooks, components) NEVER import external packages directly — they import the wrapper.

### Why
If a library is replaced (e.g., `bcrypt` → `argon2`, `fetch` → `axios`, `moment` → `dayjs`), only ONE file changes — the wrapper. Not 50 files across the codebase.

### Backend Wrapper Examples
| Library | Wrapper Location | Exports |
|---------|-----------------|---------|
| argon2 | `common/utilities/hashing.utility.ts` | `hashPassword()`, `verifyPassword()` |
| jsonwebtoken | `common/utilities/jwt.utility.ts` | `signToken()`, `verifyToken()` |
| ioredis | `infrastructure/redis/redis.module.ts` | `RedisModule`, `RedisService` |
| amqplib | `packages/shared-messaging/` | `MessagingModule`, `MessagingService` |
| Prisma | `infrastructure/database/prisma/prisma.module.ts` | `PrismaModule`, `PrismaService` |
| Mongoose | `infrastructure/database/mongoose/mongoose.module.ts` | `MongooseModule` config |
| pino | NestJS LoggerModule config in app.module.ts | Logger injection |

### Frontend Wrapper Examples
| Library | Wrapper Location | Exports |
|---------|-----------------|---------|
| axios | `services/shared/http-client.ts` | `httpClient.get()`, `.post()`, etc. |
| clsx + tailwind-merge | `lib/utils.ts` | `cn()` |
| react-virtuoso | `components/common/virtualized-list.tsx` | `<VirtualizedList>` |
| zod (schemas) | `lib/validation/<domain>.schema.ts` | Schema exports |
| zustand | `stores/<name>.store.ts` | Store hooks |

---

# 6. PER-SERVICE MODULE STRUCTURE

Each backend microservice follows this internal structure:

```
apps/<service>/
├── src/
│   ├── app/
│   │   ├── app.module.ts               # Root NestJS module
│   │   ├── config/app.config.ts         # Zod-validated env config
│   │   ├── guards/                      # AuthGuard, RolesGuard
│   │   ├── decorators/                  # @Public(), @CurrentUser(), @Roles()
│   │   ├── filters/                     # GlobalExceptionFilter
│   │   ├── pipes/                       # ZodValidationPipe
│   │   └── interceptors/               # LoggingInterceptor
│   ├── common/
│   │   ├── enums/                       # Domain enums (barrel exported)
│   │   ├── types/                       # Shared types
│   │   ├── constants/                   # Constants files
│   │   ├── errors/                      # BusinessException + subclasses
│   │   └── utilities/                   # Library wrappers + helper functions
│   ├── infrastructure/
│   │   ├── database/prisma/             # PrismaModule, PrismaService
│   │   └── redis/                       # RedisModule, RedisService
│   ├── modules/<domain>/
│   │   ├── controllers/                 # HTTP handlers
│   │   ├── services/                    # Orchestration
│   │   ├── managers/                    # Complex logic (optional)
│   │   ├── repositories/               # Data access
│   │   ├── dto/                         # Zod schemas + inferred types
│   │   ├── types/                       # Module-specific types
│   │   ├── constants/                   # Module-specific constants
│   │   ├── service.utilities/           # Extracted service helpers
│   │   └── <domain>.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma                    # ONLY this service's tables
│   └── migrations/
├── Dockerfile                           # Production (multi-stage)
├── Dockerfile.dev                       # Dev (hot-reload)
├── docker-entrypoint.dev.sh             # Dev startup script
├── .env / .env.example
├── eslint.config.mjs
├── tsconfig.json
├── jest.config.ts
├── CLAUDE.md                            # Service-specific rules
└── package.json
```

---

# 7. FRONTEND STRUCTURE

```
apps/<frontend>/
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── (auth)/                     # Public routes (login, register)
│   │   ├── (portal)/                   # Protected routes (auth-guarded)
│   │   │   ├── layout.tsx              # Sidebar + topbar shell
│   │   │   └── <feature>/page.tsx      # Feature pages
│   │   ├── layout.tsx                  # Root layout
│   │   └── providers.tsx               # QueryClient, theme providers
│   ├── components/
│   │   ├── ui/                         # shadcn/ui (auto-generated, exempt from rules)
│   │   ├── common/                     # DataTable, PageHeader, EmptyState, etc.
│   │   └── layout/                     # Sidebar, Topbar, UserMenu
│   ├── hooks/                          # Controller hooks (one per file)
│   ├── services/                       # Business logic orchestration
│   ├── repositories/                   # API call wrappers
│   ├── enums/                          # All domain enums (barrel exported)
│   ├── types/                          # All domain types (barrel exported)
│   ├── constants/                      # All constants
│   ├── utilities/                      # Helper/utility functions
│   ├── stores/                         # Zustand stores
│   └── lib/                            # Framework utils (cn, validation schemas)
├── next.config.mjs                     # output: 'standalone', Turbopack
├── eslint.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── CLAUDE.md
```

---

# 8. DOCKER INFRASTRUCTURE

## 8.1 Production (`docker-compose.yml`)
- Multi-stage Dockerfiles (deps → build → runner with non-root user)
- Separate database container per relational service (fault isolation)
- Health checks on every service and infrastructure container
- All values from `.env` — nothing hardcoded in compose file
- Named volumes for all persistent data

## 8.2 Development (`docker-compose.dev.yml`)
- **Self-contained** — includes all infrastructure + all services (single file, no overlay)
- Volume mounts for `src/` directories (hot-reload on code changes)
- Uses `Dockerfile.dev` (single-stage, `npm run dev`)
- For Prisma services: entrypoint script that runs `prisma generate` + `build` + copies generated client before starting
- Extended health check timeouts for slower dev builds
- All environment variables have sensible defaults (works without `.env`)

## 8.3 Nginx Reverse Proxy
- Path-based routing: `/api/v1/<domain>/*` → corresponding service
- Forward `Origin`, `X-Real-IP`, `X-Forwarded-For` headers
- WebSocket/SSE support for streaming endpoints
- `client_max_body_size` for file uploads

---

# 9. ENVIRONMENT VARIABLES

**ALL configuration from `.env` files. Never hardcode in docker-compose or source code.**

### Required per service:
- `DATABASE_URL` or `MONGODB_URI` — connection string to own database
- `REDIS_URL` — shared Redis
- `RABBITMQ_URL` — shared RabbitMQ (amqp://)
- `JWT_SECRET` — shared JWT signing key
- `PORT` — service port
- `CORS_ORIGINS` — comma-separated allowed origins
- `NODE_ENV` — development/production

### Additional per need:
- `ENCRYPTION_KEY` — AES-256-GCM key (64 hex chars) for services storing secrets
- `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` — seed user
- `NEXT_PUBLIC_API_URL` — frontend API base URL (points to Nginx)

Each service validates env with **Zod schema** at startup. Missing required vars = crash immediately with clear error message.

---

# 10. ESLINT CONFIGURATION (STRICT)

## 10.1 Backend (per service)
- Presets: `js.configs.recommended` + `tseslint.configs.strict`
- Plugins: `eslint-plugin-security`, `eslint-plugin-unicorn`, `eslint-plugin-import-x`
- **Key rules**: no-explicit-any (error), no-non-null-assertion (error), explicit-function-return-type (warn), no-floating-promises (error), no-misused-promises (error), eqeqeq (error), no-console (warn), prefer-const (error), complexity (warn: 15)
- **`no-restricted-syntax`** per file type:
  - **All logic files** (controller, service, repo, module, guard, interceptor, filter, pipe): ban inline TSInterface, TSTypeAlias, TSEnum, top-level const, FunctionDeclaration, string literal unions
  - **Repository files**: additionally ban ThrowStatement
  - **Controller files**: additionally ban TryStatement, ThrowStatement
  - **Service files**: max-lines-per-function: 50, complexity: 10
  - **Manager files**: max-lines-per-function: 80, complexity: 15
  - **Utility files**: ban types, enums, constants (only functions allowed)
- **Ignore**: `dist/`, `node_modules/`, `coverage/`, `src/generated/`
- **Test files**: relax strict rules (allow any, no return types required)

## 10.2 Frontend
- Same TypeScript strict rules as backend
- React, React Hooks, JSX-A11y plugins
- **`no-restricted-syntax`** for TSX files: ban inline enums, types, interfaces, hooks, SCREAMING_CASE constants, utility functions
- **shadcn/ui components** (`src/components/ui/`): exempt from separation-of-concerns rules
- File scope overrides for enums/, types/, hooks/, services/, stores/

---

# 11. TYPESCRIPT CONFIGURATION (ALL STRICT FLAGS)

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

# 12. PRETTIER CONFIGURATION

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

Frontend additionally uses `prettier-plugin-tailwindcss` for Tailwind class sorting.

---

# 13. GIT HOOKS (HUSKY + COMMITLINT + LINT-STAGED)

### Pre-commit hook (5 steps):
```sh
#!/usr/bin/env sh
npx lint-staged || exit 1        # Step 1: Format staged files (prettier)
npm run lint || exit 1            # Step 2: ESLint per workspace
npm run typecheck || exit 1       # Step 3: tsc --noEmit per workspace
npm run build || exit 1           # Step 4: Production build per workspace
npm run test || exit 1            # Step 5: All tests per workspace
```

### Commit-msg hook:
```sh
npx --no -- commitlint --edit ${1}
```

### Commitlint:
Conventional commits enforced: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Subject max 100 chars, no sentence-case.

### Lint-staged:
Prettier on all staged files (`*.{ts,tsx,js,jsx,json,css,md,yml,yaml}`).

---

# 14. TESTING STRATEGY

## 14.1 Backend (Jest per service)
- Coverage threshold: **70%** (branches, functions, lines, statements)
- Unit tests for: services, managers, utilities, guards, pipes
- Integration tests for: API endpoints with real database
- `--passWithNoTests` flag for services without tests yet
- Path aliases in jest.config.ts matching tsconfig paths
- Test files in `src/modules/<domain>/__tests__/` or `src/__tests__/`

## 14.2 Frontend (Vitest + React Testing Library)
- Coverage threshold: **60%**
- Unit tests for: utilities, enums, stores, query keys, services
- Component tests: render states (loading, empty, error, data)
- E2E tests: Playwright for critical user journeys
- Exclude `src/components/ui/` from coverage (auto-generated)
- Setup file with `@testing-library/jest-dom`

---

# 15. SECURITY

- **Passwords**: argon2id (never plaintext, never bcrypt)
- **JWT**: Access tokens (short-lived, ~15min) + refresh tokens (~7d) with rotation
- **Secrets at rest**: AES-256-GCM encryption for stored API keys/credentials
- **Auth guards**: JWT validation in every service via shared-auth package
- **Role-based access**: Configurable roles (e.g., ADMIN, OPERATOR, VIEWER)
- **Rate limiting**: Auth endpoints 5/min, mutation endpoints 30/min, AI endpoints 10/min
- **Input validation**: Zod DTOs with `.max()` on every string and array
- **CORS**: Explicit origins from env var, credentials enabled
- **No secret leakage**: Never in logs, API responses, frontend state, git
- **Database isolation**: Each service has its own database container
- **Error sanitization**: Strip internal paths, stack traces, table names from responses

---

# 16. INTER-SERVICE COMMUNICATION

| Pattern | When | Example |
|---------|------|---------|
| **Message Broker (async)** | Fire-and-forget events, eventual consistency | `entity.created`, `entity.updated`, `audit.event` |
| **HTTP (sync)** | Need immediate response from another service | Service A calls Service B's API to validate data |
| **Reverse Proxy (frontend → services)** | All frontend API calls | Nginx routes by path prefix to correct service |

### Event bus design:
- Topic exchange (e.g., `app.events`)
- Durable queues per service (survives broker restart)
- Events typed in shared-types package with EventPattern enum
- Each event has: `pattern`, `data`, `timestamp`, `source`

---

# 17. DOCUMENTATION REQUIREMENTS

Every project must include:

| Document | Purpose |
|----------|---------|
| `README.md` | Overview, quick start, architecture diagram, service table |
| `INSTALL.md` | Prerequisites, Docker setup, migrations, seeding, first login |
| `ARCHITECTURE.md` | System diagram, service boundaries, communication patterns |
| `SECURITY.md` | Secret handling, auth flow, rate limiting, CORS |
| `TESTING.md` | Strategy, running tests, coverage, manual test matrix |
| `CONTRIBUTING.md` | Workflow, code standards, PR process, commit conventions |
| `ENVIRONMENT_VARIABLES.md` | Complete reference for all env vars per service |
| `CHANGELOG.md` | Version history (Keep a Changelog format) |
| `CODE_OF_CONDUCT.md` | Contributor Covenant |
| `CLAUDE.md` (root) | Universal rules, architecture, commands |
| `CLAUDE.md` (per service) | Service-specific rules, ownership, events |
| `docs/adrs/` | Architecture Decision Records for key choices |

---

# 18. SHARED PACKAGES

| Package | Purpose |
|---------|---------|
| `shared-types` | All enums, shared types, event contracts (EventPattern enum + typed payloads) |
| `shared-constants` | Service ports, service names, message broker exchange name, pagination defaults |
| `shared-messaging` | NestJS dynamic module wrapping the message broker client (publish/subscribe) |
| `shared-auth` | Standalone JWT AuthGuard, RolesGuard, and decorators (@Public, @Roles, @CurrentUser) |

---

# 19. DATABASE DESIGN RULES

- Each service owns its tables — no cross-service database access
- Use Prisma with custom output path (`src/generated/prisma/`) to avoid monorepo conflicts
- Every FK must have an index
- Every column used in WHERE clauses must have an index
- Every column used in ORDER BY must have an index
- Composite indexes for common query patterns
- All business/domain states modeled as Prisma enums
- Soft deletes where appropriate (status field, not hard delete)
- Pagination on all list queries with configurable max limit
- Use pgvector extension for services that need vector embeddings

---

# 20. GITIGNORE

```gitignore
node_modules/
dist/
build/
.next/
out/
**/src/generated/       # Prisma generated clients (regenerated from schema)
.env
.env.local
.env.*.local
coverage/
*.tsbuildinfo
.DS_Store
Thumbs.db
```

---

# 21. IMPLEMENTATION ORDER

1. Architecture docs + CLAUDE.md rule files + ADRs
2. Monorepo scaffolding (npm workspaces, root configs, prettier, commitlint)
3. Shared packages (types, constants, messaging, auth)
4. Docker infrastructure (all database containers, Redis, RabbitMQ, Nginx)
5. First service (typically auth — users, sessions, JWT, seed admin)
6. Health aggregator service
7. Remaining services (one at a time, each with own Prisma schema + migration)
8. Frontend scaffold (Next.js, shadcn/ui, auth flow, portal shell)
9. ESLint + Prettier + Husky + lint-staged (strict from day one)
10. Tests (unit + component + integration)
11. Dev Docker compose (self-contained, hot-reload)
12. Documentation (README, INSTALL, SECURITY, TESTING, etc.)
13. Fill all `.env` files with working dev values
14. Verify: all containers start healthy, login works end-to-end

---

# 22. QUALITY GATES

Before ANY milestone is considered complete:

- [ ] `npm run lint` — **0 errors** across all workspaces
- [ ] `npm run typecheck` — **0 TypeScript errors** across all workspaces
- [ ] `npm run build` — all services and frontend build successfully
- [ ] `npm run test` — all tests pass
- [ ] Documentation updated for any architectural or API changes
- [ ] Database migrations current
- [ ] `.env.example` files current
- [ ] Docker containers start healthy
- [ ] No secrets in git, logs, or API responses
