# Environment Ownership Map

**274 environment variables** (`.ai/manifests/environment-variables.json`). A
single root `.env` (copy from `.env.example`) drives everything; all services use
`env_file: .env`. Config is read through a **Zod-validated AppConfig** — never
`process.env` directly (`rules/02-backend-rules.md`).

## Variable groups

| Group                     | Examples                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| General                   | `NODE_ENV`, `CORS_ORIGINS`, `THROTTLE_TTL/LIMIT`, `CLAW_LOCAL_AI`, `CLAW_HOSTNAME`                                         |
| PostgreSQL (×13)          | `PG_<SVC>_USER/PASSWORD/DB/PORT`, `<SVC>_DATABASE_URL`                                                                     |
| MongoDB                   | `MONGO_USER/PASSWORD/DB/PORT`, `AUDIT_MONGODB_URI`, `CLIENT_LOGS_MONGODB_URI`, `SERVER_LOGS_MONGODB_URI`                   |
| Redis / RabbitMQ          | `REDIS_URL/PORT`, `RABBITMQ_USER/PASSWORD/URL/PORT/MANAGEMENT_PORT`                                                        |
| JWT / crypto              | `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `ENCRYPTION_KEY`, `INTER_SERVICE_AUTH_TOKEN`                      |
| Admin seed                | `ADMIN_EMAIL/USERNAME/PASSWORD`                                                                                            |
| Frontend                  | `NEXT_PUBLIC_API_URL/APP_NAME/APP_URL`, `FRONTEND_PORT`                                                                    |
| Outbound email            | `CONTACT_EMAIL_ENABLED/PROVIDER/FROM`, `CONTACT_SMTP_HOST/PORT/SECURE/USER/PASS`                                           |
| Per-service ports         | `AUTH_PORT`, `CHAT_PORT`, …, `CLIENT_LOGS_PORT`, `SERVER_LOGS_PORT`                                                        |
| Inter-service URLs        | `<SVC>_SERVICE_URL`                                                                                                        |
| TLS                       | `HTTPS_CERT_PATH`, `HTTPS_KEY_PATH`, `NODE_EXTRA_CA_CERTS`                                                                 |
| Ollama / local AI         | `OLLAMA_BASE_URL`, `OLLAMA_API_KEY`, `OLLAMA_ROUTER_MODEL`, `AUTO_PULL_MODELS`, `COMFYUI_BASE_URL`, `STABLE_DIFFUSION_URL` |
| llama.cpp                 | `LLAMACPP_DATA_PATH`, `LLAMACPP_BINARY_VERSION`, `LLAMACPP_GPU_BACKEND`, `HUGGINGFACE_TOKEN`, …                            |
| Files / OCR / ZIP         | `FILE_STORAGE_PATH`, `CLAMAV_HOST/PORT/ENABLED`, `OCR_*`, `ZIP_*`, `FILE_RETENTION_*`                                      |
| Memory/Context V2         | `MEMORY_V2_ENABLED`, `CONTEXT_V2_ENABLED`, `RETRIEVAL_V2_ENABLED`, `MEMORY_EXTRACTION_MODEL`, `RETRIEVAL_*`                |
| Workspace                 | `GITHUB_*`, `GITLAB_*`, `JIRA_*`, `SLACK_*`, `GOOGLE_*`, `*_WEBHOOK_SECRET`, `WORKSPACE_SYNC_*`, `AUTO_SUGGEST_*`          |
| Routing feature flags     | `ROUTING_*_ENABLED`, `ROUTING_V2_CANARY_PERCENT`, `ROUTER_COMPACT_PROMPT`                                                  |
| Compare/Judge/file attach | `ENABLE_ANTHROPIC_NATIVE_PDF`, `ENABLE_GEMINI_FILES_API`, `GEMINI_FILES_API_*`                                             |

Ports for **client-logs (`CLIENT_LOGS_PORT`) and server-logs
(`SERVER_LOGS_PORT`) are env-only** — no shared-constants constant. See
[port-and-service-map.md](port-and-service-map.md).

## Mandatory propagation checklist (adding/renaming a var)

An env var is not "added" until it exists in **every** place. From `CLAUDE.md`
MANDATORY Change Checklist:

1. `.env.example` — with an example value
2. `.env` — a working dev value
3. `scripts/install.sh` — generated .env block
4. `scripts/install.ps1` — Windows installer
5. **ALL split docker compose files** — `docker/docker-compose.{dev,prod}.{databases,services,ollama}.yml` (+ GPU overlays if GPU-related)
6. Service's Zod AppConfig schema (so it validates)
7. `docs/06-data/environment-variables.md`
8. `CLAUDE.md` env section if it introduces a new group/pattern

For a **new service** additionally: `packages/shared-constants` (port + name),
`apps/claw-health-service` (health list), `.github/workflows/ci.yml` (test env),
`infra/nginx/nginx.conf`, `scripts/install-tls.{sh,ps1}` (SAN hostname).

## Rules

- **Never `process.env` directly** — go through the Zod-validated AppConfig.
- **Never log** `JWT_SECRET`, `ENCRYPTION_KEY`, `*_PASSWORD`, `*_SECRET`,
  `*_TOKEN`, `OLLAMA_API_KEY`, OAuth client secrets — Pino redaction is
  configured; extend it, don't bypass.
- **Never expose secrets to the frontend** — only `NEXT_PUBLIC_*` reach the
  browser.
- Adding a var that a compose file misses causes "container not found" / missing
  config at boot. The infra pack ([task-router.md](task-router.md)) covers this.

Regenerate the list any time: `.ai/manifests/environment-variables.json` is
produced by `npm run knowledge:build`.
