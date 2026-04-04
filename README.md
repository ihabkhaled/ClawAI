```
   _____ _
  / ____| |
 | |    | | __ ___      __
 | |    | |/ _` \ \ /\ / /
 | |____| | (_| |\ V  V /
  \_____|_|\__,_| \_/\_/
```

# Claw

**Local-first AI orchestration platform.**

Claw is an open-source platform for orchestrating AI models across multiple providers -- cloud and local -- through a unified interface. It routes prompts intelligently, manages provider connections securely, and keeps your data under your control.

---

## Key Features

- **Multi-provider routing** -- OpenAI, Anthropic, Google Gemini, AWS Bedrock, DeepSeek, and local models via Ollama
- **Intelligent model routing** -- A local judge model selects the best provider/model for each request based on task characteristics
- **Local-first architecture** -- Run entirely on your own hardware with Ollama; cloud providers are optional
- **Secure secret management** -- Connector API keys encrypted at rest with AES-256-GCM
- **Chat interface** -- Threaded conversations with full message history
- **Audit logging** -- Every routing decision and API call is tracked
- **Role-based access control** -- Admin and user roles with JWT authentication
- **Monorepo structure** -- Frontend and backend in a single repository using npm workspaces

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> claw && cd claw

# 2. Install dependencies
npm install

# 3. Copy environment files
cp .env.example .env
cp apps/claw-backend/.env.example apps/claw-backend/.env
cp apps/claw-frontend/.env.example apps/claw-frontend/.env

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 5. Run database migrations and seed
npm run migrate:dev
npm run seed

# 6. Start development servers
npm run dev
```

The frontend will be available at `http://localhost:3000` and the backend API at `http://localhost:4000`.

Default login: `admin@claw.local` / password from your `.env` `ADMIN_PASSWORD` value.

---

## Architecture Overview

| Layer       | Technology                  | Purpose                          |
|-------------|-----------------------------|----------------------------------|
| Frontend    | Next.js 14, React 18, Zustand, TanStack Query | UI, state management, API calls |
| Backend     | NestJS 10, Prisma, BullMQ   | API, business logic, job queues  |
| Database    | PostgreSQL 16 (pgvector)     | Primary data store               |
| Cache/Queue | Redis 7                      | Caching, BullMQ job broker       |
| Local AI    | Ollama                       | Local model inference            |

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser    │────▸│  Next.js    │────▸│   NestJS    │
│  (React UI)  │◂────│  Frontend   │◂────│   Backend   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          │                    │                    │
                     ┌────▼────┐         ┌─────▼─────┐       ┌─────▼─────┐
                     │PostgreSQL│         │   Redis   │       │  Ollama   │
                     │(pgvector)│         │           │       │  + Cloud  │
                     └─────────┘         └───────────┘       │ Providers │
                                                             └───────────┘
```

---

## Project Structure

```
claw/
├── apps/
│   ├── claw-frontend/          # Next.js frontend application
│   │   └── src/
│   │       ├── app/            # Next.js App Router pages
│   │       ├── components/     # React components
│   │       ├── services/       # API service layer
│   │       ├── repositories/   # Data access layer
│   │       ├── stores/         # Zustand state stores
│   │       ├── hooks/          # Custom React hooks
│   │       ├── types/          # TypeScript type definitions
│   │       └── utilities/      # Helper functions
│   └── claw-backend/           # NestJS backend application
│       └── src/
│           ├── modules/        # Feature modules
│           │   ├── auth/       # Authentication & authorization
│           │   ├── users/      # User management
│           │   ├── connectors/ # Provider connections
│           │   ├── routing/    # Model routing engine
│           │   ├── chat-threads/   # Conversation threads
│           │   ├── chat-messages/  # Messages within threads
│           │   ├── audits/     # Audit logging
│           │   └── health/     # Health checks
│           ├── common/         # Shared utilities, guards, pipes
│           └── infrastructure/ # Database, Redis, queue config
├── docs/                       # Documentation and ADRs
├── infra/                      # Docker and deployment configs
├── scripts/                    # Development and operations scripts
├── docker-compose.yml          # Infrastructure services
└── package.json                # Root workspace config
```

---

## Development Commands

| Command                  | Description                              |
|--------------------------|------------------------------------------|
| `npm run dev`            | Start both frontend and backend          |
| `npm run dev:frontend`   | Start frontend only                      |
| `npm run dev:backend`    | Start backend only                       |
| `npm run build`          | Build both applications                  |
| `npm run lint`           | Lint both applications                   |
| `npm run typecheck`      | Type-check both applications             |
| `npm run test`           | Run all tests                            |
| `npm run test:e2e`       | Run end-to-end tests (Playwright)        |
| `npm run format`         | Format code with Prettier                |
| `npm run docker:up`      | Start PostgreSQL and Redis               |
| `npm run docker:up:ai`   | Start PostgreSQL, Redis, and Ollama      |
| `npm run docker:up:gpu`  | Start with GPU-enabled Ollama            |
| `npm run docker:down`    | Stop all infrastructure services         |
| `npm run migrate:dev`    | Run Prisma migrations (development)      |
| `npm run migrate`        | Run Prisma migrations (production)       |
| `npm run seed`           | Seed database with admin user            |
| `npm run db:reset`       | Reset database (destructive)             |
| `npm run clean`          | Remove build artifacts and node_modules  |

---

## Documentation

- [Installation Guide](INSTALL.md)
- [Architecture](ARCHITECTURE.md)
- [Security](SECURITY.md)
- [Testing](TESTING.md)
- [Contributing](CONTRIBUTING.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)
- [Changelog](CHANGELOG.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
