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

- **Multi-provider routing** -- OpenAI, Anthropic, Google Gemini, AWS Bedrock, DeepSeek, xAI, and local models via Ollama
- **Intelligent model routing** -- A local judge model selects the best provider/model for each request based on task characteristics, connector health, and learned priors from routing telemetry and replay data
- **Local-first architecture** -- Run entirely on your own hardware with Ollama; cloud providers are optional
- **Microservices backend** -- 16 independent NestJS services with fault isolation and independent scaling
- **Secure secret management** -- Connector API keys encrypted at rest with AES-256-GCM
- **Chat interface** -- Threaded conversations with full message history
- **Memory and context packs** -- Persistent memory and embeddings for contextual conversations
- **File processing** -- Upload, chunk, and index files for retrieval-augmented generation
- **Advanced chat orchestration** -- Parallel compare, consensus, escalation chains, repair, best-of-n, verification, role packs, and pipelines
- **Routing replay and judge review** -- Replay Lab and judge/referee flows help tune routing quality over time
- **Workspace grounding** -- External connector sync, search, and approval-style actions through the workspace service
- **Desktop agent runtime** -- Local CLI sessions, human-approved terminal commands, repository registration, and file-system event reporting
- **Image and file generation** -- Dedicated services for image output and downloadable document/file generation
- **Operational visibility** -- Aggregated health, audit logging, usage ledgers, client logs, and server logs
- **Role-based access control** -- Admin, operator, and viewer roles with JWT authentication
- **Monorepo structure** -- Frontend, 16 backend services, and 4 shared packages using npm workspaces

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> claw && cd claw

# 2. Copy environment files for all services
bash scripts/setup.sh
# Or manually: copy .env.example to .env

# 3. Start all containers (infrastructure + services)
docker compose -f docker-compose.dev.yml up -d

# 4. Wait for services to start (~60 seconds), then verify
curl http://localhost:4000/api/v1/health

# 5. Open the frontend
open http://localhost:3000
```

### Default Credentials

| Field    | Value            |
| -------- | ---------------- |
| Email    | admin@claw.local |
| Password | ClawAdmin123!    |

You will be prompted to change your password on first login.

The auth service automatically runs database migrations and seeds the default admin user on first start. If users already exist, the seed is skipped (idempotent).

The frontend is available at `http://localhost:3000` and all API traffic routes through Nginx at `http://localhost:4000`.

---

## Architecture Overview

```text
Browser
  |
  v
Next.js Frontend (:3000)
  |
  v
Nginx Reverse Proxy (:4000)
  |
  +--> Auth (:4001) -------------> PostgreSQL claw_auth (:5441)
  +--> Chat (:4002) -------------> PostgreSQL claw_chat (:5442)
  +--> Connector (:4003) --------> PostgreSQL claw_connectors (:5443)
  +--> Routing (:4004) ----------> PostgreSQL claw_routing (:5444)
  +--> Memory (:4005) -----------> PostgreSQL claw_memory (:5445, pgvector)
  +--> File (:4006) -------------> PostgreSQL claw_files (:5446)
  +--> Audit (:4007) ------------> MongoDB claw_audit (:27018)
  +--> Ollama Service (:4008) ---> PostgreSQL claw_ollama (:5447)
  +--> Health (:4009) -----------> Aggregated service health
  +--> Client Logs (:4010) ------> MongoDB claw_client_logs (:27018)
  +--> Server Logs (:4011) ------> MongoDB claw_server_logs (:27018)
  +--> Image (:4012) ------------> PostgreSQL claw_images (:5448)
  +--> File Generation (:4013) --> PostgreSQL claw_file_generations (:5449)
  +--> Agent (:4015) ------------> PostgreSQL claw_agent (:5451)
  +--> Research (:4016) ---------> PostgreSQL claw_research (:5452)
  +--> Workspace (:4017) --------> PostgreSQL claw_workspace (:5450)

Shared infrastructure:
  - RabbitMQ (:5672 / :15672)
  - Redis (:6380)
  - Ollama runtime (:11434)
  - ClamAV (:3310)
```

### Service Table

| Service         | Port | Database                                  | Purpose                                               |
| --------------- | ---- | ----------------------------------------- | ----------------------------------------------------- |
| Auth            | 4001 | PostgreSQL `claw_auth` (5441)             | Users, sessions, JWT, roles                           |
| Chat            | 4002 | PostgreSQL `claw_chat` (5442)             | Threads, messages, streaming, orchestration workflows |
| Connector       | 4003 | PostgreSQL `claw_connectors` (5443)       | Provider configs, model catalogs                      |
| Routing         | 4004 | PostgreSQL `claw_routing` (5444)          | Routing decisions, policies                           |
| Memory          | 4005 | PostgreSQL `claw_memory` (5445, pgvector) | Memory, context packs, embeddings                     |
| File            | 4006 | PostgreSQL `claw_files` (5446)            | File upload, chunking                                 |
| Audit           | 4007 | MongoDB `claw_audit` (27018)              | Audit logs, usage ledger                              |
| Ollama Service  | 4008 | PostgreSQL `claw_ollama` (5447)           | Local model proxy and catalog                         |
| Health          | 4009 | None (stateless)                          | Aggregates health from downstream services            |
| Client Logs     | 4010 | MongoDB `claw_client_logs` (27018)        | Frontend log ingestion                                |
| Server Logs     | 4011 | MongoDB `claw_server_logs` (27018)        | Backend structured log aggregation                    |
| Image           | 4012 | PostgreSQL `claw_images` (5448)           | Image generation orchestration                        |
| File Generation | 4013 | PostgreSQL `claw_file_generations` (5449) | Downloadable document/file generation                 |
| Agent           | 4015 | PostgreSQL `claw_agent` (5451)            | Local agent sessions, commands, repos, file events    |
| Research        | 4016 | PostgreSQL `claw_research` (5452)         | Dynamic search, fetch, scrape, evidence orchestration |
| Workspace       | 4017 | PostgreSQL `claw_workspace` (5450)        | External workspace context, sync, actions             |

