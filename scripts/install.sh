#!/usr/bin/env bash
# =============================================================================
# Claw — Automated Install Script (Linux / macOS)
# =============================================================================
# Usage: bash scripts/install.sh
# =============================================================================
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }
ask()   { printf "${CYAN}[?]${NC}     %s" "$1"; }

# ─── Resolve project root ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ─── Banner ──────────────────────────────────────────────────────────────────
echo ""
printf "${BOLD}${CYAN}"
cat << 'BANNER'
   ██████╗██╗      █████╗ ██╗    ██╗
  ██╔════╝██║     ██╔══██╗██║    ██║
  ██║     ██║     ███████║██║ █╗ ██║
  ██║     ██║     ██╔══██║██║███╗██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝
BANNER
printf "${NC}"
echo "  Local-first AI Orchestration Platform"
echo "  ─────────────────────────────────────"
echo ""

# ─── Helper: generate random string ─────────────────────────────────────────
gen_secret_b64() {
  if command -v openssl &>/dev/null; then
    openssl rand -base64 48
  else
    node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
  fi
}

gen_secret_hex() {
  if command -v openssl &>/dev/null; then
    openssl rand -hex 32
  else
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

gen_password() {
  if command -v openssl &>/dev/null; then
    openssl rand -base64 18 | tr -d '/+=' | head -c 20
  else
    node -e "console.log(require('crypto').randomBytes(15).toString('base64url').slice(0,20))"
  fi
}

# ─── Step 1: Check prerequisites ────────────────────────────────────────────
echo "${BOLD}Step 1/7: Checking prerequisites${NC}"
echo ""

MISSING=0

# Docker
if command -v docker &>/dev/null; then
  DOCKER_VER=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
  ok "Docker $DOCKER_VER"
else
  fail "Docker not found — install from https://docs.docker.com/get-docker/"
  MISSING=1
fi

# Docker Compose
if docker compose version &>/dev/null; then
  COMPOSE_VER=$(docker compose version | grep -oE '[0-9]+\.[0-9]+' | head -1)
  ok "Docker Compose $COMPOSE_VER"
else
  fail "Docker Compose not found — install from https://docs.docker.com/compose/install/"
  MISSING=1
fi

# Node.js
if command -v node &>/dev/null; then
  NODE_VER=$(node --version | tr -d 'v')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 20 ]; then
    ok "Node.js $NODE_VER"
  else
    fail "Node.js $NODE_VER found but >= 20 required — https://nodejs.org"
    MISSING=1
  fi
else
  fail "Node.js not found — install from https://nodejs.org (v20+)"
  MISSING=1
fi

