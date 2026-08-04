# Environment Variables

Complete reference for all environment variables used by Claw.

All variables are defined in `.env.example` at the project root. Copy it to `.env` and fill in secrets before starting.

---

## General

| Variable         | Required | Default                 | Description                              |
| ---------------- | -------- | ----------------------- | ---------------------------------------- |
| `NODE_ENV`       | No       | `development`           | `development` or `production`            |
| `CORS_ORIGINS`   | Yes      | `http://localhost:3000` | Comma-separated allowed origins for CORS |
| `THROTTLE_TTL`   | No       | `60000`                 | Rate-limit window in milliseconds        |
| `THROTTLE_LIMIT` | No       | `2500`                  | Max requests per window per user/IP      |

---

## Shared outbound email

The frontend contact route and payment-service invoice worker use the same
server-only SMTP configuration and the shared hardened transport adapter.
Invoice PDFs remain available through authenticated download when delivery is
disabled.

| Variable                 | Required             | Default               | Description                                       |
| ------------------------ | -------------------- | --------------------- | ------------------------------------------------- |
| `CONTACT_EMAIL_ENABLED`  | No                   | `false`               | Enables configured outbound delivery              |
| `CONTACT_EMAIL_PROVIDER` | No                   | `none`                | `smtp` for real delivery; `none` disables it      |
| `CONTACT_EMAIL_FROM`     | When SMTP is enabled | `no-reply@claw.local` | Verified sender used by contact and invoice mail  |
| `CONTACT_SMTP_HOST`      | When SMTP is enabled | —                     | SMTP relay host                                   |
| `CONTACT_SMTP_PORT`      | No                   | `587`                 | `465` implicit TLS; other ports require STARTTLS  |
| `CONTACT_SMTP_SECURE`    | No                   | `false`               | Operator hint; TLS mode is safely derived by port |
| `CONTACT_SMTP_USER`      | When SMTP is enabled | —                     | SMTP username                                     |
| `CONTACT_SMTP_PASS`      | When SMTP is enabled | —                     | SMTP password; never log or expose                |

`CONTACT_EMAIL_TO`, `CONTACT_RATE_LIMIT_MAX`, and
`CONTACT_RATE_LIMIT_WINDOW_MS` are contact-form-only. Invoice delivery uses the
recipient frozen from the authenticated checkout and never accepts a webhook
recipient.

---

## PostgreSQL Instances

Claw uses 14 separate PostgreSQL instances, one per data-owning service.

