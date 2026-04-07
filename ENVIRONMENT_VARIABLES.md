# Environment Variables

Complete reference for all environment variables used by Claw.

All variables are defined in `.env.example` at the project root. Each microservice reads from the root `.env` or its own `.env` file.

---

## PostgreSQL Instances

Claw uses 6 separate PostgreSQL instances, one per data-owning service.

| Variable                 | Required | Default           | Description                  |
| ------------------------ | -------- | ----------------- | ---------------------------- |
| `PG_AUTH_HOST`           | Yes      | `localhost`       | Auth database host           |
| `PG_AUTH_PORT`           | Yes      | `5441`            | Auth database host port      |
| `PG_AUTH_USER`           | Yes      | `claw`            | Auth database username       |
| `PG_AUTH_PASSWORD`       | Yes      | `claw_secret`     | Auth database password       |
| `PG_AUTH_DB`             | Yes      | `claw_auth`       | Auth database name           |
| `PG_CHAT_HOST`           | Yes      | `localhost`       | Chat database host           |
| `PG_CHAT_PORT`           | Yes      | `5442`            | Chat database host port      |
| `PG_CHAT_USER`           | Yes      | `claw`            | Chat database username       |
| `PG_CHAT_PASSWORD`       | Yes      | `claw_secret`     | Chat database password       |
| `PG_CHAT_DB`             | Yes      | `claw_chat`       | Chat database name           |
| `PG_CONNECTORS_HOST`     | Yes      | `localhost`       | Connector database host      |
| `PG_CONNECTORS_PORT`     | Yes      | `5443`            | Connector database host port |
| `PG_CONNECTORS_USER`     | Yes      | `claw`            | Connector database username  |
| `PG_CONNECTORS_PASSWORD` | Yes      | `claw_secret`     | Connector database password  |
| `PG_CONNECTORS_DB`       | Yes      | `claw_connectors` | Connector database name      |
| `PG_ROUTING_HOST`        | Yes      | `localhost`       | Routing database host        |
| `PG_ROUTING_PORT`        | Yes      | `5444`            | Routing database host port   |
| `PG_ROUTING_USER`        | Yes      | `claw`            | Routing database username    |
| `PG_ROUTING_PASSWORD`    | Yes      | `claw_secret`     | Routing database password    |
| `PG_ROUTING_DB`          | Yes      | `claw_routing`    | Routing database name        |
| `PG_MEMORY_HOST`         | Yes      | `localhost`       | Memory database host         |
| `PG_MEMORY_PORT`         | Yes      | `5445`            | Memory database host port    |
| `PG_MEMORY_USER`         | Yes      | `claw`            | Memory database username     |
| `PG_MEMORY_PASSWORD`     | Yes      | `claw_secret`     | Memory database password     |
| `PG_MEMORY_DB`           | Yes      | `claw_memory`     | Memory database name         |
| `PG_FILES_HOST`          | Yes      | `localhost`       | File database host           |
| `PG_FILES_PORT`          | Yes      | `5446`            | File database host port      |
| `PG_FILES_USER`          | Yes      | `claw`            | File database username       |
| `PG_FILES_PASSWORD`      | Yes      | `claw_secret`     | File database password       |
| `PG_FILES_DB`            | Yes      | `claw_files`      | File database name           |

**Notes:**

- Inside Docker Compose, services use Docker service names as hosts (e.g., `claw-pg-auth`) and internal port `5432`.
- When running services locally, use `localhost` with the host port (e.g., `5441` for auth).
- Each PostgreSQL instance is a separate Docker container for fault isolation.

---

## MongoDB

| Variable         | Required | Default      | Description                        |
| ---------------- | -------- | ------------ | ---------------------------------- |
| `MONGO_HOST`     | Yes      | `localhost`  | MongoDB host                       |
| `MONGO_PORT`     | Yes      | `27018`      | MongoDB host port                  |
| `MONGO_DB`       | Yes      | `claw_audit` | MongoDB database name              |
| `MONGO_USER`     | No       | --           | MongoDB username (if auth enabled) |
| `MONGO_PASSWORD` | No       | --           | MongoDB password (if auth enabled) |

**Notes:**

- Used exclusively by the Audit service for audit logs and the usage ledger.
- Internal Docker port is `27017`; host port is `27018`.

---

## Redis

| Variable     | Required | Default                  | Description          |
| ------------ | -------- | ------------------------ | -------------------- |
| `REDIS_HOST` | Yes      | `localhost`              | Redis host           |
| `REDIS_PORT` | Yes      | `6380`                   | Redis host port      |
| `REDIS_URL`  | No       | `redis://localhost:6380` | Redis connection URL |

**Notes:**

- Used by the Ollama service for state management and by other services for caching.
- Internal Docker port is `6379`; host port is `6380`.

---

## RabbitMQ

| Variable             | Required | Default     | Description                 |
| -------------------- | -------- | ----------- | --------------------------- |
| `RABBITMQ_HOST`      | Yes      | `localhost` | RabbitMQ host               |
| `RABBITMQ_PORT`      | Yes      | `5672`      | RabbitMQ AMQP port          |
| `RABBITMQ_USER`      | Yes      | `guest`     | RabbitMQ username           |
| `RABBITMQ_PASSWORD`  | Yes      | `guest`     | RabbitMQ password           |
| `RABBITMQ_MGMT_PORT` | No       | `15672`     | RabbitMQ management UI port |

**Notes:**

- All microservices connect to RabbitMQ for async event-driven communication.
- The topic exchange `claw.events` is used for inter-service messaging.
- Change default credentials (`guest`/`guest`) in production.
- Management UI is accessible at `http://localhost:15672`.

