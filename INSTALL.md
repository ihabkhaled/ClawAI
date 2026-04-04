# Installation Guide

Complete guide to setting up Claw for local development.

---

## Prerequisites

| Requirement | Minimum Version | Notes                                |
|-------------|-----------------|--------------------------------------|
| Node.js     | 20.0.0          | LTS recommended                      |
| npm          | 10.0.0          | Ships with Node 20+                  |
| Docker       | 24.0.0          | Docker Desktop or Docker Engine      |
| Docker Compose | 2.20.0       | Included with Docker Desktop         |
| Git          | 2.40.0          | For cloning the repository           |

Optional:
- **NVIDIA GPU drivers** and **NVIDIA Container Toolkit** if you want GPU-accelerated local models via Ollama.

---

## Step 1: Clone the Repository

```bash
git clone <repo-url> claw
cd claw
```

---

## Step 2: Install Dependencies

Claw uses npm workspaces. A single install at the root handles both frontend and backend:

```bash
npm install
```

This installs dependencies for:
- Root workspace (shared tooling)
- `apps/claw-frontend` (Next.js)
- `apps/claw-backend` (NestJS)

---

## Step 3: Environment Setup

Copy the example environment files:

```bash
cp .env.example .env
cp apps/claw-backend/.env.example apps/claw-backend/.env
cp apps/claw-frontend/.env.example apps/claw-frontend/.env
```

Edit `.env` at the root and update the following values for your environment:

| Variable          | Action                                        |
|-------------------|-----------------------------------------------|
| `POSTGRES_PASSWORD` | Set a strong password for production         |
| `JWT_SECRET`       | Generate a random 64-character string         |
| `ENCRYPTION_KEY`   | Generate a random 32-byte hex string (64 hex chars) |
| `ADMIN_PASSWORD`   | Set the initial admin password                |

To generate secure random values:

```bash
# JWT_SECRET (64 characters)
openssl rand -base64 48

# ENCRYPTION_KEY (32 bytes as hex)
openssl rand -hex 32
```

---

## Step 4: Start Infrastructure

Start PostgreSQL and Redis using Docker Compose:

```bash
npm run docker:up
```

This starts:
- **PostgreSQL 16** (with pgvector extension) on port `5432`
- **Redis 7** on port `6379`

Verify the services are healthy:

```bash
docker compose ps
```

Both services should show status `healthy`.

---

## Step 5: Database Migration and Seed

Run Prisma migrations to create the database schema:

```bash
npm run migrate:dev
```

Seed the database with the initial admin user:

```bash
npm run seed
```

This creates an admin account using the credentials from your `.env` file:
- Email: value of `ADMIN_EMAIL` (default: `admin@claw.local`)
- Password: value of `ADMIN_PASSWORD`

---

## Step 6: Start Development Servers

Start both frontend and backend in development mode:

```bash
npm run dev
```

Or start them individually:

```bash
# Terminal 1: Backend (http://localhost:4000)
npm run dev:backend

# Terminal 2: Frontend (http://localhost:3000)
npm run dev:frontend
```

---

## Step 7: First Login

1. Open `http://localhost:3000` in your browser.
2. Log in with your admin credentials:
   - **Email**: `admin@claw.local` (or your configured `ADMIN_EMAIL`)
   - **Password**: the value you set for `ADMIN_PASSWORD` in `.env`
3. You should see the Claw dashboard.

---

## GPU / Ollama Setup

### Running Ollama Without GPU

Start the infrastructure with the local-ai profile:

```bash
npm run docker:up:ai
```

This starts Ollama alongside PostgreSQL and Redis. Ollama will run on CPU, which is slower but works on any machine.

### Running Ollama With GPU (NVIDIA)

Prerequisites:
1. Install [NVIDIA GPU drivers](https://www.nvidia.com/drivers) for your card.
2. Install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).
3. Verify GPU access: `nvidia-smi` should show your GPU.

Start with the GPU profile:

```bash
npm run docker:up:gpu
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

The routing engine uses a small local model (such as `qwen2.5:3b`) as a judge to decide which provider/model should handle each request. Larger models can be used for direct inference.

### Ollama on Host (Without Docker)

If you prefer running Ollama directly on your host:

1. Install Ollama from [ollama.com](https://ollama.com).
2. Start it: `ollama serve`.
3. Set `OLLAMA_BASE_URL=http://localhost:11434` in your `.env` (this is the default).
4. Pull models: `ollama pull qwen2.5:3b`.

---

## Troubleshooting

### Port Conflicts

If ports `5432`, `6379`, `3000`, or `4000` are already in use, update the corresponding variables in your `.env` and `docker-compose.yml`.

### Database Connection Issues

Ensure PostgreSQL is running and healthy:

```bash
docker compose ps postgres
docker compose logs postgres
```

### Permission Errors on Linux

If Docker commands require `sudo`, add your user to the `docker` group:

```bash
sudo usermod -aG docker $USER
# Log out and back in for the change to take effect
```

### Clean Restart

To reset everything and start fresh:

```bash
npm run docker:down
docker volume rm claw_postgres-data claw_redis-data claw_ollama-data
npm run clean
npm install
npm run docker:up
npm run migrate:dev
npm run seed
```