# Git
if command -v git &>/dev/null; then
  GIT_VER=$(git --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
  ok "Git $GIT_VER"
else
  fail "Git not found — install from https://git-scm.com"
  MISSING=1
fi

# Docker running?
if docker info &>/dev/null; then
  ok "Docker daemon is running"
else
  fail "Docker daemon is not running — please start Docker Desktop or dockerd"
  MISSING=1
fi

if [ "$MISSING" -ne 0 ]; then
  echo ""
  fail "Missing prerequisites. Please install them and re-run this script."
  exit 1
fi
echo ""

# ─── Step 2: Check port availability ────────────────────────────────────────
echo "${BOLD}Step 2/7: Checking port availability${NC}"
echo ""

check_port() {
  local port=$1 name=$2
  if (echo >/dev/tcp/localhost/"$port") 2>/dev/null; then
    warn "Port $port ($name) is in use"
  else
    ok "Port $port ($name) is available"
  fi
}

check_port 3000 "Frontend"
check_port 4000 "API Gateway (Nginx)"
check_port 5672 "RabbitMQ"
check_port 6380 "Redis"
check_port 27018 "MongoDB"
echo ""

# ─── Step 3: Generate secrets ────────────────────────────────────────────────
echo "${BOLD}Step 3/7: Generating secrets${NC}"
echo ""

JWT_SECRET=$(gen_secret_b64)
ENCRYPTION_KEY=$(gen_secret_hex)
DB_PASSWORD=$(gen_password)
MONGO_PASS=$(gen_password)
RABBIT_PASS=$(gen_password)
ADMIN_PASS=$(gen_password)

ok "JWT secret generated (${#JWT_SECRET} chars)"
ok "Encryption key generated (${#ENCRYPTION_KEY} hex chars)"
ok "Database passwords generated"
ok "Admin password generated"
echo ""

# ─── Step 4: Admin configuration ────────────────────────────────────────────
echo "${BOLD}Step 4/7: Admin configuration${NC}"
echo ""

ADMIN_EMAIL="admin@claw.local"
ADMIN_USERNAME="claw-admin"

ask "Admin email [${ADMIN_EMAIL}]: "
read -r input
if [ -n "$input" ]; then ADMIN_EMAIL="$input"; fi

ask "Admin username [${ADMIN_USERNAME}]: "
read -r input
if [ -n "$input" ]; then ADMIN_USERNAME="$input"; fi

ask "Admin password [auto-generated]: "
read -r input
if [ -n "$input" ]; then ADMIN_PASS="$input"; fi

echo ""

# ─── Step 5: GPU / Ollama detection ─────────────────────────────────────────
echo "${BOLD}Step 5/7: Ollama & GPU detection${NC}"
echo ""

USE_GPU="false"
ENABLE_OLLAMA="true"

if command -v nvidia-smi &>/dev/null; then
  GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
  ok "NVIDIA GPU detected: $GPU_NAME"
  ask "Enable GPU-accelerated Ollama? [Y/n]: "
  read -r gpu_answer
  if [[ "$gpu_answer" != "n" && "$gpu_answer" != "N" ]]; then
    USE_GPU="true"
    ok "GPU Ollama enabled"
  fi
else
  info "No NVIDIA GPU detected — Ollama will use CPU mode"
fi
echo ""

# ─── Step 6: Generate .env ──────────────────────────────────────────────────
echo "${BOLD}Step 6/7: Generating .env file${NC}"
echo ""

ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  warn "Existing .env file found"
  ask "Overwrite? [y/N]: "
  read -r overwrite
  if [[ "$overwrite" != "y" && "$overwrite" != "Y" ]]; then
    info "Keeping existing .env — skipping generation"
    SKIP_ENV=true
  else
    SKIP_ENV=false
  fi
else
  SKIP_ENV=false
fi

if [ "$SKIP_ENV" != "true" ]; then
  cat > "$ENV_FILE" << ENVEOF
# =============================================================================
# Claw — Auto-generated Environment Configuration
# Generated on: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# =============================================================================

# --- General ---
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost

# --- Rate Limiting ---
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# =============================================================================
# PostgreSQL Credentials
# =============================================================================
PG_AUTH_USER=claw
PG_AUTH_PASSWORD=${DB_PASSWORD}
PG_AUTH_DB=claw_auth
PG_AUTH_PORT=5441

PG_CHAT_USER=claw
PG_CHAT_PASSWORD=${DB_PASSWORD}
PG_CHAT_DB=claw_chat
PG_CHAT_PORT=5442

PG_CONNECTOR_USER=claw
PG_CONNECTOR_PASSWORD=${DB_PASSWORD}
PG_CONNECTOR_DB=claw_connectors
PG_CONNECTOR_PORT=5443

PG_ROUTING_USER=claw
PG_ROUTING_PASSWORD=${DB_PASSWORD}
PG_ROUTING_DB=claw_routing
PG_ROUTING_PORT=5444

PG_MEMORY_USER=claw
PG_MEMORY_PASSWORD=${DB_PASSWORD}
PG_MEMORY_DB=claw_memory
PG_MEMORY_PORT=5445

PG_FILES_USER=claw
PG_FILES_PASSWORD=${DB_PASSWORD}
PG_FILES_DB=claw_files
PG_FILES_PORT=5446

PG_OLLAMA_USER=claw
PG_OLLAMA_PASSWORD=${DB_PASSWORD}
PG_OLLAMA_DB=claw_ollama
PG_OLLAMA_PORT=5447

PG_IMAGES_USER=claw
PG_IMAGES_PASSWORD=${DB_PASSWORD}
PG_IMAGES_DB=claw_images
PG_IMAGES_PORT=5448

PG_FILE_GENERATIONS_USER=claw
PG_FILE_GENERATIONS_PASSWORD=${DB_PASSWORD}
PG_FILE_GENERATIONS_DB=claw_file_generations
PG_FILE_GENERATIONS_PORT=5449

# =============================================================================
# MongoDB
# =============================================================================
MONGO_USER=claw
MONGO_PASSWORD=${MONGO_PASS}
MONGO_DB=claw_audit
MONGO_PORT=27018

# =============================================================================
# Redis
# =============================================================================
REDIS_URL=redis://redis:6379
REDIS_PORT=6380

# =============================================================================
# RabbitMQ
# =============================================================================
RABBITMQ_USER=claw
RABBITMQ_PASSWORD=${RABBIT_PASS}
RABBITMQ_URL=amqp://claw:${RABBIT_PASS}@rabbitmq:5672
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672

# =============================================================================
# JWT
# =============================================================================
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# =============================================================================
# Encryption (AES-256-GCM)
# =============================================================================
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# =============================================================================
# Admin Seed
# =============================================================================
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASS}