---

## Authentication / JWT

| Variable             | Required | Default | Description                                         |
| -------------------- | -------- | ------- | --------------------------------------------------- |
| `JWT_SECRET`         | Yes      | --      | Secret key for signing JWTs (minimum 32 characters) |
| `JWT_ACCESS_EXPIRY`  | No       | `15m`   | Access token lifetime (e.g., `15m`, `1h`)           |
| `JWT_REFRESH_EXPIRY` | No       | `7d`    | Refresh token lifetime (e.g., `7d`, `30d`)          |

**Notes:**

- `JWT_SECRET` must be a cryptographically random string. Generate with: `openssl rand -base64 48`.
- The `@claw/shared-auth` package provides the JWT guard used by all services.
- Every microservice validates JWTs independently using this shared secret.

---

## Encryption

| Variable         | Required | Default | Description                                            |
| ---------------- | -------- | ------- | ------------------------------------------------------ |
| `ENCRYPTION_KEY` | Yes      | --      | 32-byte hex string (64 hex characters) for AES-256-GCM |

**Notes:**

- Used by the Connector service to encrypt provider API keys at rest.
- Generate with: `openssl rand -hex 32`.
- Never commit this value to version control.

---

## Admin Seed

| Variable         | Required | Default                    | Description                           |
| ---------------- | -------- | -------------------------- | ------------------------------------- |
| `ADMIN_EMAIL`    | No       | `admin@claw.local`         | Email for the seeded admin account    |
| `ADMIN_USERNAME` | No       | `claw-admin`               | Username for the seeded admin account |
| `ADMIN_PASSWORD` | Yes      | `change-me-on-first-login` | Password for the seeded admin account |

**Notes:**

- Used by the Auth service to create the initial admin user on first startup.
- Change the password immediately after first login in production.

---

## Frontend

| Variable               | Required | Default                 | Description                                 |
| ---------------------- | -------- | ----------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | Yes      | `http://localhost:4000` | API URL via Nginx (accessible from browser) |
| `NEXT_PUBLIC_APP_NAME` | No       | `Claw`                  | Application display name                    |
| `NEXT_PUBLIC_APP_URL`  | No       | `http://localhost:3000` | Frontend public URL                         |
| `FRONTEND_PORT`        | No       | `3000`                  | Port the Next.js frontend listens on        |

**Notes:**

- Variables prefixed with `NEXT_PUBLIC_` are embedded in the frontend bundle and visible to browsers.
- Never put secrets in `NEXT_PUBLIC_` variables.
- `NEXT_PUBLIC_API_URL` should point to the Nginx reverse proxy (`http://localhost:4000`), which routes requests to the appropriate microservice.

---

## Ollama (Local AI Runtime)

| Variable          | Required | Default                  | Description              |
| ----------------- | -------- | ------------------------ | ------------------------ |
| `OLLAMA_BASE_URL` | No       | `http://localhost:11434` | Ollama HTTP API base URL |

**Notes:**

- Used by the Ollama service (:4008) to communicate with the Ollama runtime.
- Inside Docker, this points to the Ollama container service name (e.g., `http://claw-ollama:11434`).
- If running Ollama on the host, use `http://host.docker.internal:11434` from Docker services.

---

## Per-Service Environment Variables

Each service may define service-specific variables in addition to the shared ones above. Common per-service variables:

| Variable    | Required | Default       | Description                                      |
| ----------- | -------- | ------------- | ------------------------------------------------ |
| `PORT`      | No       | (see table)   | Port the service listens on                      |
| `NODE_ENV`  | No       | `development` | Environment mode (`development` or `production`) |
| `LOG_LEVEL` | No       | `info`        | Logging level (`debug`, `info`, `warn`, `error`) |

### Service Ports (defaults)

| Service   | Default Port |
| --------- | ------------ |
| Auth      | 4001         |
| Chat      | 4002         |
| Connector | 4003         |
| Routing   | 4004         |
| Memory    | 4005         |
| File      | 4006         |
| Audit     | 4007         |
| Ollama    | 4008         |
| Health    | 4009         |

---

## Provider API Keys (Optional)

These are optional and can also be configured through the UI connector management interface.

| Variable                | Required | Default     | Description                |
| ----------------------- | -------- | ----------- | -------------------------- |
| `OPENAI_API_KEY`        | No       | --          | OpenAI API key             |
| `ANTHROPIC_API_KEY`     | No       | --          | Anthropic API key          |
| `GOOGLE_GEMINI_API_KEY` | No       | --          | Google Gemini API key      |
| `AWS_ACCESS_KEY_ID`     | No       | --          | AWS access key for Bedrock |
| `AWS_SECRET_ACCESS_KEY` | No       | --          | AWS secret key for Bedrock |
| `AWS_REGION`            | No       | `us-east-1` | AWS region for Bedrock     |
| `DEEPSEEK_API_KEY`      | No       | --          | DeepSeek API key           |

**Notes:**

- Environment-based keys are used as fallback when no connector is configured in the UI.
- Keys configured through the UI (connectors) take precedence over environment variables.
- All keys are encrypted at rest when stored via the Connector service.

---

## Testing

| Variable             | Required | Default | Description                                     |
| -------------------- | -------- | ------- | ----------------------------------------------- |
| `USE_MOCK_PROVIDERS` | No       | `false` | Use mock provider adapters instead of real APIs |

**Notes:**

- Set to `true` for development without API keys, CI pipelines, and testing.
- Mock adapters return deterministic responses and simulate provider behavior.

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
