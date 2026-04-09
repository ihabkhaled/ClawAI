# Onboarding in 5 Minutes

Get ClawAI running locally and make your first code change. This guide assumes you have basic familiarity with Node.js, Docker, and TypeScript.

---

## Prerequisites

Install these before starting:

| Tool                    | Minimum Version | Check Command            |
| ----------------------- | --------------- | ------------------------ |
| Node.js                 | 20.x            | `node -v`                |
| npm                     | 10.x            | `npm -v`                 |
| Docker + Docker Compose | v2              | `docker compose version` |
| Git                     | 2.x             | `git --version`          |

Optional but recommended:

| Tool               | Purpose                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| Ollama             | Local AI models (auto-managed via Docker, but native install is faster for GPU) |
| pgAdmin or DBeaver | Database inspection                                                             |
| Postman or Bruno   | API testing                                                                     |

---

## Step 1: Clone and Install

```bash
git clone <repo-url> ClawAI
cd ClawAI
npm install
```

This installs dependencies for all 13 backend services, the frontend, and shared packages (npm workspaces handles everything from the root).

---

## Step 2: Set Up Environment

```bash
cp .env.example .env
```

The `.env.example` file contains working defaults for local development. Review it and update any values if needed (database passwords, JWT secret, etc.).

**Or use the automated installer:**

```bash
# Linux / macOS
./scripts/install.sh

# Windows PowerShell
./scripts/install.ps1
```

The installer creates the `.env` file, sets up databases, runs Prisma migrations, seeds default data (admin user, default routing policies), and pulls Ollama models.

---

## Step 3: Start Everything

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts approximately 25 containers: 13 backend services, frontend, Nginx, 8 PostgreSQL, MongoDB, Redis, RabbitMQ, and Ollama.

Wait about 60 seconds for all services to initialize, run migrations, and pull local models.

**Check status:**

```bash
./scripts/claw.sh status
```

**Verify it's working:**

- Frontend: http://localhost:3000
- API (via Nginx): http://localhost:4000/api/v1/health
- RabbitMQ management: http://localhost:15672 (guest/guest)

---

## Step 4: Log In

Default admin credentials (set in `.env`):

```
Email:    admin@clawai.local
Password: admin123
```

---

## Key Commands

### Daily Development

| Command                                                         | What It Does                |
| --------------------------------------------------------------- | --------------------------- |
| `docker compose -f docker-compose.dev.yml up -d`                | Start all containers        |
| `docker compose -f docker-compose.dev.yml down`                 | Stop all containers         |
| `docker compose -f docker-compose.dev.yml logs -f chat-service` | Follow logs for one service |
| `./scripts/claw.sh status`                                      | Check all service health    |
| `./scripts/claw.sh logs`                                        | Tail all service logs       |

### Code Quality

| Command             | What It Does                                  |
| ------------------- | --------------------------------------------- |
| `npm run lint`      | ESLint across all workspaces                  |
| `npm run typecheck` | TypeScript strict check across all workspaces |
| `npm run build`     | Production build all workspaces               |
| `npm run test`      | Run all tests (Jest backend, Vitest frontend) |

### Database

| Command                                | What It Does                                        |
| -------------------------------------- | --------------------------------------------------- |
| `npx prisma migrate dev --name <name>` | Create a new migration (run from service directory) |
| `npx prisma studio`                    | Open Prisma Studio GUI (run from service directory) |
| `npx prisma generate`                  | Regenerate Prisma client after schema changes       |

### Per-Service Commands

Run from the service directory (e.g., `apps/claw-chat-service/`):

```bash
npm run start:dev    # Start with hot reload
npm run test         # Run tests
npm run lint         # Lint this service
```

---

## Where Code Lives

```
ClawAI/
  apps/
    claw-frontend/              # Next.js UI (pages, components, hooks, stores)
    claw-auth-service/          # Authentication + user management
    claw-chat-service/          # Chat threads, messages, AI execution
    claw-connector-service/     # Cloud provider configuration
    claw-routing-service/       # Intelligent routing engine
    claw-memory-service/        # Memory extraction + context packs
    claw-file-service/          # File upload + chunking
    claw-audit-service/         # Audit trail + usage tracking
    claw-ollama-service/        # Local Ollama model management
    claw-health-service/        # Aggregated health checks
    claw-client-logs-service/   # Frontend log ingestion
    claw-server-logs-service/   # Backend log aggregation
    claw-image-service/         # Image generation
    claw-file-generation-service/ # File/document generation
  packages/
    shared-types/               # Enums, event payloads, auth types
    shared-constants/           # Exchange name, ports, API prefix
    shared-rabbitmq/            # RabbitMQ module, retry logic, structured logger
    shared-auth/                # AuthGuard, RolesGuard, decorators
  infra/nginx/                  # Nginx reverse proxy config
  scripts/                      # install.sh, install.ps1, claw.sh
  docs/                         # Architecture documentation
  CLAUDE.md                     # Coding rules (READ THIS)
  .env.example                  # Environment variable template
  docker-compose.dev.yml        # Development Docker Compose
```

### Inside a Backend Service

Every NestJS service follows the same structure:

