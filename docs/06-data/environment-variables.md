# Environment Variables Reference

> Complete reference for all ClawAI environment variables. Single `.env` file at the project root.

---

## Overview

ClawAI uses a single `.env` file at the repository root as the source of truth for all configuration. This file is consumed by:

- Docker Compose files (`${VAR}` interpolation)
- All backend microservices (`env_file: .env` in Compose)
- Frontend Next.js (`env_file: .env` in Compose)

Copy `.env.example` to `.env` before first run. The install scripts (`scripts/install.sh`, `scripts/install.ps1`) generate this automatically.

---

## 1. General

| Variable       | Default                                                      | Required | Description                                               | Used By              |
| -------------- | ------------------------------------------------------------ | -------- | --------------------------------------------------------- | -------------------- |
| `NODE_ENV`     | `development`                                                | Yes      | Runtime environment (`development`, `production`, `test`) | All services         |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:80,http://localhost` | Yes      | Comma-separated allowed CORS origins                      | All backend services |

---

## 2. Rate Limiting

| Variable         | Default | Required | Description                       | Used By              |
| ---------------- | ------- | -------- | --------------------------------- | -------------------- |
| `THROTTLE_TTL`   | `60000` | Yes      | Rate limit window in milliseconds | All backend services |
| `THROTTLE_LIMIT` | `100`   | Yes      | Maximum requests per window       | All backend services |

---

## 3. PostgreSQL Credentials

Each PostgreSQL service has its own database container with dedicated credentials.

### Auth Database

| Variable           | Default       | Required | Secret  | Description       |
| ------------------ | ------------- | -------- | ------- | ----------------- |
| `PG_AUTH_USER`     | `claw`        | Yes      | No      | Database username |
| `PG_AUTH_PASSWORD` | `claw_secret` | Yes      | **Yes** | Database password |
| `PG_AUTH_DB`       | `claw_auth`   | Yes      | No      | Database name     |
| `PG_AUTH_PORT`     | `5441`        | Yes      | No      | Host-mapped port  |

### Chat Database

| Variable           | Default       | Required | Secret  | Description       |
| ------------------ | ------------- | -------- | ------- | ----------------- |
| `PG_CHAT_USER`     | `claw`        | Yes      | No      | Database username |
| `PG_CHAT_PASSWORD` | `claw_secret` | Yes      | **Yes** | Database password |
| `PG_CHAT_DB`       | `claw_chat`   | Yes      | No      | Database name     |
| `PG_CHAT_PORT`     | `5442`        | Yes      | No      | Host-mapped port  |

### Connector Database

| Variable                | Default           | Required | Secret  | Description       |
| ----------------------- | ----------------- | -------- | ------- | ----------------- |
| `PG_CONNECTOR_USER`     | `claw`            | Yes      | No      | Database username |
| `PG_CONNECTOR_PASSWORD` | `claw_secret`     | Yes      | **Yes** | Database password |
| `PG_CONNECTOR_DB`       | `claw_connectors` | Yes      | No      | Database name     |
| `PG_CONNECTOR_PORT`     | `5443`            | Yes      | No      | Host-mapped port  |

### Routing Database

| Variable              | Default        | Required | Secret  | Description       |
| --------------------- | -------------- | -------- | ------- | ----------------- |
| `PG_ROUTING_USER`     | `claw`         | Yes      | No      | Database username |
| `PG_ROUTING_PASSWORD` | `claw_secret`  | Yes      | **Yes** | Database password |
| `PG_ROUTING_DB`       | `claw_routing` | Yes      | No      | Database name     |
| `PG_ROUTING_PORT`     | `5444`         | Yes      | No      | Host-mapped port  |

### Memory Database

| Variable             | Default       | Required | Secret  | Description       |
| -------------------- | ------------- | -------- | ------- | ----------------- |
| `PG_MEMORY_USER`     | `claw`        | Yes      | No      | Database username |
| `PG_MEMORY_PASSWORD` | `claw_secret` | Yes      | **Yes** | Database password |
| `PG_MEMORY_DB`       | `claw_memory` | Yes      | No      | Database name     |
| `PG_MEMORY_PORT`     | `5445`        | Yes      | No      | Host-mapped port  |

### Files Database

| Variable            | Default       | Required | Secret  | Description       |
| ------------------- | ------------- | -------- | ------- | ----------------- |
| `PG_FILES_USER`     | `claw`        | Yes      | No      | Database username |
| `PG_FILES_PASSWORD` | `claw_secret` | Yes      | **Yes** | Database password |
| `PG_FILES_DB`       | `claw_files`  | Yes      | No      | Database name     |
| `PG_FILES_PORT`     | `5446`        | Yes      | No      | Host-mapped port  |

### Ollama Database

