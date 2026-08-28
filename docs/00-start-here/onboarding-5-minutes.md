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

This installs dependencies for all 17 backend services, the frontend, and shared packages (npm workspaces handles everything from the root).

---

## Step 2: Set Up Environment

```bash
cp .env.example .env
```

The `.env.example` file contains working defaults for local development. Review it and update any values if needed (database passwords, JWT secret, workspace OAuth credentials, etc.).

**Or use the automated installer:**

```bash
# Linux / macOS
./scripts/install.sh

# Windows PowerShell
./scripts/install.ps1
```

The installer creates the `.env` file, sets up databases, runs Prisma migrations, seeds default data (admin user, default routing policies), and prepares the runtime stack.

---

## Step 3: Start Everything

```bash
./scripts/claw.sh up -d
```

This starts 33 containers: 17 backend services, frontend, Nginx, 13 PostgreSQL databases, MongoDB, Redis, RabbitMQ, Ollama, and ClamAV.

Wait about 60 seconds for all services to initialize, run migrations, and pull local models.

**Check status:**

```bash
./scripts/claw.sh status
```

**Verify it's working:**

- Frontend: http://localhost:3000
- API (via Nginx): http://localhost:4000/api/v1/health
- RabbitMQ management: http://localhost:15672

---

## Step 4: Log In

Default admin credentials (set in `.env`):

```text
Email:    admin@claw.local
Password: ClawAdmin123!
```

---

## Key Commands

### Daily Development

| Command                                  | What It Does                |
| ---------------------------------------- | --------------------------- |
| `./scripts/claw.sh up -d`                | Start all containers        |
| `./scripts/claw.sh down`                 | Stop all containers         |
| `./scripts/claw.sh logs -f chat-service` | Follow logs for one service |
| `./scripts/claw.sh status`               | Check all service health    |
| `./scripts/claw.sh logs`                 | Tail all service logs       |

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

Run from the service directory (for example `apps/claw-chat-service/`):

```bash
npm run start:dev    # Start with hot reload
npm run test         # Run tests
npm run lint         # Lint this service
```

Or directly from the repo root:

```bash
npm run dev --workspace=claw-chat-service
npm run dev --workspace=claw-workspace-service
npm run dev --workspace=claw-agent-service
```

---

## Where Code Lives

```text
ClawAI/
  apps/
    claw-frontend/                # Next.js UI (pages, components, hooks, stores)
    claw-auth-service/            # Authentication + user management
    claw-chat-service/            # Chat threads, messages, AI execution
    claw-connector-service/       # Cloud provider configuration
    claw-routing-service/         # Intelligent routing engine
    claw-memory-service/          # Memory extraction + context packs
    claw-file-service/            # File upload + chunking
    claw-audit-service/           # Audit trail + usage tracking
    claw-ollama-service/          # Local Ollama model management
    claw-health-service/          # Aggregated health checks
    claw-client-logs-service/     # Frontend log ingestion
    claw-server-logs-service/     # Backend log aggregation
    claw-image-service/           # Image generation
    claw-file-generation-service/ # File/document generation
    claw-workspace-service/       # Workspace sync, search, action approvals
    claw-agent-service/           # Local agent session and command backend
  packages/
    shared-types/                 # Enums, event payloads, auth types
    shared-constants/             # Exchange name, ports, API prefix
    shared-rabbitmq/              # RabbitMQ module, retry logic, structured logger
    shared-auth/                  # AuthGuard, RolesGuard, decorators
  infra/nginx/                    # Nginx reverse proxy config
  scripts/                        # install.sh, install.ps1, claw.sh
  docs/                           # Architecture documentation
  agent-cli/                      # Local companion CLI for the agent service
  CLAUDE.md                       # Coding rules (READ THIS)
  .env.example                    # Environment variable template
  docker-compose.dev.yml          # Development Docker Compose
```

### Inside a Backend Service

Every NestJS service follows the same structure:

```text
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
        <domain>.controller.ts  # HTTP endpoints
        <domain>.service.ts     # Business logic
        <domain>.repository.ts  # Data access
        <domain>.manager.ts     # Complex orchestration
        <domain>.module.ts      # NestJS module definition
        dto/                    # Zod schemas + inferred types
        types/                  # Domain-specific types
        constants/              # Domain-specific constants
    main.ts                     # Bootstrap
    app.module.ts               # Root module
  test/                         # Test files
```

### Inside the Frontend

```text
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
      i18n/locales/             # 9 locale files
      validation/               # Zod schemas for forms
```

---

## How to Make a Change

### Backend Change

1. Find the relevant service in `apps/claw-<name>-service/`
2. Locate the module in `src/modules/<domain>/`
3. Make your change following the layer rules:
   - **Controller**: extract, call service, return
   - **Service**: business logic
   - **Repository**: data access only
   - **Manager**: complex orchestration
4. Add/update Zod DTOs in `dto/` for any input changes
5. Add/update tests in `test/` or alongside the module
6. Run `npm run lint && npm run typecheck && npm run test`
7. Check the mandatory change checklist in `CLAUDE.md` (env vars, migrations, i18n, docs, etc.)

### Frontend Change

1. Navigate to `apps/claw-frontend/src/`
2. Follow the pattern: Page -> Controller Hook -> Service -> Repository
3. Extract types to `src/types/`, hooks to `src/hooks/`, constants to `src/constants/`
4. No business logic in `.tsx` files -- put it in hooks
5. All user-facing text must use `t('key')` and be added to all locale files
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

Another process is using one of the service ports (3000, 4000-4015). Kill it or change the port in `.env`.

### Prisma migration fails

If a migration fails during container startup, the container will crash-loop. Fix the migration, then rebuild:

```bash
./scripts/claw.sh service:rebuild <service-name>
```

### RabbitMQ connection refused

RabbitMQ takes 10-20 seconds to start. Services retry automatically, but if it persists, check:

```bash
./scripts/claw.sh logs rabbitmq
```

### Ollama models not pulling

The ollama runtime may auto-pull models on startup. This requires disk space and a working internet connection. Check progress:

```bash
./scripts/claw.sh logs -f ollama
./scripts/claw.sh logs -f ollama-service
```

### Workspace OAuth flow fails

Check that your workspace provider credentials and callback URLs in `.env` match the provider app configuration.

### Agent session never becomes active

Check that:

- `agent-service` is healthy
- the CLI is pointed at the correct base URL
- the JWT used during registration is valid

### Shared package changes not reflected

After changing code in `packages/shared-*`, dependent services need to be restarted:

```bash
./scripts/claw.sh restart chat-service routing-service workspace-service agent-service
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
- The service guide for whatever service you'll be working on (in `docs/04-backend/`)
