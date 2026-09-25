```
   _____ _
  / ____| |
 | |    | | __ ___      __
 | |    | |/ _` \ \ /\ / /
 | |____| | (_| |\ V  V /
  \_____|_|\__,_| \_/\_/
```

# ClawAI

**Every AI, one workspace.**

Every frontier AI model in one workspace that sees, hears, researches and builds.
Pay as you go, bring your team, or run it on your own hardware.

> Positioning is canonical in [docs/01-executive-context/product-vision.md](docs/01-executive-context/product-vision.md)
> ([ADR-126](docs/13-adr/adr-126-every-ai-one-workspace-positioning.md)). Every
> feature below is traced to the code that runs it, with its limits, in
> [docs/02-business-product/flagship-features.md](docs/02-business-product/flagship-features.md).

---

## Why ClawAI

| Pillar                      | What you get                                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One workspace**           | Not a chat box. The AI hears voice notes, watches video, reads PDFs and archives, researches the web, compares models, and writes the PDF, Word, Excel or PowerPoint file you asked for. |
| **Pay as you go**           | Credit metered per use across every AI surface, shown in your own currency. Monthly, quarterly, semiannual and yearly plans too.                                                         |
| **Bring your team**         | Admins create and manage users, assign roles and permissions, grant plans, and see per-user usage. Coding agents follow an organisation policy.                                          |
| **Local-first and private** | Run the whole stack on your own hardware with Ollama, llama.cpp and local image models. Every upload is virus-scanned; retention and memory controls are yours.                          |

Not built yet, so not claimed: single sign-on (SSO) and a shared team account
with pooled billing — see the [requirements register](docs/02-business-product/requirements-register.md).

---

## Flagship Features

1. **Multimodal AI** — voice and video notes, transcription, helper vision that
   describes images for text-only models, videos delivered to every model, and
   AUTO routing that picks a model able to handle the media. Send a file with no
   text and it is answered.
2. **Files from chat** — the AI writes PDF (typeset by Typst), Word, Excel,
   PowerPoint and Zip bundles, names them itself, within a daily allowance per
   plan. Download any answer in eight formats.
3. **Smart attachments** — ZIP, 7z, RAR, TAR and more expand as a tree, with a
   password retry in the chat; drop files anywhere; owner-only downloads of
   AI-made files that expire after an hour; ClamAV scanning on every upload.
4. **Narrated AI research and crawling** — an AI plans each turn's web work and
   narrates every step; pasted links are opened (up to 10 per message); site
   crawls up to 200 pages; fetches escalate from official APIs through TLS
   impersonation and a headless browser to optional Crawl4AI, FlareSolverr and
   Firecrawl sidecars and an archive snapshot — and robots.txt is respected.
5. **Orchestration labs** — Compare 2–5 models with a judge that ranks every
   answer, plus nine labs: Consensus, Escalation, Repair, Decompose, Best-of-N,
   Verify, Pipeline, Cost Ensemble and Role Pack — all with files and research.
6. **Conversation power tools** — branch from any message, edit and rerun, find
   in a conversation, export to Markdown, cross-thread context, prompt history.
7. **Read aloud** — metered, plan-gated text-to-speech that starts on the first
   segment and can be cancelled.
8. **Images** — generate with OpenAI, Gemini, xAI Grok or local Stable Diffusion
   and ComfyUI; shared conversation pages keep their images.
9. **Pay-as-you-go credit** — metered on 12 surfaces, prices shown in the
   visitor's currency while the charge settles separately.
10. **22 usable providers** — OpenAI, Anthropic, Gemini, DeepSeek, xAI, Ollama,
    llama.cpp and 15 OpenAI-compatible presets (OpenRouter, Groq, Mistral, Kimi,
    GLM, Qwen, Cohere and more), the real model catalog, modality- and
    context-aware AUTO routing, and a shared provider circuit breaker.
11. **Coding Agent for VS Code** — a separate extension that signs in through the
    browser and obeys an organisation policy served by ClawAI.
12. **Teams and administration** — user management, roles and permissions, plan
    grants, per-user usage statistics.
13. **Observability** — an admin status page with uptime and incidents, Grafana
    and Prometheus, every container's log in one store, read-only ops tokens.
14. **Local-first and privacy** — Ollama, llama.cpp, local image generation, GPU
    overlay picked automatically, retention and memory controls.
15. **Reliability** — chat-service scales horizontally, dropped streams resume,
    Stop works across replicas, rolling deploys.

Also: memory and context packs, workspace connectors and automations, routing
transparency on every answer, audit logging, and 13 interface languages with
right-to-left support.

---

## Quick Start

The installer checks prerequisites (Docker, Node.js 22+, Git), generates secrets,
writes `.env`, sets up local TLS, and starts the stack. Re-running it resumes.

```bash
# Linux / macOS
git clone <repo-url> claw && cd claw
bash scripts/install.sh
```

```powershell
# Windows (PowerShell)
git clone <repo-url> claw; cd claw
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

Then open **https://claw.local** (the TLS step adds it to your hosts file) and
sign in with the admin email and password you chose during install (default
email `admin@claw.local`).

Afterwards, `./scripts/claw.sh up -d` is the only supported way to start the
stack — it stitches the split compose files and picks the right GPU overlay.
Local AI (Ollama, llama.cpp, local image models) is opt-in: see the
[installation guide](docs/00-start-here/installation.md).

```bash
curl https://claw.local/api/v1/health   # aggregated service health
```

Human-facing URLs use a locale prefix (for example `/en`, `/fa/features`, and
`/ja/chat`). Machine routes such as `/api/*`, `/robots.txt`, and `/sitemap.xml`
remain locale-neutral. See
[Multilingual discovery](docs/05-frontend/multilingual-discovery.md) for the
publication, privacy, deployment, and search-removal contracts, and
[SEO content architecture](docs/05-frontend/seo-content-architecture.md) for
the audit, the verified capability inventory content pages must trace to, and
the cluster-by-cluster build plan.

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
  +--> Workspace (:4014) --------> PostgreSQL claw_workspace (:5450)
  +--> Llamacpp (:4017) ---------> PostgreSQL claw_llamacpp (:5440)
  +--> Payment (:4018) ----------> PostgreSQL claw_payments (:5453)
                                   + llamacpp-data volume (binary + GGUF weights)

Shared infrastructure:
  - RabbitMQ (:5672 / :15672)
  - Redis (:6380)
  - Ollama runtime (:11434)
  - ClamAV (:3310)
```

### Service Table

| Service         | Port | Database                                  | Purpose                                                                                                                                                                                                                                                               |
| --------------- | ---- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth            | 4001 | PostgreSQL `claw_auth` (5441)             | Users, sessions, JWT, roles                                                                                                                                                                                                                                           |
| Chat            | 4002 | PostgreSQL `claw_chat` (5442)             | Threads, messages, streaming, orchestration workflows                                                                                                                                                                                                                 |
| Connector       | 4003 | PostgreSQL `claw_connectors` (5443)       | Provider configs, model catalogs                                                                                                                                                                                                                                      |
| Routing         | 4004 | PostgreSQL `claw_routing` (5444)          | Routing decisions, policies                                                                                                                                                                                                                                           |
| Memory          | 4005 | PostgreSQL `claw_memory` (5445, pgvector) | Memory, context packs, embeddings                                                                                                                                                                                                                                     |
| File            | 4006 | PostgreSQL `claw_files` (5446)            | File upload, chunking                                                                                                                                                                                                                                                 |
| Audit           | 4007 | MongoDB `claw_audit` (27018)              | Audit logs, usage ledger                                                                                                                                                                                                                                              |
| Ollama Service  | 4008 | PostgreSQL `claw_ollama` (5447)           | Local model proxy and catalog                                                                                                                                                                                                                                         |
| Health          | 4009 | None (stateless)                          | Aggregates health from downstream services                                                                                                                                                                                                                            |
| Client Logs     | 4010 | MongoDB `claw_client_logs` (27018)        | Frontend log ingestion                                                                                                                                                                                                                                                |
| Server Logs     | 4011 | MongoDB `claw_server_logs` (27018)        | Backend structured log aggregation                                                                                                                                                                                                                                    |
| Image           | 4012 | PostgreSQL `claw_images` (5448)           | Image generation orchestration                                                                                                                                                                                                                                        |
| File Generation | 4013 | PostgreSQL `claw_file_generations` (5449) | Downloadable document/file generation                                                                                                                                                                                                                                 |
| Agent           | 4015 | PostgreSQL `claw_agent` (5451)            | Local agent sessions, commands, repos, file events                                                                                                                                                                                                                    |
| Research        | 4016 | PostgreSQL `claw_research` (5452)         | Dynamic search, fetch, scrape, evidence orchestration                                                                                                                                                                                                                 |
| Workspace       | 4014 | PostgreSQL `claw_workspace` (5450)        | External workspace context, sync, actions                                                                                                                                                                                                                             |
| Llamacpp        | 4017 | PostgreSQL `claw_llamacpp` (5440)         | Frontier open-weight LLMs (Kimi K2.6, GLM-5.1, DeepSeek V3.2/V4) via vanilla `llama.cpp`. Auto-installs binary, manages HF downloads, supervises a single resident model. Multi-vendor GPU passthrough (NVIDIA / AMD ROCm / Intel-Vulkan) auto-detected by `claw.sh`. |
| Payment         | 4018 | PostgreSQL `claw_payments` (5453)         | Checkout, subscriptions, invoices, pay-as-you-go top-ups, display currency                                                                                                                                                                                            |

### Infrastructure

| Component      | Host Port(s)  | Internal Port | Purpose                                      |
| -------------- | ------------- | ------------- | -------------------------------------------- |
| Nginx          | 443, 80, 4000 | 443, 80       | TLS termination, reverse proxy / API gateway |
| PostgreSQL x14 | 5440-5453     | 5432          | Per-service relational storage               |
| MongoDB        | 27018         | 27017         | Audit and log storage                        |
| Redis          | 6380          | 6379          | Caching and ephemeral state                  |
| RabbitMQ       | 5672          | 5672          | Async inter-service messaging                |
| RabbitMQ UI    | 15672         | 15672         | Management console                           |
| Ollama         | 11434         | 11434         | Local model inference                        |
| ClamAV         | 3310          | 3310          | File antivirus scanning                      |
| Frontend       | 3000          | 3000          | Next.js UI                                   |

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
│   ├── claw-workspace-service/       # Workspace grounding and actions (:4014)
│   ├── claw-research-service/        # Dynamic search and evidence orchestration (:4016)
│   ├── claw-llamacpp-service/        # Frontier open-weight LLMs via llama.cpp (:4017)
│   ├── claw-payment-service/         # Payments, subscriptions, PAYG top-ups (:4018)
│   └── claw-coding-agent/            # VS Code Coding Agent (submodule, separate repository)
├── packages/
│   ├── shared-types/                 # @claw/shared-types
│   ├── shared-constants/             # @claw/shared-constants
│   ├── shared-rabbitmq/              # @claw/shared-rabbitmq
│   ├── shared-auth/                  # @claw/shared-auth
│   ├── shared-entitlements/          # @claw/shared-entitlements
│   └── shared-utilities/             # @claw/shared-utilities
├── docs/                             # Documentation and ADRs
├── infra/                            # Docker, nginx, and deployment configs
├── scripts/                          # Development and operations scripts
├── docker/                           # All docker-compose.{dev,prod}.*.yml split files
└── package.json                      # Root workspace config
```

---

## Development Commands

| Command                                          | Description                              |
| ------------------------------------------------ | ---------------------------------------- |
| `npm run dev:frontend`                           | Start frontend only                      |
| `npm run dev --workspace=claw-chat-service`      | Start chat service only                  |
| `npm run dev --workspace=claw-workspace-service` | Start workspace service only             |
| `npm run dev --workspace=claw-agent-service`     | Start agent service only                 |
| `npm run build`                                  | Build all applications and packages      |
| `npm run lint`                                   | Lint all applications and packages       |
| `npm run typecheck`                              | Type-check all applications and packages |
| `npm run test`                                   | Run all test suites                      |
| `npm run test:e2e`                               | Run end-to-end tests (Playwright)        |
| `npm run format`                                 | Format code with Prettier                |
| `npm run clean`                                  | Remove build artifacts and node_modules  |
| `./scripts/claw.sh up`                           | Start the full dev stack                 |
| `./scripts/claw.sh down`                         | Stop the full dev stack                  |
| `./scripts/claw.sh logs -f <service>`            | Tail logs for a specific container       |

---

## Documentation

- [Product Vision — positioning](docs/01-executive-context/product-vision.md)
- [Flagship Features — traced to code](docs/02-business-product/flagship-features.md)
- [Installation Guide](docs/00-start-here/installation.md)
- [Environment Variables](docs/06-data/environment-variables.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Documentation Hub](docs/README.md)
- [Backend Services Index](docs/04-backend/services-index.md)
- [Workspace Service Guide](docs/04-backend/service-guide-workspace.md)
- [Agent API Reference](docs/12-reference/api-reference-agent.md)
- [Workspace API Reference](docs/12-reference/api-reference-workspace.md)
- [Security](.github/SECURITY.md)
- [Testing](docs/09-testing/testing-overview.md)
- [Contributing](.github/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)
- [Code of Conduct](.github/CODE_OF_CONDUCT.md)
- [ADR-004: Microservices Architecture](docs/adrs/004-microservices-architecture.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
