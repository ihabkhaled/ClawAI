# Environment Variables — Complete Reference

Single root `.env` file used by all services. Copy from `.env.example`.

---

## General

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | `development` | All | Environment mode (development, production, test) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:80,http://localhost` | All backend | Comma-separated allowed origins |
| `THROTTLE_TTL` | `60000` | All backend | Rate limit window in milliseconds |
| `THROTTLE_LIMIT` | `100` | All backend | Max requests per window |

---

## PostgreSQL Credentials

Each PostgreSQL database has 4 variables. Used by Docker compose for database container initialization.

| Variable Pattern | Default | Description |
|-----------------|---------|-------------|
| `PG_<SVC>_USER` | `claw` | Database username |
| `PG_<SVC>_PASSWORD` | `claw_secret` | Database password |
| `PG_<SVC>_DB` | `claw_<svc>` | Database name |
| `PG_<SVC>_PORT` | varies | Host port mapping |

### Service-Specific Ports

| Service | PG_*_PORT | Database Name |
|---------|-----------|---------------|
| AUTH | 5441 | claw_auth |
| CHAT | 5442 | claw_chat |
| CONNECTOR | 5443 | claw_connectors |
| ROUTING | 5444 | claw_routing |
| MEMORY | 5445 | claw_memory |
| FILES | 5446 | claw_files |
| OLLAMA | 5447 | claw_ollama |
| IMAGES | 5448 | claw_images |
| FILE_GENERATIONS | 5449 | claw_file_generations |

---

## MongoDB

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `MONGO_USER` | `claw` | audit, client-logs, server-logs | MongoDB username |
| `MONGO_PASSWORD` | `claw_secret` | audit, client-logs, server-logs | MongoDB password |
| `MONGO_DB` | `claw_audit` | Docker compose | Default database name |
| `MONGO_PORT` | `27018` | Docker compose | Host port mapping |

---

## Redis

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `REDIS_URL` | `redis://redis:6379` | All backend | Redis connection URL |
| `REDIS_PORT` | `6380` | Docker compose | Host port mapping |

---

## RabbitMQ

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `RABBITMQ_USER` | `claw` | Docker compose | RabbitMQ username |
| `RABBITMQ_PASSWORD` | `claw_secret` | Docker compose | RabbitMQ password |
| `RABBITMQ_URL` | `amqp://claw:claw_secret@rabbitmq:5672` | All backend | AMQP connection URL |
| `RABBITMQ_PORT` | `5672` | Docker compose | AMQP host port |
| `RABBITMQ_MANAGEMENT_PORT` | `15672` | Docker compose | Management UI port |

---

## JWT / Authentication

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `JWT_SECRET` | `claw-dev-jwt-secret-...` | All backend | JWT signing secret (min 32 chars) |
| `JWT_ACCESS_EXPIRY` | `15m` | auth | Access token expiration |
| `JWT_REFRESH_EXPIRY` | `7d` | auth | Refresh token expiration |

---

## Encryption

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `ENCRYPTION_KEY` | `a1b2c3d4...` (64 hex) | connector | AES-256-GCM key for API key encryption |

Generate with: `openssl rand -hex 32`

---

## Admin Seed

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `ADMIN_EMAIL` | `admin@claw.local` | auth | Default admin email |
| `ADMIN_USERNAME` | `claw-admin` | auth | Default admin username |
| `ADMIN_PASSWORD` | `ClawAdmin123!` | auth | Default admin password |

---

## Frontend (Next.js)

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | frontend | Backend API URL (through nginx) |
| `NEXT_PUBLIC_APP_NAME` | `Claw` | frontend | Application display name |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | frontend | Frontend URL |
| `FRONTEND_PORT` | `3000` | Docker compose | Frontend host port |

---

## Ollama / Local AI

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `OLLAMA_BASE_URL` | `http://ollama:11434` | ollama | Ollama runtime URL |
| `OLLAMA_ROUTER_MODEL` | `gemma3:4b` | routing | Model used for AUTO routing decisions |
| `OLLAMA_ROUTER_TIMEOUT_MS` | `10000` | routing | Router call timeout |
| `MEMORY_EXTRACTION_MODEL` | `gemma3:4b` | memory | Model used for memory extraction |
| `AUTO_PULL_MODELS` | `tinyllama gemma3:4b gemma2:2b phi3:mini llama3.2:3b` | ollama | Space-separated models to auto-pull on startup |

