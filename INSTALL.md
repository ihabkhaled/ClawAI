# Installation Guide

Complete guide to setting up Claw for local development.

---

## Prerequisites

| Requirement      | Minimum Version | Notes                            |
|------------------|-----------------|----------------------------------|
| Node.js          | 20.0.0          | LTS recommended                  |
| npm              | 10.0.0          | Ships with Node 20+              |
| Docker           | 24.0.0          | Docker Desktop or Docker Engine  |
| Docker Compose   | 2.20.0          | Included with Docker Desktop     |
| Git              | 2.40.0          | For cloning the repository       |

Optional:
- **NVIDIA GPU drivers** and **NVIDIA Container Toolkit** if you want GPU-accelerated local models via Ollama.

---

## Quick Start (Docker Compose)

The fastest way to run Claw is with Docker Compose, which starts all 20 containers:

```bash
# 1. Clone the repository
git clone <repo-url> claw
cd claw

# 2. Copy environment file
cp .env.example .env

# 3. Start all containers
docker compose up -d

# 4. Verify health
curl http://localhost:4009/api/v1/health
```

### What Starts (20 containers)

| Container              | Type           | Host Port | Internal Port |
|------------------------|----------------|-----------|---------------|
| claw-auth-service      | Microservice   | 4001      | 4001          |
| claw-chat-service      | Microservice   | 4002      | 4002          |
| claw-connector-service | Microservice   | 4003      | 4003          |
| claw-routing-service   | Microservice   | 4004      | 4004          |
| claw-memory-service    | Microservice   | 4005      | 4005          |
| claw-file-service      | Microservice   | 4006      | 4006          |
| claw-audit-service     | Microservice   | 4007      | 4007          |
| claw-ollama-service    | Microservice   | 4008      | 4008          |
| claw-health-service    | Microservice   | 4009      | 4009          |
| claw-frontend          | Next.js        | 3000      | 3000          |
| claw-nginx             | Reverse Proxy  | 80        | 80            |
| claw-pg-auth           | PostgreSQL     | 5441      | 5432          |
| claw-pg-chat           | PostgreSQL     | 5442      | 5432          |
| claw-pg-connectors     | PostgreSQL     | 5443      | 5432          |
| claw-pg-routing        | PostgreSQL     | 5444      | 5432          |
| claw-pg-memory         | PostgreSQL     | 5445      | 5432          |
| claw-pg-files          | PostgreSQL     | 5446      | 5432          |
| claw-mongodb           | MongoDB        | 27018     | 27017         |
| claw-redis             | Redis          | 6380      | 6379          |
| claw-rabbitmq          | RabbitMQ       | 5672 / 15672 | 5672 / 15672 |

Note: Ollama runs as a separate Docker Compose profile (see GPU / Ollama Setup below).

---

## Step 1: Environment Setup

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

At minimum, update these values:

| Variable            | Action                                        |
|---------------------|-----------------------------------------------|
| `JWT_SECRET`        | Generate a random 64-character string          |
| `ENCRYPTION_KEY`    | Generate a random 32-byte hex string (64 hex chars) |
| `ADMIN_PASSWORD`    | Set the initial admin password                 |

To generate secure random values:

```bash
# JWT_SECRET (64 characters)
openssl rand -base64 48

# ENCRYPTION_KEY (32 bytes as hex)
openssl rand -hex 32
```

---

## Step 2: Start All Services

```bash
docker compose up -d
```

Wait for all containers to become healthy (this may take 30-60 seconds on first run):

```bash
docker compose ps
```

All 20 containers should show status `running` or `healthy`.

---

## Step 3: Verify Health

The health service aggregates status from all microservices:

```bash
curl http://localhost:4009/api/v1/health
```

You should receive a JSON response showing each service's health status.

---

## Step 4: First Login

### Via the Frontend

1. Open `http://localhost:3000` in your browser.
2. Log in with your admin credentials:
   - **Email**: `admin@claw.local` (or your configured `ADMIN_EMAIL`)
   - **Password**: the value you set for `ADMIN_PASSWORD` in `.env`
3. You should see the Claw dashboard.

### Via the API (through Nginx)

```bash
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@claw.local", "password": "your-admin-password"}'
```

### Via the Auth Service Directly

```bash
curl -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@claw.local", "password": "your-admin-password"}'
```

---

## Access Points

| What              | URL                          |
|-------------------|------------------------------|
| Frontend          | http://localhost:3000         |
| API (via Nginx)   | http://localhost:80           |
| Auth Service      | http://localhost:4001         |
| Chat Service      | http://localhost:4002         |
| Connector Service | http://localhost:4003         |
| Routing Service   | http://localhost:4004         |
| Memory Service    | http://localhost:4005         |
| File Service      | http://localhost:4006         |
| Audit Service     | http://localhost:4007         |
| Ollama Service    | http://localhost:4008         |
| Health Service    | http://localhost:4009         |
| RabbitMQ Management | http://localhost:15672      |