### Infrastructure

| Component      | Host Port(s) | Internal Port | Purpose                        |
| -------------- | ------------ | ------------- | ------------------------------ |
| Nginx          | 4000         | 80            | Reverse proxy / API gateway    |
| PostgreSQL x12 | 5441-5452    | 5432          | Per-service relational storage |
| MongoDB        | 27018        | 27017         | Audit and log storage          |
| Redis          | 6380         | 6379          | Caching and ephemeral state    |
| RabbitMQ       | 5672         | 5672          | Async inter-service messaging  |
| RabbitMQ UI    | 15672        | 15672         | Management console             |
| Ollama         | 11434        | 11434         | Local model inference          |
| ClamAV         | 3310         | 3310          | File antivirus scanning        |
| Frontend       | 3000         | 3000          | Next.js UI                     |

---

## Project Structure

```text
claw/
├── apps/
│   ├── claw-frontend/                # Next.js frontend application
│   ├── claw-auth-service/            # Auth microservice (:4001)
│   ├── claw-chat-service/            # Chat microservice (:4002)
│   ├── claw-connector-service/       # Connector microservice (:4003)
│   ├── claw-routing-service/         # Routing microservice (:4004)
│   ├── claw-memory-service/          # Memory microservice (:4005)
│   ├── claw-file-service/            # File microservice (:4006)
│   ├── claw-audit-service/           # Audit microservice (:4007)
│   ├── claw-ollama-service/          # Ollama proxy microservice (:4008)
│   ├── claw-health-service/          # Health aggregator microservice (:4009)
│   ├── claw-client-logs-service/     # Frontend log ingestion (:4010)
│   ├── claw-server-logs-service/     # Backend log aggregation (:4011)
│   ├── claw-image-service/           # Image generation service (:4012)
│   ├── claw-file-generation-service/ # File generation service (:4013)
│   ├── claw-agent-service/           # Local agent runtime backend (:4015)
│   ├── claw-research-service/        # Dynamic search and evidence orchestration (:4016)
│   └── claw-workspace-service/       # Workspace grounding and actions (:4017)
├── packages/
│   ├── shared-types/                 # @claw/shared-types
│   ├── shared-constants/             # @claw/shared-constants
│   ├── shared-rabbitmq/              # @claw/shared-rabbitmq
│   └── shared-auth/                  # @claw/shared-auth
├── docs/                             # Documentation and ADRs
├── infra/                            # Docker, nginx, and deployment configs
├── scripts/                          # Development and operations scripts
├── docker-compose.dev.yml            # Full 33-container development stack
├── docker-compose.dev.services.yml   # Service-focused development compose file
└── package.json                      # Root workspace config
```

---

## Development Commands

| Command                                                      | Description                              |
| ------------------------------------------------------------ | ---------------------------------------- |
| `npm run dev:frontend`                                       | Start frontend only                      |
| `npm run dev --workspace=claw-chat-service`                  | Start chat service only                  |
| `npm run dev --workspace=claw-workspace-service`             | Start workspace service only             |
| `npm run dev --workspace=claw-agent-service`                 | Start agent service only                 |
| `npm run build`                                              | Build all applications and packages      |
| `npm run lint`                                               | Lint all applications and packages       |
| `npm run typecheck`                                          | Type-check all applications and packages |
| `npm run test`                                               | Run all test suites                      |
| `npm run test:e2e`                                           | Run end-to-end tests (Playwright)        |
| `npm run format`                                             | Format code with Prettier                |
| `npm run clean`                                              | Remove build artifacts and node_modules  |
| `docker compose -f docker-compose.dev.yml up -d`             | Start the full dev stack                 |
| `docker compose -f docker-compose.dev.yml down`              | Stop the full dev stack                  |
| `docker compose -f docker-compose.dev.yml logs -f <service>` | Tail logs for a specific container       |

---

## Documentation

- [Installation Guide](INSTALL.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)
- [Documentation Hub](docs/README.md)
- [Backend Services Index](docs/04-backend/services-index.md)
- [Workspace Service Guide](docs/04-backend/service-guide-workspace.md)
- [Agent API Reference](docs/12-reference/api-reference-agent.md)
- [Workspace API Reference](docs/12-reference/api-reference-workspace.md)
- [Security](SECURITY.md)
- [Testing](TESTING.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [ADR-004: Microservices Architecture](docs/adrs/004-microservices-architecture.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
