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
- **Microservices backend** -- 9 independent NestJS services with fault isolation and independent scaling
- **Secure secret management** -- Connector API keys encrypted at rest with AES-256-GCM
- **Chat interface** -- Threaded conversations with full message history
- **Memory and context packs** -- Persistent memory and embeddings for contextual conversations
- **File processing** -- Upload, chunk, and index files for retrieval-augmented generation
- **Audit logging** -- Every routing decision and API call is tracked in MongoDB
- **Role-based access control** -- Admin and user roles with JWT authentication
- **Monorepo structure** -- Frontend, 9 backend services, and 4 shared packages using npm workspaces

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> claw && cd claw

# 2. Copy environment files for all services
bash scripts/setup.sh
# Or manually: for each apps/claw-*/.env.example, copy to .env

# 3. Start all containers (infrastructure + services)
docker compose -f docker-compose.dev.yml up -d

# 4. Wait for services to start (~60 seconds), then verify
curl http://localhost:4009/api/v1/health

# 5. Open the frontend
open http://localhost:3000
```

### Default Credentials

| Field    | Value            |
| -------- | ---------------- |
| Email    | admin@claw.local |
| Password | Admin123!        |

You will be prompted to change your password on first login.

The auth service automatically runs database migrations and seeds the default admin user on first start. If users already exist, the seed is skipped (idempotent).

The frontend is available at `http://localhost:3000` and all API traffic routes through Nginx at `http://localhost:4000`.

---

## Architecture Overview

```
                              ┌──────────────┐
                              │    Browser    │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │   Next.js    │ :3000
                              │   Frontend   │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │    Nginx     │ :80
                              │ Reverse Proxy│
                              └──────┬───────┘
                                     │
          ┌──────────┬───────────┬───┴────┬──────────┬──────────┐
          │          │           │        │          │          │
     ┌────▼──┐ ┌────▼──┐ ┌─────▼──┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
     │ Auth  │ │ Chat  │ │Connect.│ │Routing│ │Memory │ │ File  │
     │ :4001 │ │ :4002 │ │ :4003  │ │ :4004 │ │ :4005 │ │ :4006 │
     └───┬───┘ └───┬───┘ └───┬────┘ └───┬───┘ └───┬───┘ └───┬───┘
         │         │         │          │         │         │
     ┌───▼───┐ ┌───▼───┐ ┌──▼────┐ ┌───▼───┐ ┌───▼───┐ ┌──▼────┐
     │PG 5441│ │PG 5442│ │PG 5443│ │PG 5444│ │PG 5445│ │PG 5446│
     └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘

     ┌────────┐  ┌────────┐  ┌────────┐
     │ Audit  │  │ Ollama │  │ Health │
     │ :4007  │  │ :4008  │  │ :4009  │
     └───┬────┘  └───┬────┘  └────────┘
         │           │
     ┌───▼────┐  ┌───▼───┐
     │MongoDB │  │ Redis │
     │ :27018 │  │ :6380 │
     └────────┘  └───────┘

              ┌───────────┐
              │ RabbitMQ  │ :5672 (AMQP) / :15672 (Management)
              └───────────┘
```

### Service Table

| Service   | Port | Database                            | Purpose                             |
| --------- | ---- | ----------------------------------- | ----------------------------------- |
| Auth      | 4001 | PostgreSQL `claw_auth` (5441)       | Users, sessions, JWT, roles         |
| Chat      | 4002 | PostgreSQL `claw_chat` (5442)       | Threads, messages, streaming        |
| Connector | 4003 | PostgreSQL `claw_connectors` (5443) | Provider configs, model catalogs    |
| Routing   | 4004 | PostgreSQL `claw_routing` (5444)    | Routing decisions, policies         |
| Memory    | 4005 | PostgreSQL `claw_memory` (5445)     | Memory, context packs, embeddings   |
| File      | 4006 | PostgreSQL `claw_files` (5446)      | File upload, chunking               |
| Audit     | 4007 | MongoDB `claw_audit` (27018)        | Audit logs, usage ledger            |
| Ollama    | 4008 | None (Redis only)                   | Local model proxy                   |
| Health    | 4009 | None (stateless)                    | Aggregates health from all services |