| Variable                       | Required | Default                    | Description                         |
| ------------------------------ | -------- | -------------------------- | ----------------------------------- |
| `PG_AUTH_HOST`                 | Yes      | `claw-pg-auth`             | Auth database host                  |
| `PG_AUTH_PORT`                 | Yes      | `5432`                     | Auth database port (internal)       |
| `PG_AUTH_USER`                 | Yes      | `claw`                     | Auth database username              |
| `PG_AUTH_PASSWORD`             | Yes      | `claw_secret`              | Auth database password              |
| `PG_AUTH_DB`                   | Yes      | `claw_auth`                | Auth database name                  |
| `PG_CHAT_HOST`                 | Yes      | `claw-pg-chat`             | Chat database host                  |
| `PG_CHAT_PORT`                 | Yes      | `5432`                     | Chat database port                  |
| `PG_CHAT_USER`                 | Yes      | `claw`                     | Chat database username              |
| `PG_CHAT_PASSWORD`             | Yes      | `claw_secret`              | Chat database password              |
| `PG_CHAT_DB`                   | Yes      | `claw_chat`                | Chat database name                  |
| `PG_CONNECTORS_HOST`           | Yes      | `claw-pg-connector`        | Connector database host             |
| `PG_CONNECTORS_PORT`           | Yes      | `5432`                     | Connector database port             |
| `PG_CONNECTORS_USER`           | Yes      | `claw`                     | Connector database username         |
| `PG_CONNECTORS_PASSWORD`       | Yes      | `claw_secret`              | Connector database password         |
| `PG_CONNECTORS_DB`             | Yes      | `claw_connectors`          | Connector database name             |
| `PG_ROUTING_HOST`              | Yes      | `claw-pg-routing`          | Routing database host               |
| `PG_ROUTING_PORT`              | Yes      | `5432`                     | Routing database port               |
| `PG_ROUTING_USER`              | Yes      | `claw`                     | Routing database username           |
| `PG_ROUTING_PASSWORD`          | Yes      | `claw_secret`              | Routing database password           |
| `PG_ROUTING_DB`                | Yes      | `claw_routing`             | Routing database name               |
| `PG_MEMORY_HOST`               | Yes      | `claw-pg-memory`           | Memory database host                |
| `PG_MEMORY_PORT`               | Yes      | `5432`                     | Memory database port                |
| `PG_MEMORY_USER`               | Yes      | `claw`                     | Memory database username            |
| `PG_MEMORY_PASSWORD`           | Yes      | `claw_secret`              | Memory database password            |
| `PG_MEMORY_DB`                 | Yes      | `claw_memory`              | Memory database name                |
| `PG_FILES_HOST`                | Yes      | `claw-pg-files`            | File database host                  |
| `PG_FILES_PORT`                | Yes      | `5432`                     | File database port                  |
| `PG_FILES_USER`                | Yes      | `claw`                     | File database username              |
| `PG_FILES_PASSWORD`            | Yes      | `claw_secret`              | File database password              |
| `PG_FILES_DB`                  | Yes      | `claw_files`               | File database name                  |
| `PG_OLLAMA_HOST`               | Yes      | `claw-pg-ollama`           | Ollama service database host        |
| `PG_OLLAMA_PORT`               | Yes      | `5432`                     | Ollama service database port        |
| `PG_OLLAMA_USER`               | Yes      | `claw`                     | Ollama service database username    |
| `PG_OLLAMA_PASSWORD`           | Yes      | `claw_secret`              | Ollama service database password    |
| `PG_OLLAMA_DB`                 | Yes      | `claw_ollama`              | Ollama service database name        |
| `PG_IMAGES_HOST`               | Yes      | `claw-pg-images`           | Image service database host         |
| `PG_IMAGES_PORT`               | Yes      | `5432`                     | Image service database port         |
| `PG_IMAGES_USER`               | Yes      | `claw`                     | Image service database username     |
| `PG_IMAGES_PASSWORD`           | Yes      | `claw_secret`              | Image service database password     |
| `PG_IMAGES_DB`                 | Yes      | `claw_images`              | Image service database name         |
| `PG_FILE_GENERATIONS_HOST`     | Yes      | `claw-pg-file-generations` | File gen database host              |
| `PG_FILE_GENERATIONS_PORT`     | Yes      | `5432`                     | File gen database port              |
| `PG_FILE_GENERATIONS_USER`     | Yes      | `claw`                     | File gen database username          |
| `PG_FILE_GENERATIONS_PASSWORD` | Yes      | `claw_secret`              | File gen database password          |
| `PG_FILE_GENERATIONS_DB`       | Yes      | `claw_file_generations`    | File gen database name              |
| `PG_AGENT_HOST`                | Yes      | `claw-pg-agent`            | Agent service database host         |
| `PG_AGENT_PORT`                | Yes      | `5432`                     | Agent service database port         |
| `PG_AGENT_USER`                | Yes      | `claw`                     | Agent service database username     |
| `PG_AGENT_PASSWORD`            | Yes      | `claw_secret`              | Agent service database password     |
| `PG_AGENT_DB`                  | Yes      | `claw_agent`               | Agent service database name         |
| `PG_RESEARCH_HOST`             | Yes      | `claw-pg-research`         | Research service database host      |
| `PG_RESEARCH_PORT`             | Yes      | `5432`                     | Research service database port      |
| `PG_RESEARCH_USER`             | Yes      | `claw`                     | Research service database username  |
| `PG_RESEARCH_PASSWORD`         | Yes      | `claw_secret`              | Research service database password  |
| `PG_RESEARCH_DB`               | Yes      | `claw_research`            | Research service database name      |
| `PG_WORKSPACE_HOST`            | Yes      | `claw-pg-workspace`        | Workspace service database host     |
| `PG_WORKSPACE_PORT`            | Yes      | `5432`                     | Workspace service database port     |
| `PG_WORKSPACE_USER`            | Yes      | `claw`                     | Workspace service database username |
| `PG_WORKSPACE_PASSWORD`        | Yes      | `claw_secret`              | Workspace service database password |
| `PG_WORKSPACE_DB`              | Yes      | `claw_workspace`           | Workspace service database name     |
| `PG_PAYMENTS_PORT`             | Yes      | `5453`                     | Payment database host port          |
| `PG_PAYMENTS_USER`             | Yes      | `claw`                     | Payment database username           |
| `PG_PAYMENTS_PASSWORD`         | Yes      | `claw_secret`              | Payment database password           |
| `PG_PAYMENTS_DB`               | Yes      | `claw_payments`            | Payment database name               |