| Variable             | Default       | Required | Secret  | Description       |
| -------------------- | ------------- | -------- | ------- | ----------------- |
| `PG_OLLAMA_USER`     | `claw`        | Yes      | No      | Database username |
| `PG_OLLAMA_PASSWORD` | `claw_secret` | Yes      | **Yes** | Database password |
| `PG_OLLAMA_DB`       | `claw_ollama` | Yes      | No      | Database name     |
| `PG_OLLAMA_PORT`     | `5447`        | Yes      | No      | Host-mapped port  |

### Images Database

| Variable             | Default       | Required | Secret  | Description       |
| -------------------- | ------------- | -------- | ------- | ----------------- |
| `PG_IMAGES_USER`     | `claw`        | Yes      | No      | Database username |
| `PG_IMAGES_PASSWORD` | `claw_secret` | Yes      | **Yes** | Database password |
| `PG_IMAGES_DB`       | `claw_images` | Yes      | No      | Database name     |
| `PG_IMAGES_PORT`     | `5448`        | Yes      | No      | Host-mapped port  |

---

## 4. MongoDB

A single MongoDB instance hosts three logical databases.

| Variable         | Default       | Required | Secret  | Description                             |
| ---------------- | ------------- | -------- | ------- | --------------------------------------- |
| `MONGO_USER`     | `claw`        | Yes      | No      | MongoDB admin username                  |
| `MONGO_PASSWORD` | `claw_secret` | Yes      | **Yes** | MongoDB admin password                  |
| `MONGO_DB`       | `claw_audit`  | Yes      | No      | Default database name                   |
| `MONGO_PORT`     | `27018`       | Yes      | No      | Host-mapped port (container uses 27017) |

---

## 5. Redis

| Variable     | Default              | Required | Secret | Description                            |
| ------------ | -------------------- | -------- | ------ | -------------------------------------- |
| `REDIS_URL`  | `redis://redis:6379` | Yes      | No     | Redis connection URL (Docker internal) |
| `REDIS_PORT` | `6380`               | Yes      | No     | Host-mapped port                       |

---

## 6. RabbitMQ

| Variable                   | Default                                 | Required | Secret  | Description                                |
| -------------------------- | --------------------------------------- | -------- | ------- | ------------------------------------------ |
| `RABBITMQ_USER`            | `claw`                                  | Yes      | No      | RabbitMQ username                          |
| `RABBITMQ_PASSWORD`        | `claw_secret`                           | Yes      | **Yes** | RabbitMQ password                          |
| `RABBITMQ_URL`             | `amqp://claw:claw_secret@rabbitmq:5672` | Yes      | **Yes** | AMQP connection URL (includes credentials) |
| `RABBITMQ_PORT`            | `5672`                                  | Yes      | No      | Host-mapped AMQP port                      |
| `RABBITMQ_MANAGEMENT_PORT` | `15672`                                 | Yes      | No      | Host-mapped management UI port             |

---

## 7. JWT

| Variable             | Default                   | Required | Secret  | Description                                                          |
| -------------------- | ------------------------- | -------- | ------- | -------------------------------------------------------------------- |
| `JWT_SECRET`         | `claw-dev-jwt-secret-...` | Yes      | **Yes** | HMAC signing secret. Use a random 32+ character string in production |
| `JWT_ACCESS_EXPIRY`  | `15m`                     | Yes      | No      | Access token lifetime (e.g., `15m`, `1h`)                            |
| `JWT_REFRESH_EXPIRY` | `7d`                      | Yes      | No      | Refresh token lifetime (e.g., `7d`, `30d`)                           |

**Security note:** The default `JWT_SECRET` is for development only. Generate a cryptographically random secret for production.

---

## 8. Encryption

| Variable         | Default                      | Required | Secret  | Description                                                                                                           |
| ---------------- | ---------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `ENCRYPTION_KEY` | `a1b2c3d4...` (64 hex chars) | Yes      | **Yes** | AES-256-GCM key for encrypting connector API keys. 64 hex characters = 32 bytes. Generate with `openssl rand -hex 32` |

**Security note:** If this key is lost or rotated, all encrypted connector configurations become unreadable. Back up securely.

---

## 9. Admin Seed

Used by the auth service to create the initial admin user on first startup.

| Variable         | Default            | Required | Secret  | Description                                      |
| ---------------- | ------------------ | -------- | ------- | ------------------------------------------------ |
| `ADMIN_EMAIL`    | `admin@claw.local` | Yes      | No      | Admin user email                                 |
| `ADMIN_USERNAME` | `claw-admin`       | Yes      | No      | Admin username                                   |
| `ADMIN_PASSWORD` | `ClawAdmin123!`    | Yes      | **Yes** | Admin initial password. Change after first login |

---

## 10. Frontend (Next.js)