### Infrastructure

| Component     | Host Port | Internal Port | Purpose                        |
| ------------- | --------- | ------------- | ------------------------------ |
| Nginx         | 80        | 80            | Reverse proxy / API gateway    |
| PostgreSQL x6 | 5441-5446 | 5432          | Per-service relational storage |
| MongoDB       | 27018     | 27017         | Audit log storage              |
| Redis         | 6380      | 6379          | Caching, Ollama service state  |
| RabbitMQ      | 5672      | 5672          | Async inter-service messaging  |
| RabbitMQ UI   | 15672     | 15672         | Management console             |
| Ollama        | 11434     | 11434         | Local model inference          |
| Frontend      | 3000      | 3000          | Next.js UI                     |

---

## Project Structure

```
claw/
├── apps/
│   ├── claw-frontend/              # Next.js frontend application
│   │   └── src/
│   │       ├── app/                # Next.js App Router pages
│   │       ├── components/         # React components
│   │       ├── services/           # API service layer
│   │       ├── repositories/       # Data access layer
│   │       ├── stores/             # Zustand state stores
│   │       ├── hooks/              # Custom React hooks
│   │       ├── types/              # TypeScript type definitions
│   │       └── utilities/          # Helper functions
│   ├── claw-auth-service/          # Auth microservice (:4001)
│   ├── claw-chat-service/          # Chat microservice (:4002)
│   ├── claw-connector-service/     # Connector microservice (:4003)
│   ├── claw-routing-service/       # Routing microservice (:4004)
│   ├── claw-memory-service/        # Memory microservice (:4005)
│   ├── claw-file-service/          # File microservice (:4006)
│   ├── claw-audit-service/         # Audit microservice (:4007)
│   ├── claw-ollama-service/        # Ollama proxy microservice (:4008)
│   └── claw-health-service/        # Health aggregator microservice (:4009)
├── packages/
│   ├── shared-types/               # @claw/shared-types (enums, types, event contracts)
│   ├── shared-constants/           # @claw/shared-constants (ports, names, exchange config)
│   ├── shared-rabbitmq/            # @claw/shared-rabbitmq (NestJS RabbitMQ module)
│   └── shared-auth/                # @claw/shared-auth (JWT guard and decorators)
├── docs/                           # Documentation and ADRs
├── infra/                          # Docker and deployment configs
├── scripts/                        # Development and operations scripts
├── docker-compose.yml              # All 20 containers
├── nginx.conf                      # Reverse proxy configuration
└── package.json                    # Root workspace config
```

---

## Development Commands

| Command                            | Description                              |
| ---------------------------------- | ---------------------------------------- |
| `npm run dev`                      | Start all services in development mode   |
| `npm run dev:frontend`             | Start frontend only                      |
| `npm run dev:auth`                 | Start auth service only                  |
| `npm run dev:chat`                 | Start chat service only                  |
| `npm run build`                    | Build all applications and packages      |
| `npm run lint`                     | Lint all applications and packages       |
| `npm run typecheck`                | Type-check all applications and packages |
| `npm run test`                     | Run all test suites                      |
| `npm run test:e2e`                 | Run end-to-end tests (Playwright)        |
| `npm run format`                   | Format code with Prettier                |
| `npm run clean`                    | Remove build artifacts and node_modules  |
| `docker compose up -d`             | Start all 20 containers                  |
| `docker compose down`              | Stop all containers                      |
| `docker compose logs -f <service>` | Tail logs for a specific container       |

---

## Documentation

- [Installation Guide](INSTALL.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)
- [Security](SECURITY.md)
- [Testing](TESTING.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [ADR-004: Microservices Architecture](docs/adrs/004-microservices-architecture.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