**Notes:**

- Inside Docker Compose, services use Docker service names as hosts (e.g., `claw-pg-auth`) with internal port `5432`.
- When running services locally (outside Docker), use `localhost` with the host port (e.g., `5441` for auth).
- Each PostgreSQL instance is a separate Docker container for fault isolation.
- Memory service uses pgvector extension for embedding similarity search.

---

## MongoDB

| Variable         | Required | Default        | Description                        |
| ---------------- | -------- | -------------- | ---------------------------------- |
| `MONGO_HOST`     | Yes      | `claw-mongodb` | MongoDB host                       |
| `MONGO_PORT`     | Yes      | `27017`        | MongoDB port (internal)            |
| `MONGO_USER`     | No       | —              | MongoDB username (if auth enabled) |
| `MONGO_PASSWORD` | No       | —              | MongoDB password (if auth enabled) |

**Notes:**

- Used by Audit service (`claw_audit`), Client Logs service (`claw_client_logs`), and Server Logs service (`claw_server_logs`).
- Internal Docker port is `27017`; host port is `27018`.
- All log collections have a 30-day TTL index.

---

## Redis

| Variable     | Required | Default                   | Description           |
| ------------ | -------- | ------------------------- | --------------------- |
| `REDIS_HOST` | Yes      | `claw-redis`              | Redis host            |
| `REDIS_PORT` | Yes      | `6379`                    | Redis port (internal) |
| `REDIS_URL`  | No       | `redis://claw-redis:6379` | Redis connection URL  |

**Notes:**

- Used by Ollama service for state, by routing service for prompt cache (5-minute TTL), and by throttler middleware for rate-limit counters.
- Internal port `6379`; host port `6380`.

---

## RabbitMQ

| Variable             | Required | Default            | Description                 |
| -------------------- | -------- | ------------------ | --------------------------- |
| `RABBITMQ_HOST`      | Yes      | `claw-rabbitmq`    | RabbitMQ host               |
| `RABBITMQ_PORT`      | Yes      | `5672`             | RabbitMQ AMQP port          |
| `RABBITMQ_USER`      | Yes      | `guest`            | RabbitMQ username           |
| `RABBITMQ_PASSWORD`  | Yes      | `guest`            | RabbitMQ password           |
| `RABBITMQ_URL`       | No       | (built from above) | Full AMQP URL               |
| `RABBITMQ_MGMT_PORT` | No       | `15672`            | RabbitMQ management UI port |

**Notes:**

- Topic exchange `claw.events` with dead-letter queue and 3 retries with backoff.
- Change default credentials in production.

---

## Authentication / JWT