| Variable               | Default                 | Required | Secret | Description                                                                              |
| ---------------------- | ----------------------- | -------- | ------ | ---------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:4000` | Yes      | No     | Backend API base URL (Nginx proxy). `NEXT_PUBLIC_` prefix makes it available client-side |
| `NEXT_PUBLIC_APP_NAME` | `Claw`                  | Yes      | No     | Application display name                                                                 |
| `NEXT_PUBLIC_APP_URL`  | `http://localhost:3000` | Yes      | No     | Frontend URL                                                                             |
| `FRONTEND_PORT`        | `3000`                  | Yes      | No     | Host-mapped frontend port                                                                |

**Security note:** Only `NEXT_PUBLIC_*` variables are exposed to the browser. Never put secrets in `NEXT_PUBLIC_*` variables.

---

## 11. Ollama (Local AI Runtime)

| Variable                   | Default               | Required | Secret | Description                                                                     |
| -------------------------- | --------------------- | -------- | ------ | ------------------------------------------------------------------------------- |
| `OLLAMA_BASE_URL`          | `http://ollama:11434` | Yes      | No     | Ollama API endpoint (Docker internal)                                           |
| `OLLAMA_ROUTER_MODEL`      | `gemma3:4b`           | Yes      | No     | Model used for AUTO routing decisions                                           |
| `OLLAMA_ROUTER_TIMEOUT_MS` | `10000`               | Yes      | No     | Timeout for router model calls (ms). Falls back to heuristic routing on timeout |
| `MEMORY_EXTRACTION_MODEL`  | `gemma3:4b`           | Yes      | No     | Model used for extracting memories from conversations                           |

---

## 12. File Storage

| Variable            | Default       | Required | Secret | Description                                            |
| ------------------- | ------------- | -------- | ------ | ------------------------------------------------------ |
| `FILE_STORAGE_PATH` | `/data/files` | Yes      | No     | Directory for uploaded file storage (inside container) |

---

## 13. Image Generation

| Variable               | Default                        | Required | Secret | Description                         |
| ---------------------- | ------------------------------ | -------- | ------ | ----------------------------------- |
| `STABLE_DIFFUSION_URL` | `http://stable-diffusion:7860` | No       | No     | Stable Diffusion WebUI API endpoint |

---

## 14. Inter-Service URLs

Docker-internal hostnames for service-to-service HTTP communication.

| Variable                  | Default                           | Required | Description                      |
| ------------------------- | --------------------------------- | -------- | -------------------------------- |
| `OLLAMA_SERVICE_URL`      | `http://ollama-service:4008`      | Yes      | Ollama service internal URL      |
| `CONNECTOR_SERVICE_URL`   | `http://connector-service:4003`   | Yes      | Connector service internal URL   |
| `AUTH_SERVICE_URL`        | `http://auth-service:4001`        | Yes      | Auth service internal URL        |
| `CHAT_SERVICE_URL`        | `http://chat-service:4002`        | Yes      | Chat service internal URL        |
| `ROUTING_SERVICE_URL`     | `http://routing-service:4004`     | Yes      | Routing service internal URL     |
| `MEMORY_SERVICE_URL`      | `http://memory-service:4005`      | Yes      | Memory service internal URL      |
| `FILE_SERVICE_URL`        | `http://file-service:4006`        | Yes      | File service internal URL        |
| `AUDIT_SERVICE_URL`       | `http://audit-service:4007`       | Yes      | Audit service internal URL       |
| `CLIENT_LOGS_SERVICE_URL` | `http://client-logs-service:4010` | Yes      | Client logs service internal URL |
| `SERVER_LOGS_SERVICE_URL` | `http://server-logs-service:4011` | Yes      | Server logs service internal URL |
| `IMAGE_SERVICE_URL`       | `http://image-service:4012`       | Yes      | Image service internal URL       |

---

## 15. Per-Service Ports

Host-mapped ports for each backend service. Docker containers bind to these ports.

| Variable           | Default | Required | Service                  |
| ------------------ | ------- | -------- | ------------------------ |
| `AUTH_PORT`        | `4001`  | Yes      | claw-auth-service        |
| `CHAT_PORT`        | `4002`  | Yes      | claw-chat-service        |
| `CONNECTOR_PORT`   | `4003`  | Yes      | claw-connector-service   |
| `ROUTING_PORT`     | `4004`  | Yes      | claw-routing-service     |
| `MEMORY_PORT`      | `4005`  | Yes      | claw-memory-service      |
| `FILES_PORT`       | `4006`  | Yes      | claw-file-service        |
| `AUDIT_PORT`       | `4007`  | Yes      | claw-audit-service       |
| `OLLAMA_PORT`      | `4008`  | Yes      | claw-ollama-service      |
| `HEALTH_PORT`      | `4009`  | Yes      | claw-health-service      |
| `CLIENT_LOGS_PORT` | `4010`  | Yes      | claw-client-logs-service |
| `SERVER_LOGS_PORT` | `4011`  | Yes      | claw-server-logs-service |
| `IMAGE_PORT`       | `4012`  | Yes      | claw-image-service       |

