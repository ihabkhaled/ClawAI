# Port & Service Map

> Consolidated reference for **every** ClawAI process, its port, and its
> datastore. When something "can't connect", start here.

## Entry points

| Component           | Port                            | Notes                                           |
| ------------------- | ------------------------------- | ----------------------------------------------- |
| Frontend (Next.js)  | 3000                            | `claw-frontend`                                 |
| Nginx reverse proxy | 4000 (HTTP → 301) / 443 (HTTPS) | All API traffic; routes `/api/v1/*` to services |

## Backend services (17)

| Service         | Port | Datastore                                     | Prisma? | Purpose                                        |
| --------------- | ---- | --------------------------------------------- | :-----: | ---------------------------------------------- |
| auth            | 4001 | PostgreSQL `claw_auth` (5441)                 |   ✅    | Users, sessions, JWT, RBAC                     |
| chat            | 4002 | PostgreSQL `claw_chat` (5442)                 |   ✅    | Threads, messages, streaming, orchestration    |
| connector       | 4003 | PostgreSQL `claw_connectors` (5443)           |   ✅    | Provider configs (AES-256-GCM), model catalogs |
| routing         | 4004 | PostgreSQL `claw_routing` (5444)              |   ✅    | Routing decisions, policies, replay            |
| memory          | 4005 | PostgreSQL `claw_memory` (5445, **pgvector**) |   ✅    | Memory, context packs, embeddings              |
| file            | 4006 | PostgreSQL `claw_files` (5446)                |   ✅    | Upload, chunking, ClamAV scan                  |
| audit           | 4007 | **MongoDB** `claw_audit` (27018)              |   ❌    | Audit logs, usage ledger                       |
| ollama          | 4008 | PostgreSQL `claw_ollama` (5447)               |   ✅    | Local model mgmt, catalog, generation          |
| health          | 4009 | _(none)_                                      |   ❌    | Aggregates health from all services            |
| client-logs     | 4010 | **MongoDB** `claw_client_logs` (27018)        |   ❌    | Frontend logs (TTL 30d)                        |
| server-logs     | 4011 | **MongoDB** `claw_server_logs` (27018)        |   ❌    | Backend logs (TTL 30d)                         |
| image           | 4012 | PostgreSQL `claw_images` (5448)               |   ✅    | Image generation (DALL-E/Gemini/SD/ComfyUI)    |
| file-generation | 4013 | PostgreSQL `claw_file_generations` (5449)     |   ✅    | Export PDF/DOCX/CSV/HTML/MD/TXT/JSON           |
| workspace       | 4014 | PostgreSQL `claw_workspace` (5450)            |   ✅    | Workspace connectors, OAuth, sync, search      |
| agent           | 4015 | PostgreSQL `claw_agent` (5451)                |   ✅    | Desktop agent sessions, capability framework   |
| research        | 4016 | PostgreSQL `claw_research` (5452)             |   ✅    | Search/fetch/scrape/clone + evidence           |
| llamacpp        | 4017 | PostgreSQL `claw_llamacpp` (5440)             |   ✅    | Local frontier LLMs via vanilla llama.cpp      |

**Totals:** 13 PostgreSQL instances (ports 5440–5452), 1 MongoDB (3 logical
databases, port 27018), 13 Prisma services, 4 non-Prisma (audit, health,
client-logs, server-logs).

## Shared infrastructure

| Component              | Port(s)                          | Notes                                            |
| ---------------------- | -------------------------------- | ------------------------------------------------ |
| RabbitMQ               | 5672 (AMQP) / 15672 (management) | Topic exchange `claw.events`, DLQ + 3 retries    |
| Redis                  | 6380                             | Caching / rate-limit windows                     |
| Ollama runtime         | 11434                            | `claw-ollama` container (`ollama/ollama:latest`) |
| ClamAV                 | 3310                             | File upload antivirus (`claw-clamav`)            |
| Stable Diffusion (opt) | —                                | `claw-stable-diffusion`                          |
| ComfyUI (opt)          | —                                | `claw-comfyui`                                   |

## Shared packages (5, no ports)

`@claw/shared-types`, `@claw/shared-constants`, `@claw/shared-rabbitmq`,
`@claw/shared-auth`, `@claw/shared-utilities`. Each has `lint`/`test`/`build`/`typecheck`
and is a CI matrix entry. See [../04-backend/shared-packages.md](../04-backend/shared-packages.md).

## Where these are defined

- **Ports/names:** `packages/shared-constants/src/index.ts`
- **Inter-service URLs + DB URLs:** `.env` / [../06-data/environment-variables.md](../06-data/environment-variables.md)
- **Containers:** `docker/docker-compose.dev.{databases,services,ollama}.yml` (+ prod, + GPU overlays)
- **Nginx routes:** `infra/nginx/nginx.conf`
- **Health checks:** `apps/claw-health-service`