| Variable             | Required | Default | Description                                         |
| -------------------- | -------- | ------- | --------------------------------------------------- |
| `JWT_SECRET`         | Yes      | —       | Secret key for signing JWTs (minimum 32 characters) |
| `JWT_ACCESS_EXPIRY`  | No       | `15m`   | Access token lifetime (e.g., `15m`, `1h`)           |
| `JWT_REFRESH_EXPIRY` | No       | `7d`    | Refresh token lifetime (e.g., `7d`, `30d`)          |

**Notes:**

- Generate with: `openssl rand -base64 48`
- Every microservice validates JWTs independently using `@claw/shared-auth`.

---

## Encryption

| Variable         | Required | Default | Description                                            |
| ---------------- | -------- | ------- | ------------------------------------------------------ |
| `ENCRYPTION_KEY` | Yes      | —       | 32-byte hex string (64 hex characters) for AES-256-GCM |

**Notes:**

- Used by Connector service to encrypt provider API keys at rest.
- Generate with: `openssl rand -hex 32`
- Never commit this value to version control.

---

## Admin Seed

| Variable         | Required | Default                    | Description                           |
| ---------------- | -------- | -------------------------- | ------------------------------------- |
| `ADMIN_EMAIL`    | No       | `admin@claw.local`         | Email for the seeded admin account    |
| `ADMIN_USERNAME` | No       | `claw-admin`               | Username for the seeded admin account |
| `ADMIN_PASSWORD` | Yes      | `change-me-on-first-login` | Password for the seeded admin account |

---

## Frontend

| Variable                   | Required   | Default                 | Description                                                 |
| -------------------------- | ---------- | ----------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`      | Yes        | `http://localhost:4000` | API URL via Nginx (accessible from browser)                 |
| `NEXT_PUBLIC_APP_NAME`     | No         | `Claw`                  | Application display name                                    |
| `NEXT_PUBLIC_APP_URL`      | No         | `http://localhost:3000` | Frontend public URL                                         |
| `FRONTEND_PORT`            | No         | `3000`                  | Port the Next.js frontend listens on                        |
| `SITE_URL`                 | Production | —                       | Canonical HTTPS bare origin; enables crawling               |
| `CHAT_SERVICE_URL`         | Production | —                       | Server-only chat-service origin for public shares/discovery |
| `INTER_SERVICE_AUTH_TOKEN` | Production | —                       | Server-only credential for protected internal feeds         |

**Notes:**

- Variables prefixed with `NEXT_PUBLIC_` are embedded in the browser bundle. Never put secrets here.
- `SITE_URL` is deliberately fail-closed: preview, local, missing, or invalid
  values produce global noindex and `robots.txt` disallow-all.
- Never expose `CHAT_SERVICE_URL` or `INTER_SERVICE_AUTH_TOKEN` with a
  `NEXT_PUBLIC_` prefix.

---

## Ollama (Local AI Runtime)

| Variable                     | Required | Default                    | Description                                                                |
| ---------------------------- | -------- | -------------------------- | -------------------------------------------------------------------------- |
| `OLLAMA_BASE_URL`            | Yes      | `http://claw-ollama:11434` | Ollama HTTP API base URL                                                   |
| `OLLAMA_ROUTER_MODEL`        | No       | `qwen3:1.7b`               | Model used for routing decisions                                           |
| `OLLAMA_ROUTER_TIMEOUT_MS`   | No       | `10000`                    | Timeout for router model calls (ms)                                        |
| `ROUTER_COMPACT_PROMPT`      | No       | `true`                     | Toggles compact vs expanded AUTO router prompt layout                      |
| `OLLAMA_GENERATE_TIMEOUT_MS` | No       | `300000`                   | Timeout for non-router generation calls (ms)                               |
| `OLLAMA_KEEP_ALIVE`          | No       | `-1m`                      | How long the runtime keeps a model resident; `-1m` = forever until evicted |
| `OLLAMA_MAX_LOADED_MODELS`   | No       | `2`                        | Max number of models loaded into VRAM concurrently                         |
| `OLLAMA_NUM_PARALLEL`        | No       | `1`                        | Parallel generation slots per loaded model                                 |
| `OLLAMA_FLASH_ATTENTION`     | No       | `1`                        | Enable flash-attention kernel when supported by the GPU                    |
| `OLLAMA_KV_CACHE_TYPE`       | No       | `q8_0`                     | KV-cache quantization (`f16`, `q8_0`, `q4_0`)                              |
| `MEMORY_EXTRACTION_MODEL`    | No       | `AUTO`                     | Model used for memory extraction (`AUTO` picks best installed)             |
| `AUTO_PULL_MODELS`           | No       | `qwen3:1.7b`               | Space-separated list of models to auto-pull on startup                     |