---

## 16. Per-Service Database URLs

Full connection strings used by each service to connect to its database.

### PostgreSQL Connection Strings

| Variable                 | Default                                                                         | Service                |
| ------------------------ | ------------------------------------------------------------------------------- | ---------------------- |
| `AUTH_DATABASE_URL`      | `postgresql://claw:claw_secret@pg-auth:5432/claw_auth?schema=public`            | claw-auth-service      |
| `CHAT_DATABASE_URL`      | `postgresql://claw:claw_secret@pg-chat:5432/claw_chat?schema=public`            | claw-chat-service      |
| `CONNECTOR_DATABASE_URL` | `postgresql://claw:claw_secret@pg-connector:5432/claw_connectors?schema=public` | claw-connector-service |
| `ROUTING_DATABASE_URL`   | `postgresql://claw:claw_secret@pg-routing:5432/claw_routing?schema=public`      | claw-routing-service   |
| `MEMORY_DATABASE_URL`    | `postgresql://claw:claw_secret@pg-memory:5432/claw_memory?schema=public`        | claw-memory-service    |
| `FILES_DATABASE_URL`     | `postgresql://claw:claw_secret@pg-files:5432/claw_files?schema=public`          | claw-file-service      |
| `OLLAMA_DATABASE_URL`    | `postgresql://claw:claw_secret@pg-ollama:5432/claw_ollama?schema=public`        | claw-ollama-service    |
| `IMAGE_DATABASE_URL`     | `postgresql://claw:claw_secret@pg-images:5432/claw_images?schema=public`        | claw-image-service     |

**Note:** The hostnames (`pg-auth`, `pg-chat`, etc.) are Docker container names. The internal port is always `5432`. The host-mapped ports (`PG_*_PORT`) are only for external access (e.g., database tools).

### MongoDB Connection Strings

| Variable                  | Default                                                                      | Service                  |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------ |
| `AUDIT_MONGODB_URI`       | `mongodb://claw:claw_secret@mongodb:27017/claw_audit?authSource=admin`       | claw-audit-service       |
| `CLIENT_LOGS_MONGODB_URI` | `mongodb://claw:claw_secret@mongodb:27017/claw_client_logs?authSource=admin` | claw-client-logs-service |
| `SERVER_LOGS_MONGODB_URI` | `mongodb://claw:claw_secret@mongodb:27017/claw_server_logs?authSource=admin` | claw-server-logs-service |

**Security note:** All database connection strings contain credentials. They are marked as **secrets** and must never be logged or exposed to the frontend.

---

## 17. Security Summary

### Variables That Are Secrets

The following variables contain sensitive information and must be protected:

| Variable              | Risk                          |
| --------------------- | ----------------------------- |
| `PG_*_PASSWORD` (x8)  | Database access               |
| `MONGO_PASSWORD`      | MongoDB access                |
| `RABBITMQ_PASSWORD`   | Message broker access         |
| `RABBITMQ_URL`        | Contains embedded credentials |
| `JWT_SECRET`          | Token forgery if leaked       |
| `ENCRYPTION_KEY`      | Connector API key decryption  |
| `ADMIN_PASSWORD`      | Admin account takeover        |
| `*_DATABASE_URL` (x8) | Contain embedded credentials  |
| `*_MONGODB_URI` (x3)  | Contain embedded credentials  |

### Production Recommendations

1. **Generate unique secrets** for all password/secret variables.
2. **Use a secrets manager** (Vault, AWS Secrets Manager, etc.) instead of `.env` files in production.
3. **Never commit `.env`** to version control (already in `.gitignore`).
4. **Rotate `JWT_SECRET`** periodically (invalidates all active sessions).
5. **Rotate `ENCRYPTION_KEY`** requires re-encrypting all connector configs.
6. **Change `ADMIN_PASSWORD`** immediately after first login.
7. **Restrict `CORS_ORIGINS`** to exact production domain(s).

---

## 18. Adding New Environment Variables

When adding a new environment variable, update ALL of these locations:

1. `.env.example` -- add with a safe default value and comment
2. `.env` -- add with working development value
3. `scripts/install.sh` -- add to the generated `.env` block
4. `scripts/install.ps1` -- add to the Windows installer
5. `CLAUDE.md` -- add to the environment variables section
6. Service `AppConfig` (Zod schema) -- validate the variable
7. `docker-compose.dev.yml` -- if the variable needs container-level access
8. This document -- add to the appropriate category