---

## Image Generation

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `STABLE_DIFFUSION_URL` | `http://stable-diffusion:7860` | image | Stable Diffusion API URL |
| `COMFYUI_BASE_URL` | `http://comfyui:8188` | image | ComfyUI API URL |
| `COMFYUI_PORT` | `8188` | Docker compose | ComfyUI host port |

---

## File Storage

| Variable | Default | Services | Description |
|----------|---------|----------|-------------|
| `FILE_STORAGE_PATH` | `/data/files` | file | File storage directory path |

---

## Inter-Service URLs

Docker hostnames for service-to-service HTTP calls.

| Variable | Default | Used By |
|----------|---------|---------|
| `AUTH_SERVICE_URL` | `http://auth-service:4001` | health |
| `CHAT_SERVICE_URL` | `http://chat-service:4002` | health |
| `CONNECTOR_SERVICE_URL` | `http://connector-service:4003` | chat, routing, image, file-gen, health |
| `ROUTING_SERVICE_URL` | `http://routing-service:4004` | health |
| `MEMORY_SERVICE_URL` | `http://memory-service:4005` | chat, health |
| `FILE_SERVICE_URL` | `http://file-service:4006` | chat, image, health |
| `AUDIT_SERVICE_URL` | `http://audit-service:4007` | health |
| `OLLAMA_SERVICE_URL` | `http://ollama-service:4008` | routing, memory, health |
| `CLIENT_LOGS_SERVICE_URL` | `http://client-logs-service:4010` | health |
| `SERVER_LOGS_SERVICE_URL` | `http://server-logs-service:4011` | health |
| `IMAGE_SERVICE_URL` | `http://image-service:4012` | chat, health |
| `FILE_GENERATION_SERVICE_URL` | `http://file-generation-service:4013` | chat, health |

---

## Per-Service Ports

Host ports for each service container.

| Variable | Default | Service |
|----------|---------|---------|
| `AUTH_PORT` | `4001` | auth-service |
| `CHAT_PORT` | `4002` | chat-service |
| `CONNECTOR_PORT` | `4003` | connector-service |
| `ROUTING_PORT` | `4004` | routing-service |
| `MEMORY_PORT` | `4005` | memory-service |
| `FILES_PORT` | `4006` | file-service |
| `AUDIT_PORT` | `4007` | audit-service |
| `OLLAMA_PORT` | `4008` | ollama-service |
| `HEALTH_PORT` | `4009` | health-service |
| `CLIENT_LOGS_PORT` | `4010` | client-logs-service |
| `SERVER_LOGS_PORT` | `4011` | server-logs-service |
| `IMAGE_PORT` | `4012` | image-service |
| `FILE_GENERATION_PORT` | `4013` | file-generation-service |

---

## Per-Service Database URLs

Prisma connection strings for each service.

| Variable | Database | Service |
|----------|----------|---------|
| `AUTH_DATABASE_URL` | claw_auth | auth-service |
| `CHAT_DATABASE_URL` | claw_chat | chat-service |
| `CONNECTOR_DATABASE_URL` | claw_connectors | connector-service |
| `ROUTING_DATABASE_URL` | claw_routing | routing-service |
| `MEMORY_DATABASE_URL` | claw_memory | memory-service |
| `FILES_DATABASE_URL` | claw_files | file-service |
| `OLLAMA_DATABASE_URL` | claw_ollama | ollama-service |
| `IMAGE_DATABASE_URL` | claw_images | image-service |
| `FILE_GENERATION_DATABASE_URL` | claw_file_generations | file-generation-service |
| `AUDIT_MONGODB_URI` | claw_audit | audit-service |
| `CLIENT_LOGS_MONGODB_URI` | claw_client_logs | client-logs-service |
| `SERVER_LOGS_MONGODB_URI` | claw_server_logs | server-logs-service |

Format for PostgreSQL:
```
postgresql://<user>:<password>@<host>:5432/<database>?schema=public
```

Format for MongoDB:
```
mongodb://<user>:<password>@<host>:27017/<database>?authSource=admin
```

---

## Security Notes

- `JWT_SECRET` must be at least 32 characters in production
- `ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes)
- `ADMIN_PASSWORD` should be changed after first login
- Never commit `.env` to git — only `.env.example`
- Passwords in Docker compose use `${VAR}` interpolation from `.env`