# =============================================================================
# Frontend
# =============================================================================
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=Claw
NEXT_PUBLIC_APP_URL=http://localhost:3000
FRONTEND_PORT=3000

# =============================================================================
# Ollama
# =============================================================================
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_ROUTER_MODEL=gemma3:4b
OLLAMA_ROUTER_TIMEOUT_MS=10000
MEMORY_EXTRACTION_MODEL=gemma3:4b

# =============================================================================
# File Service
# =============================================================================
FILE_STORAGE_PATH=/data/files

# =============================================================================
# Inter-Service URLs
# =============================================================================
OLLAMA_SERVICE_URL=http://ollama-service:4008
CONNECTOR_SERVICE_URL=http://connector-service:4003
AUTH_SERVICE_URL=http://auth-service:4001
CHAT_SERVICE_URL=http://chat-service:4002
ROUTING_SERVICE_URL=http://routing-service:4004
MEMORY_SERVICE_URL=http://memory-service:4005
FILE_SERVICE_URL=http://file-service:4006
AUDIT_SERVICE_URL=http://audit-service:4007
CLIENT_LOGS_SERVICE_URL=http://client-logs-service:4010
SERVER_LOGS_SERVICE_URL=http://server-logs-service:4011
IMAGE_SERVICE_URL=http://image-service:4012
FILE_GENERATION_SERVICE_URL=http://file-generation-service:4013

# =============================================================================
# Per-Service Ports
# =============================================================================
AUTH_PORT=4001
CHAT_PORT=4002
CONNECTOR_PORT=4003
ROUTING_PORT=4004
MEMORY_PORT=4005
FILES_PORT=4006
AUDIT_PORT=4007
OLLAMA_PORT=4008
HEALTH_PORT=4009
CLIENT_LOGS_PORT=4010
SERVER_LOGS_PORT=4011
IMAGE_PORT=4012
FILE_GENERATION_PORT=4013

# =============================================================================
# Per-Service Database URLs
# =============================================================================
AUTH_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-auth:5432/claw_auth?schema=public
CHAT_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-chat:5432/claw_chat?schema=public
CONNECTOR_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-connector:5432/claw_connectors?schema=public
ROUTING_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-routing:5432/claw_routing?schema=public
MEMORY_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-memory:5432/claw_memory?schema=public
FILES_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-files:5432/claw_files?schema=public
OLLAMA_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-ollama:5432/claw_ollama?schema=public
IMAGE_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-images:5432/claw_images?schema=public
FILE_GENERATION_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-file-generations:5432/claw_file_generations?schema=public

STABLE_DIFFUSION_URL=http://stable-diffusion:7860
COMFYUI_BASE_URL=http://comfyui:8188
COMFYUI_PORT=8188
AUTO_PULL_MODELS=tinyllama gemma3:4b gemma2:2b phi3:mini llama3.2:3b