### Runtime V2 provider-native tool calling (chat-service)

| Variable                           | Required | Default  | Description                                                                                                      |
| ---------------------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `CHAT_NATIVE_TOOL_CALLING_ENABLED` | No       | `true`   | Translate the admitted Runtime V2 tool catalog into the provider's native tool dialect and parse tool calls back |
| `CHAT_TOOL_CATALOG_MAX_BYTES`      | No       | `262144` | Byte budget for the serialized catalog, which is re-sent on every turn of a tool loop                            |

When `CHAT_NATIVE_TOOL_CALLING_ENABLED` is `false`, every provider resolves to
the `NONE` tool dialect and Runtime V2 falls back to the prompt-JSON
compatibility lane. That lane serializes the catalog into the system prompt as
text and cannot express a real tool call, so a model on it will truthfully
report that it has no filesystem, terminal or browser. Keep it on unless a
deployment has a specific reason to degrade.

**Notes:**

- Inside Docker, use the container service name as host (`claw-ollama`).
- When running Ollama on the host, use `http://host.docker.internal:11434`.
- Router models are auto-excluded from user-facing model selector dropdowns.

---

## File Storage

| Variable            | Required | Default         | Description                                   |
| ------------------- | -------- | --------------- | --------------------------------------------- |
| `FILE_STORAGE_PATH` | Yes      | `/data/uploads` | Absolute path where uploaded files are stored |
| `CLAMAV_HOST`       | No       | `clamav`        | ClamAV container host                         |
| `CLAMAV_PORT`       | No       | `3310`          | ClamAV TCP port                               |
| `CLAMAV_ENABLED`    | No       | `true`          | Enable/disable antivirus scanning             |

---

## Image Service

| Variable               | Required | Default                          | Description                    |
| ---------------------- | -------- | -------------------------------- | ------------------------------ |
| `IMAGE_SERVICE_URL`    | Yes      | `http://claw-image-service:4012` | Internal image service URL     |
| `IMAGE_PORT`           | No       | `4012`                           | Image service port             |
| `STABLE_DIFFUSION_URL` | No       | `http://claw-comfyui:8188`       | ComfyUI / Stable Diffusion URL |
| `COMFYUI_BASE_URL`     | No       | `http://claw-comfyui:8188`       | ComfyUI API base URL           |
| `COMFYUI_PORT`         | No       | `8188`                           | ComfyUI container port         |

---

## Payment and Billing

Prices are database-owned immutable `PlanPriceVersion` records, not environment
variables. The payment service validates the variables below at startup. Leave a
gateway's full credential set blank to disable it; partial configuration is
rejected.

