# Environment Setup

> Prerequisites, install scripts, .env configuration, and first-time setup.

---

## 1. Prerequisites

| Software         | Minimum Version | Check Command             | Purpose                    |
| ---------------- | --------------- | ------------------------- | -------------------------- |
| Node.js          | 20.x            | `node --version`          | Running services           |
| npm              | 10.x            | `npm --version`           | Package management         |
| Docker           | 24.x            | `docker --version`        | Container runtime          |
| Docker Compose   | 2.x             | `docker compose version`  | Container orchestration    |
| Git              | 2.40+           | `git --version`           | Version control            |

### Optional

| Software         | Purpose                    | When Needed                  |
| ---------------- | -------------------------- | ---------------------------- |
| GPU drivers      | Ollama GPU acceleration    | If using GPU for local LLMs  |
| NVIDIA Container Toolkit | GPU in Docker      | If using GPU for Ollama      |

---

## 2. Install Scripts

### Linux/macOS

```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

### Windows (PowerShell)

```powershell
.\scripts\install.ps1
```

### What the Scripts Do

1. Verify prerequisites are installed
2. Run `npm install` to install all workspace dependencies
3. Generate `.env` file from `.env.example` with default development values
4. Build shared packages (shared-types, shared-constants, shared-rabbitmq, shared-auth)
5. Generate Prisma clients for all services
6. Start Docker containers via `docker compose -f docker-compose.dev.yml up -d`
7. Wait for health checks to pass
8. Display access URLs

---

## 3. Environment Configuration

### The .env File

All services read from a single root `.env` file. Copy from the example:

```bash
cp .env.example .env
```

### Variable Groups

#### General

```bash
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:80,http://localhost
THROTTLE_TTL=60000           # Rate limit window (ms)
THROTTLE_LIMIT=100           # Max requests per window
```

#### PostgreSQL Databases (9 instances)

Each database has USER, PASSWORD, DB, and PORT variables:

```bash
# Auth
PG_AUTH_USER=claw
PG_AUTH_PASSWORD=claw_secret
PG_AUTH_DB=claw_auth
PG_AUTH_PORT=5441

# Chat
PG_CHAT_USER=claw
PG_CHAT_PASSWORD=claw_secret
PG_CHAT_DB=claw_chat
PG_CHAT_PORT=5442

# Connector, Routing, Memory, Files, Ollama, Images, File Generations
# Same pattern with respective service names
```

#### Database URLs (used by Prisma)

```bash
AUTH_DATABASE_URL=postgresql://${PG_AUTH_USER}:${PG_AUTH_PASSWORD}@pg-auth:5432/${PG_AUTH_DB}
CHAT_DATABASE_URL=postgresql://${PG_CHAT_USER}:${PG_CHAT_PASSWORD}@pg-chat:5432/${PG_CHAT_DB}
# ... one per service
```

#### MongoDB

```bash
MONGO_USER=claw
MONGO_PASSWORD=claw_secret
MONGO_DB=claw_audit
MONGO_PORT=27018
AUDIT_MONGODB_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/${MONGO_DB}?authSource=admin
CLIENT_LOGS_MONGODB_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/claw_client_logs?authSource=admin
SERVER_LOGS_MONGODB_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/claw_server_logs?authSource=admin
```

#### Redis

```bash
REDIS_URL=redis://redis:6379
REDIS_PORT=6380
```

#### RabbitMQ

```bash
RABBITMQ_DEFAULT_USER=claw
RABBITMQ_DEFAULT_PASS=claw_secret
RABBITMQ_URL=amqp://claw:claw_secret@rabbitmq:5672
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
```

#### JWT and Security

```bash
JWT_SECRET=<64-character-hex-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENCRYPTION_KEY=<64-character-hex-string>  # AES-256-GCM for connector API keys
```

#### Admin User

```bash
ADMIN_EMAIL=admin@claw.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!
```

#### Frontend

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_APP_NAME=ClawAI
NEXT_PUBLIC_APP_URL=http://localhost:3000
FRONTEND_PORT=3000
```