AUDIT_MONGODB_URI=mongodb://claw:${MONGO_PASS}@mongodb:27017/claw_audit?authSource=admin
CLIENT_LOGS_MONGODB_URI=mongodb://claw:${MONGO_PASS}@mongodb:27017/claw_client_logs?authSource=admin
SERVER_LOGS_MONGODB_URI=mongodb://claw:${MONGO_PASS}@mongodb:27017/claw_server_logs?authSource=admin
ENVEOF

  ok ".env file generated"
fi
echo ""

# ─── Summary before launch ──────────────────────────────────────────────────
echo "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BOLD}  Configuration Summary${NC}"
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Frontend:          http://localhost:3000"
echo "  API Gateway:       http://localhost:4000"
echo "  RabbitMQ UI:       http://localhost:15672"
echo ""
echo "  Admin email:       ${ADMIN_EMAIL}"
echo "  Admin username:    ${ADMIN_USERNAME}"
echo "  Admin password:    ${ADMIN_PASS}"
echo ""
echo "  Ollama:            $([ "$ENABLE_OLLAMA" = "true" ] && echo "Enabled" || echo "Disabled") $([ "$USE_GPU" = "true" ] && echo "(GPU)" || echo "(CPU)")"
echo "  Containers:        ~22 (7 databases, 11 services, nginx, frontend, redis, rabbitmq, ollama)"
echo ""
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ask "Start Claw? [Y/n]: "
read -r start_answer
if [[ "$start_answer" == "n" || "$start_answer" == "N" ]]; then
  info "Aborted. Run 'docker compose -f docker-compose.dev.yml up -d' when ready."
  exit 0
fi
echo ""

# ─── Step 7: Launch ─────────────────────────────────────────────────────────
echo "${BOLD}Step 7/7: Starting Claw${NC}"
echo ""

info "Pulling Docker images (this may take a few minutes on first run)..."
docker compose -f docker-compose.dev.yml pull 2>/dev/null || true

info "Building and starting containers..."
docker compose -f docker-compose.dev.yml up -d --build 2>&1 | tail -5

echo ""
info "Waiting for services to become healthy..."

# Wait up to 180 seconds
MAX_WAIT=180
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
  HEALTHY=$(docker compose -f docker-compose.dev.yml ps --format json 2>/dev/null | grep -c '"healthy"' || echo "0")
  TOTAL=$(docker compose -f docker-compose.dev.yml ps --format json 2>/dev/null | grep -c '"running\|"healthy\|"starting"' || echo "0")

  printf "\r  ${BLUE}[%3ds]${NC} %s/%s containers healthy..." "$ELAPSED" "$HEALTHY" "$TOTAL"

  # Check if auth-service is healthy (key indicator — it depends on DB + runs seed)
  if docker compose -f docker-compose.dev.yml ps auth-service 2>/dev/null | grep -q "(healthy)"; then
    break
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo ""

# Final status
UNHEALTHY=$(docker compose -f docker-compose.dev.yml ps 2>/dev/null | grep -c "unhealthy" || echo "0")

if [ "$UNHEALTHY" -eq 0 ]; then
  echo "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${GREEN}${BOLD}  Claw is ready!${NC}"
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${YELLOW}${BOLD}  Claw started with $UNHEALTHY unhealthy container(s)${NC}"
  echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  warn "Check logs: docker compose -f docker-compose.dev.yml logs <service>"
fi

echo ""
echo "  ${BOLD}Open Claw:${NC}         http://localhost:3000"
echo "  ${BOLD}API Gateway:${NC}       http://localhost:4000"
echo "  ${BOLD}RabbitMQ UI:${NC}       http://localhost:15672  (claw / ${RABBIT_PASS})"
echo ""
echo "  ${BOLD}Admin login:${NC}"
echo "    Email:           ${ADMIN_EMAIL}"
echo "    Password:        ${ADMIN_PASS}"
echo ""
echo "  ${BOLD}Useful commands:${NC}"
echo "    ./scripts/claw.sh status        Check service status"
echo "    ./scripts/claw.sh logs <name>   Follow service logs"
echo "    ./scripts/claw.sh down          Stop everything"
echo ""