| Variable                                                         | Required           | Default                | Purpose                                                        |
| ---------------------------------------------------------------- | ------------------ | ---------------------- | -------------------------------------------------------------- |
| `PAYMENT_DATABASE_URL`                                           | Yes                | —                      | Payment-service PostgreSQL connection                          |
| `PAYMENT_SERVICE_PORT`                                           | No                 | `4018`                 | Payment-service listen port                                    |
| `AUTH_SERVICE_URL`, `ROUTING_SERVICE_URL`                        | Yes                | service-local URLs     | Signed internal plan, entitlement, and provider-cost contracts |
| `INTER_SERVICE_AUTH_TOKEN`                                       | Yes                | —                      | Minimum 32-character internal request signing secret           |
| `FRONTEND_URL`                                                   | Yes                | `https://claw.local`   | Server-owned checkout return origin                            |
| `PAYMENT_TOKEN_ENCRYPTION_KEY`                                   | Yes                | —                      | 64-character hex key for vaulted gateway tokens                |
| `PAYMENT_TOKEN_KEY_VERSION`                                      | No                 | `1`                    | Ciphertext key version used during rotation                    |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`  | To enable PayPal   | —                      | Complete PayPal server credential set                          |
| `PAYPAL_ENV`                                                     | No                 | `sandbox`              | `sandbox` or `live`; configured production requires `live`     |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID`                                   | To render PayPal   | —                      | Public browser client identifier                               |
| `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET`   | To enable Paymob   | —                      | Complete Paymob secret/public/HMAC set                         |
| `PAYMOB_CARD_INTEGRATION_ID`                                     | To enable Paymob   | —                      | Paymob hosted-card integration                                 |
| `PAYMOB_API_KEY`                                                 | No                 | —                      | Legacy Paymob auth-token API key                               |
| `PAYMOB_CURRENCY`, `NEXT_PUBLIC_PAYMOB_PUBLIC_KEY`               | No / render Paymob | `EGP` / —              | Settlement currency and safe browser key                       |
| `EXCHANGE_RATE_API_BASE_URL`, `EXCHANGE_RATE_CACHE_TTL_MS`       | No                 | provider / `3600000`   | FX source and cache lifetime                                   |
| `USD_TO_EGP_FALLBACK_RATE`                                       | No                 | `0`                    | Non-zero emergency fallback; zero fails closed                 |
| `FX_QUOTE_TTL_MS`, `FX_SAFETY_MARGIN_BPS`                        | No                 | `900000` / `150`       | Bound quote lifetime and adverse-movement margin               |
| `WEBHOOK_REPLAY_TOLERANCE_MS`, `BILLING_GRACE_PERIOD_MS`         | No                 | `600000` / `259200000` | Replay window and past-due entitlement grace                   |
| `BILLING_RECONCILIATION_CRON`                                    | No                 | `0 */15 * * * *`       | Reconciliation schedule                                        |
| `PAYMENT_OUTBOX_POLL_INTERVAL_MS`, `PAYMENT_OUTBOX_MAX_ATTEMPTS` | No                 | `5000` / `10`          | Outbox drain cadence and dead-letter threshold                 |
| `PAYMENT_GATEWAY_TIMEOUT_MS`, `PAYMENT_GATEWAY_MAX_RETRIES`      | No                 | `20000` / `2`          | Bounded provider calls and safe/idempotent retries             |

Invoice delivery uses the shared SMTP variables above. In distributed nginx,
set `CLAW_PAYMENT_ORIGIN` to the payment deployment origin; expose only
`/payments/webhooks`, `/payments`, `/billing`, and `/admin/billing`, never
`/internal/*`.

---

## Inter-Service URLs

All services communicate via internal Docker service names.

| Variable                      | Required | Default                                    |
| ----------------------------- | -------- | ------------------------------------------ |
| `AUTH_SERVICE_URL`            | Yes      | `http://claw-auth-service:4001`            |
| `CHAT_SERVICE_URL`            | Yes      | `http://claw-chat-service:4002`            |
| `CONNECTOR_SERVICE_URL`       | Yes      | `http://claw-connector-service:4003`       |
| `ROUTING_SERVICE_URL`         | Yes      | `http://claw-routing-service:4004`         |
| `MEMORY_SERVICE_URL`          | Yes      | `http://claw-memory-service:4005`          |
| `FILE_SERVICE_URL`            | Yes      | `http://claw-file-service:4006`            |
| `AUDIT_SERVICE_URL`           | Yes      | `http://claw-audit-service:4007`           |
| `OLLAMA_SERVICE_URL`          | Yes      | `http://claw-ollama-service:4008`          |
| `HEALTH_SERVICE_URL`          | Yes      | `http://claw-health-service:4009`          |
| `IMAGE_SERVICE_URL`           | Yes      | `http://claw-image-service:4012`           |
| `FILE_GENERATION_SERVICE_URL` | Yes      | `http://claw-file-generation-service:4013` |
| `AGENT_SERVICE_URL`           | Yes      | `http://claw-agent-service:4015`           |
| `RESEARCH_SERVICE_URL`        | Yes      | `http://claw-research-service:4016`        |
| `WORKSPACE_SERVICE_URL`       | Yes      | `http://claw-workspace-service:4014`       |
| `PAYMENT_SERVICE_URL`         | Yes      | `http://claw-payment-service:4018`         |