#### Ollama

```bash
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_ROUTER_MODEL=gemma3:4b
OLLAMA_ROUTER_TIMEOUT_MS=30000
MEMORY_EXTRACTION_MODEL=gemma3:4b
AUTO_PULL_MODELS=gemma3:4b llama3.2:3b phi3:mini gemma2:2b tinyllama
```

#### Inter-Service URLs

```bash
AUTH_SERVICE_URL=http://auth-service:4001
CHAT_SERVICE_URL=http://chat-service:4002
CONNECTOR_SERVICE_URL=http://connector-service:4003
ROUTING_SERVICE_URL=http://routing-service:4004
MEMORY_SERVICE_URL=http://memory-service:4005
FILE_SERVICE_URL=http://file-service:4006
AUDIT_SERVICE_URL=http://audit-service:4007
OLLAMA_SERVICE_URL=http://ollama-service:4008
HEALTH_SERVICE_URL=http://health-service:4009
CLIENT_LOGS_SERVICE_URL=http://client-logs-service:4010
SERVER_LOGS_SERVICE_URL=http://server-logs-service:4011
IMAGE_SERVICE_URL=http://image-service:4012
FILE_GENERATION_SERVICE_URL=http://file-generation-service:4013
```

#### Service Ports

```bash
AUTH_PORT=4001
CHAT_PORT=4002
CONNECTOR_PORT=4003
ROUTING_PORT=4004
MEMORY_PORT=4005
FILE_PORT=4006
AUDIT_PORT=4007
OLLAMA_PORT=4008
HEALTH_PORT=4009
CLIENT_LOGS_PORT=4010
SERVER_LOGS_PORT=4011
IMAGE_PORT=4012
FILE_GENERATION_PORT=4013
```

---

## 4. First-Time Setup Checklist

- [ ] Node.js 20+ installed
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned
- [ ] `.env` file created from `.env.example`
- [ ] JWT_SECRET generated (64 hex chars): `openssl rand -hex 32`
- [ ] ENCRYPTION_KEY generated (64 hex chars): `openssl rand -hex 32`
- [ ] Docker containers started: `docker compose -f docker-compose.dev.yml up -d`
- [ ] Wait for health checks (~2-5 minutes)
- [ ] Frontend accessible at http://localhost:3000
- [ ] Login with admin credentials from `.env`
- [ ] RabbitMQ management UI accessible at http://localhost:15672

---

## 5. Port Reference

| Port  | Service                  | Access URL                     |
| ----- | ------------------------ | ------------------------------ |
| 3000  | Frontend (Next.js)       | http://localhost:3000           |
| 4000  | Nginx (API proxy)        | http://localhost:4000/api/v1/  |
| 4001  | Auth service             | Direct (not through nginx)     |
| 4002  | Chat service             | Direct                         |
| 4003  | Connector service        | Direct                         |
| 4004  | Routing service          | Direct                         |
| 4005  | Memory service           | Direct                         |
| 4006  | File service             | Direct                         |
| 4007  | Audit service            | Direct                         |
| 4008  | Ollama service           | Direct                         |
| 4009  | Health service           | Direct                         |
| 4010  | Client logs service      | Direct                         |
| 4011  | Server logs service      | Direct                         |
| 4012  | Image service            | Direct                         |
| 4013  | File generation service  | Direct                         |
| 5441-5449 | PostgreSQL instances | Database connections           |
| 27018 | MongoDB                  | Database connection            |
| 6380  | Redis                    | Cache connection               |
| 5672  | RabbitMQ (AMQP)          | Message broker                 |
| 15672 | RabbitMQ Management      | http://localhost:15672          |
| 11434 | Ollama                   | http://localhost:11434          |

---

## 6. Verifying the Setup

```bash
# Check all containers are healthy
docker compose -f docker-compose.dev.yml ps

# Check aggregated health
curl http://localhost:4000/api/v1/health

# Login and get a token
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.local","password":"Admin123!"}'

# Test a protected endpoint
curl http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer <access-token>"
```