```
apps/claw-chat-service/
  prisma/
    schema.prisma               # Database schema
    migrations/                 # Migration history
  src/
    app/
      decorators/               # Custom decorators
      filters/                  # Exception filters
      guards/                   # Auth/role guards
      interceptors/             # Request/response interceptors
      pipes/                    # Validation pipes
    common/
      config/                   # AppConfig (Zod-validated env)
      constants/                # Service-level constants
      enums/                    # Service-level enums
      errors/                   # BusinessException, EntityNotFoundException
      utilities/                # Third-party library wrappers
    modules/
      <domain>/
        <domain>.controller.ts  # HTTP endpoints (3-line methods)
        <domain>.service.ts     # Business logic (max 30 lines/method)
        <domain>.repository.ts  # Data access (Prisma/Mongoose, no throws)
        <domain>.manager.ts     # Complex orchestration (max 80 lines/method)
        <domain>.module.ts      # NestJS module definition
        dto/                    # Zod schemas + inferred types
        types/                  # Domain-specific types
        constants/              # Domain-specific constants
    main.ts                     # Bootstrap
    app.module.ts               # Root module
  test/                         # Test files
```

### Inside the Frontend

```
apps/claw-frontend/
  src/
    app/                        # Next.js pages (App Router)
    components/
      ui/                       # shadcn/ui primitives (DO NOT EDIT)
      <domain>/                 # Feature components
    hooks/
      <domain>/                 # Custom hooks (useQuery/useMutation wrappers)
    repositories/
      <domain>/                 # API call functions
      shared/query-keys.ts      # TanStack Query key factory
    stores/                     # Zustand stores (auth, sidebar, filters)
    types/                      # TypeScript types
    enums/                      # Frontend enums
    constants/                  # Frontend constants
    utilities/                  # Utility functions
    lib/
      i18n/locales/             # 8 locale files (en, ar, de, es, fr, it, pt, ru)
      validation/               # Zod schemas for forms
```

---

## How to Make a Change

### Backend Change

1. Find the relevant service in `apps/claw-<name>-service/`
2. Locate the module in `src/modules/<domain>/`
3. Make your change following the layer rules:
   - **Controller**: 3-line methods only (extract, call service, return)
   - **Service**: Business logic, max 30 lines per method
   - **Repository**: Data access only, no throws
   - **Manager**: Complex orchestration, max 80 lines per method
4. Add/update Zod DTOs in `dto/` for any input changes
5. Add/update tests in `test/` or alongside the module
6. Run `npm run lint && npm run typecheck && npm run test`
7. Check the mandatory change checklist in `CLAUDE.md` (env vars, migrations, i18n, docs, etc.)

### Frontend Change

1. Navigate to `apps/claw-frontend/src/`
2. Follow the pattern: Page -> Controller Hook -> Service -> Repository
3. Extract types to `src/types/`, hooks to `src/hooks/`, constants to `src/constants/`
4. No business logic in `.tsx` files -- put it in hooks
5. All user-facing text must use `t('key')` and be added to all 8 locale files
6. Run `npm run lint && npm run typecheck && npm run test`

---

## How to Run Tests

```bash
# All tests across all workspaces
npm run test

# Single service
cd apps/claw-chat-service && npm run test

# Single test file
cd apps/claw-chat-service && npx jest src/modules/chat/chat.service.spec.ts

# Frontend tests
cd apps/claw-frontend && npx vitest

# E2E tests
cd apps/claw-frontend && npx playwright test
```

---

## Common Gotchas

### "Port already in use"

Another process is using one of the service ports (3000, 4000-4013). Kill it or change the port in `.env`.

### Prisma migration fails

If a migration fails during container startup, the container will crash-loop. Fix the migration, then rebuild:

```bash
docker compose -f docker-compose.dev.yml up -d --build <service-name>
```

### RabbitMQ connection refused

RabbitMQ takes 10-20 seconds to start. Services retry automatically, but if it persists, check:

```bash
docker compose -f docker-compose.dev.yml logs rabbitmq
```

### Ollama models not pulling

The ollama-service auto-pulls models on startup. This requires 5-10GB of disk space and a working internet connection. Check progress:

```bash
docker compose -f docker-compose.dev.yml logs -f ollama
docker compose -f docker-compose.dev.yml logs -f ollama-service
```

### ESLint errors on commit

The pre-commit hook runs 5 quality gates: format, lint, typecheck, build, test. All must pass. Fix the errors rather than skipping the hook. Common issues:

- Using `any` instead of `unknown` or proper types
- Missing explicit return types
- Inline type definitions instead of extracted to `types/` files
- Using `console.log` instead of the NestJS Logger

### Shared package changes not reflected

After changing code in `packages/shared-*`, dependent services need to be restarted:

```bash
docker compose -f docker-compose.dev.yml restart chat-service routing-service
```

### "Cannot find module" after pulling changes

```bash
npm install
```

Dependencies may have changed. Always run `npm install` after pulling.

---

## What to Read Next

- [System at a Glance](./system-at-a-glance.md) -- full architecture overview
- `CLAUDE.md` (project root) -- mandatory coding rules and patterns
- The service guide for whatever service you'll be working on (in `docs/03-services/`)