Default RabbitMQ management credentials: `guest` / `guest` (change in production).

---

## Running Individual Services Locally (Outside Docker)

For active development on a specific service, you can run it outside Docker while keeping infrastructure containers running.

### 1. Start Infrastructure Only

Start only the databases, Redis, RabbitMQ, and Nginx:

```bash
docker compose up -d claw-pg-auth claw-pg-chat claw-pg-connectors claw-pg-routing claw-pg-memory claw-pg-files claw-mongodb claw-redis claw-rabbitmq
```

### 2. Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces:
- Root workspace (shared tooling)
- All 9 service apps
- `apps/claw-frontend` (Next.js)
- All 4 shared packages

### 3. Build Shared Packages

Shared packages must be built before services can import them:

```bash
npm run build -w packages/shared-types
npm run build -w packages/shared-constants
npm run build -w packages/shared-rabbitmq
npm run build -w packages/shared-auth
```

### 4. Run a Single Service

```bash
# Example: run the auth service locally
npm run dev:auth

# Example: run the frontend locally
npm run dev:frontend
```

Each service reads its own `.env` file (or inherits from the root `.env`) for database connection strings. When running locally, ensure the connection strings point to `localhost` with the correct host ports (e.g., `localhost:5441` for the auth database).

---

## GPU / Ollama Setup

### Running Ollama Without GPU

Start Ollama alongside the other services using the `ollama` profile:

```bash
docker compose --profile ollama up -d
```

This starts the Ollama container on port `11434` using CPU inference (slower but works on any machine).

### Running Ollama With GPU (NVIDIA)

Prerequisites:
1. Install [NVIDIA GPU drivers](https://www.nvidia.com/drivers) for your card.
2. Install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).
3. Verify GPU access: `nvidia-smi` should show your GPU.

Start with the GPU profile:

```bash
docker compose --profile ollama-gpu up -d
```

### Pulling Local Models

Once Ollama is running, pull the models you want to use:

```bash
# Recommended: small and fast model for routing/judge duties
docker exec claw-ollama ollama pull qwen2.5:3b

# General-purpose models
docker exec claw-ollama ollama pull llama3.1:8b
docker exec claw-ollama ollama pull mistral:7b

# Verify available models
docker exec claw-ollama ollama list
```

### Ollama on Host (Without Docker)

If you prefer running Ollama directly on your host:

1. Install Ollama from [ollama.com](https://ollama.com).
2. Start it: `ollama serve`.
3. Set `OLLAMA_BASE_URL=http://host.docker.internal:11434` in your `.env` so Docker services can reach it.
4. Pull models: `ollama pull qwen2.5:3b`.

---

## Port Mapping Reference

| Host Port | Container Port | Service              |
|-----------|----------------|----------------------|
| 80        | 80             | Nginx reverse proxy  |
| 3000      | 3000           | Frontend (Next.js)   |
| 4001      | 4001           | Auth service         |
| 4002      | 4002           | Chat service         |
| 4003      | 4003           | Connector service    |
| 4004      | 4004           | Routing service      |
| 4005      | 4005           | Memory service       |
| 4006      | 4006           | File service         |
| 4007      | 4007           | Audit service        |
| 4008      | 4008           | Ollama service       |
| 4009      | 4009           | Health service       |
| 5441      | 5432           | PostgreSQL (auth)    |
| 5442      | 5432           | PostgreSQL (chat)    |
| 5443      | 5432           | PostgreSQL (connectors) |
| 5444      | 5432           | PostgreSQL (routing) |
| 5445      | 5432           | PostgreSQL (memory)  |
| 5446      | 5432           | PostgreSQL (files)   |
| 27018     | 27017          | MongoDB (audit)      |
| 6380      | 6379           | Redis                |
| 5672      | 5672           | RabbitMQ (AMQP)      |
| 15672     | 15672          | RabbitMQ (Management UI) |
| 11434     | 11434          | Ollama (optional)    |

---

## Troubleshooting

### Port Conflicts

If any ports are already in use, update the corresponding port mappings in `docker-compose.yml` and the relevant `.env` variables.

### Container Fails to Start

Check the logs for the specific container:

```bash
docker compose logs claw-auth-service
docker compose logs claw-pg-auth
```

### Database Connection Issues

Ensure the relevant PostgreSQL container is running and healthy:

```bash
docker compose ps | grep pg
```

### RabbitMQ Connection Refused

RabbitMQ can take 15-30 seconds to fully start. Check its status:

```bash
docker compose logs claw-rabbitmq
```

Services will retry RabbitMQ connections automatically.

### Permission Errors on Linux

If Docker commands require `sudo`, add your user to the `docker` group:

```bash
sudo usermod -aG docker $USER
# Log out and back in for the change to take effect
```

### Clean Restart

To reset everything and start fresh:

```bash
docker compose down -v
npm run clean
npm install
docker compose up -d
```