---

## Per-Service Port Variables

| Variable               | Default | Service         |
| ---------------------- | ------- | --------------- |
| `AUTH_PORT`            | `4001`  | Auth            |
| `CHAT_PORT`            | `4002`  | Chat            |
| `CONNECTOR_PORT`       | `4003`  | Connector       |
| `ROUTING_PORT`         | `4004`  | Routing         |
| `MEMORY_PORT`          | `4005`  | Memory          |
| `FILE_PORT`            | `4006`  | File            |
| `AUDIT_PORT`           | `4007`  | Audit           |
| `OLLAMA_SERVICE_PORT`  | `4008`  | Ollama Service  |
| `HEALTH_PORT`          | `4009`  | Health          |
| `CLIENT_LOGS_PORT`     | `4010`  | Client Logs     |
| `SERVER_LOGS_PORT`     | `4011`  | Server Logs     |
| `IMAGE_PORT`           | `4012`  | Image           |
| `FILE_GENERATION_PORT` | `4013`  | File Generation |
| `AGENT_PORT`           | `4015`  | Agent           |
| `RESEARCH_PORT`        | `4016`  | Research        |
| `WORKSPACE_PORT`       | `4014`  | Workspace       |
| `PAYMENT_SERVICE_PORT` | `4018`  | Payment         |

---

## Per-Service Database URLs

Prisma reads from `DATABASE_URL` per service. Each service's `.env` or the root `.env` sets a namespaced variable:

| Variable                        | Service         |
| ------------------------------- | --------------- |
| `AUTH_DATABASE_URL`             | Auth            |
| `CHAT_DATABASE_URL`             | Chat            |
| `CONNECTOR_DATABASE_URL`        | Connector       |
| `ROUTING_DATABASE_URL`          | Routing         |
| `MEMORY_DATABASE_URL`           | Memory          |
| `FILES_DATABASE_URL`            | File            |
| `OLLAMA_DATABASE_URL`           | Ollama Service  |
| `IMAGES_DATABASE_URL`           | Image           |
| `FILE_GENERATIONS_DATABASE_URL` | File Generation |
| `AGENT_DATABASE_URL`            | Agent           |
| `RESEARCH_DATABASE_URL`         | Research        |
| `WORKSPACE_DATABASE_URL`        | Workspace       |
| `PAYMENT_DATABASE_URL`          | Payment         |
| `AUDIT_MONGODB_URI`             | Audit           |
| `CLIENT_LOGS_MONGODB_URI`       | Client Logs     |
| `SERVER_LOGS_MONGODB_URI`       | Server Logs     |

---

## Workspace OAuth Credentials

| Variable               | Required | Description                           |
| ---------------------- | -------- | ------------------------------------- |
| `GITHUB_CLIENT_ID`     | No       | GitHub OAuth app client ID            |
| `GITHUB_CLIENT_SECRET` | No       | GitHub OAuth app client secret        |
| `GITLAB_CLIENT_ID`     | No       | GitLab OAuth app client ID            |
| `GITLAB_CLIENT_SECRET` | No       | GitLab OAuth app client secret        |
| `SLACK_CLIENT_ID`      | No       | Slack app client ID                   |
| `SLACK_CLIENT_SECRET`  | No       | Slack app client secret               |
| `JIRA_CLIENT_ID`       | No       | Jira (Atlassian) OAuth client ID      |
| `JIRA_CLIENT_SECRET`   | No       | Jira OAuth client secret              |
| `GOOGLE_CLIENT_ID`     | No       | Google OAuth client ID (Drive, Gmail) |
| `GOOGLE_CLIENT_SECRET` | No       | Google OAuth client secret            |
| `FIGMA_CLIENT_ID`      | No       | Figma OAuth client ID                 |
| `FIGMA_CLIENT_SECRET`  | No       | Figma OAuth client secret             |

---

## Research Service

| Variable           | Required | Default | Description                    |
| ------------------ | -------- | ------- | ------------------------------ |
| `TAVILY_API_KEY`   | No       | —       | Tavily search provider API key |
| `SEARXNG_BASE_URL` | No       | —       | SearXNG instance base URL      |

---

## Dynamic Model Discovery (Ollama service)

| Variable                            | Required | Default | Description                                                   |
| ----------------------------------- | -------- | ------- | ------------------------------------------------------------- |
| `DISCOVERY_AUTO_REFRESH_ENABLED`    | No       | `true`  | Enable background refresh of the Ollama model catalog         |
| `DISCOVERY_MAX_RESULTS_PER_SOURCE`  | No       | `50`    | Max catalog entries pulled per discovery source per refresh   |
| `DISCOVERY_AUTO_APPROVE_CONFIDENCE` | No       | `0.85`  | Min classifier confidence for auto-approving new catalog rows |

---

## Desktop Agent Auth (Phase A — magic-link pairing + device-code + refresh rotation)

| Variable                        | Required | Default | Description                                                               |
| ------------------------------- | -------- | ------- | ------------------------------------------------------------------------- |
| `AGENT_ACCESS_TTL_SECONDS`      | No       | `900`   | Access token lifetime for a paired desktop agent session                  |
| `AGENT_REFRESH_TTL_DAYS`        | No       | `30`    | Refresh token lifetime for a paired desktop agent session                 |
| `AGENT_PAIRING_TTL_SECONDS`     | No       | `120`   | Window for a user to complete magic-link pairing                          |
| `AGENT_DEVICE_CODE_TTL_SECONDS` | No       | `900`   | Device-code authorization request lifetime                                |
| `AGENT_REFRESH_GRACE_SECONDS`   | No       | `15`    | Grace window allowing the old refresh token after rotation (replay guard) |

---

## Provider API Keys

Optional — can also be configured through the UI connector management interface.

| Variable                | Required | Default     | Description                |
| ----------------------- | -------- | ----------- | -------------------------- |
| `OPENAI_API_KEY`        | No       | —           | OpenAI API key             |
| `ANTHROPIC_API_KEY`     | No       | —           | Anthropic API key          |
| `GOOGLE_GEMINI_API_KEY` | No       | —           | Google Gemini API key      |
| `AWS_ACCESS_KEY_ID`     | No       | —           | AWS access key for Bedrock |
| `AWS_SECRET_ACCESS_KEY` | No       | —           | AWS secret key for Bedrock |
| `AWS_REGION`            | No       | `us-east-1` | AWS region for Bedrock     |
| `DEEPSEEK_API_KEY`      | No       | —           | DeepSeek API key           |
| `GROK_API_KEY`          | No       | —           | xAI Grok API key           |

**Notes:**

- Keys configured through the UI (connectors) take precedence over environment variables.
- All keys are encrypted at rest with AES-256-GCM when stored via the Connector service.

---

## Testing

| Variable             | Required | Default | Description                                     |
| -------------------- | -------- | ------- | ----------------------------------------------- |
| `USE_MOCK_PROVIDERS` | No       | `false` | Use mock provider adapters instead of real APIs |

---

## Generating Secure Values

```bash
# JWT_SECRET (64 random characters, base64)
openssl rand -base64 48

# ENCRYPTION_KEY (32 bytes as 64 hex characters)
openssl rand -hex 32

# ADMIN_PASSWORD (strong random password)
openssl rand -base64 24
```
