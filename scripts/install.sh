#!/usr/bin/env bash
# =============================================================================
# Claw — Automated Install Script (Linux / macOS)
# =============================================================================
# Usage:
#   bash scripts/install.sh                          # interactive — asks dev/prod
#   bash scripts/install.sh --prod                   # force production stack
#   bash scripts/install.sh --dev                    # force development stack
#   CLAW_MODE=prod bash scripts/install.sh           # env-var equivalent
#   CLAW_MODE=dev  bash scripts/install.sh
# =============================================================================
set -euo pipefail

# ─── Mode selection (dev vs prod) ───────────────────────────────────────────
# Parse --dev / --prod from args; fall back to CLAW_MODE env var; default dev.
CLAW_MODE_ARG=""
DISABLE_GPU="false"
for arg in "$@"; do
  case "$arg" in
    --prod)   CLAW_MODE_ARG="prod" ;;
    --dev)    CLAW_MODE_ARG="dev"  ;;
    --no-gpu) DISABLE_GPU="true"   ;;
  esac
done
CLAW_MODE="${CLAW_MODE_ARG:-${CLAW_MODE:-}}"

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
ENV_FILE="$PROJECT_ROOT/.env"

# ─── Compose files (resolved AFTER mode prompt below) ───────────────────────
# Placeholders so later sections compile; actual values are set once we know
# whether the user picked dev or prod.
BASE_COMPOSE_FILES=""
NVIDIA_SERVICE_GPU_FILE=""
NVIDIA_OLLAMA_GPU_FILE=""
COMPOSE_FILES=""

# Picks dev vs prod compose files based on $CLAW_MODE. Called once we have
# the user's choice (interactive or via flag/env).
apply_mode_compose_paths() {
  if [ "$CLAW_MODE" = "prod" ]; then
    BASE_COMPOSE_FILES="-f docker/docker-compose.prod.databases.yml -f docker/docker-compose.prod.services.yml -f docker/docker-compose.prod.ollama.yml"
    NVIDIA_SERVICE_GPU_FILE="docker/docker-compose.prod.gpu-nvidia.yml"
    NVIDIA_OLLAMA_GPU_FILE="docker/docker-compose.prod.ollama.gpu-nvidia.yml"
  else
    BASE_COMPOSE_FILES="-f docker/docker-compose.dev.databases.yml -f docker/docker-compose.dev.services.yml -f docker/docker-compose.dev.ollama.yml"
    NVIDIA_SERVICE_GPU_FILE="docker/docker-compose.dev.gpu-nvidia.yml"
    NVIDIA_OLLAMA_GPU_FILE="docker/docker-compose.dev.ollama.gpu-nvidia.yml"
  fi
  COMPOSE_FILES="$BASE_COMPOSE_FILES"
}

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

get_env_value() {
  local key="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  awk -F= -v key="$key" '
    $1 == key {
      sub(/^[^=]*=/, "", $0)
      print
      exit
    }
  ' "$file"
}

detect_gpu() {
  local gpu_name=""
  local gpu_vendor=""
  local machine_os
  machine_os="$(uname -s 2>/dev/null || echo "")"

  if command -v nvidia-smi &>/dev/null; then
    gpu_name="$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 | tr -d '\r')"
    if [ -n "$gpu_name" ]; then
      echo "nvidia|$gpu_name"
      return 0
    fi
  fi

  if [ "$machine_os" = "Darwin" ] && command -v system_profiler &>/dev/null; then
    gpu_name="$(system_profiler SPDisplaysDataType 2>/dev/null | awk -F': ' '/Chipset Model|Model/ {print $2; exit}' | tr -d '\r')"
    if [ -n "$gpu_name" ]; then
      case "$gpu_name" in
        *NVIDIA*) gpu_vendor="nvidia" ;;
        *AMD*|*Radeon*) gpu_vendor="amd" ;;
        *Apple*) gpu_vendor="apple" ;;
        *Intel*) gpu_vendor="intel" ;;
        *) gpu_vendor="unknown" ;;
      esac
      echo "$gpu_vendor|$gpu_name"
      return 0
    fi
  fi

  if command -v lspci &>/dev/null; then
    gpu_name="$(lspci 2>/dev/null | awk '/VGA compatible controller|3D controller|Display controller/ {sub(/.*: /, "", $0); print; exit}' | tr -d '\r')"
    if [ -n "$gpu_name" ]; then
      case "$gpu_name" in
        *NVIDIA*) gpu_vendor="nvidia" ;;
        *AMD*|*Radeon*) gpu_vendor="amd" ;;
        *Apple*) gpu_vendor="apple" ;;
        *Intel*) gpu_vendor="intel" ;;
        *) gpu_vendor="unknown" ;;
      esac
      echo "$gpu_vendor|$gpu_name"
      return 0
    fi
  fi

  return 1
}

resolve_compose_tasks() {
  docker compose --env-file "$ENV_FILE" $COMPOSE_FILES config --format json 2>/dev/null | node -e '
const fs = require("fs");
const raw = fs.readFileSync(0, "utf8").trim();
if (!raw) process.exit(0);

const cfg = JSON.parse(raw);
const services = cfg.services || {};
const projectName = cfg.name || "clawai";
const downloads = [];
const builds = [];

for (const [name, svc] of Object.entries(services)) {
  if (svc && svc.image && !svc.build) {
    downloads.push({ name, detail: svc.image });
    continue;
  }

  if (svc && svc.build) {
    const build = svc.build;
    const context = typeof build === "string" ? build : (build.context || ".");
    const dockerfile = typeof build === "object" && build.dockerfile ? build.dockerfile : "Dockerfile";
    const image = svc.image || `${projectName}-${name}:latest`;
    builds.push({ name, detail: `context=${context} dockerfile=${dockerfile}`, image });
  }
}

for (const task of downloads) {
  console.log(`download|${task.name}|${task.detail}`);
}

for (const task of builds) {
  console.log(`build|${task.name}|${task.detail}|${task.image}`);
}
'
}

ensure_docker_network() {
  local network_name="claw-network"

  if docker network inspect "$network_name" >/dev/null 2>&1; then
    ok "Docker network $network_name already exists"
    return 0
  fi

  info "Creating Docker network $network_name"
  docker network create "$network_name" >/dev/null
  ok "Docker network $network_name created"
}

docker_image_exists() {
  local image_name="$1"
  [ -n "$image_name" ] && docker image inspect "$image_name" >/dev/null 2>&1
}

# ─── Step 1: Check prerequisites ────────────────────────────────────────────
echo "${BOLD}Step 1/9: Checking prerequisites${NC}"
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

# ─── Step 1b: Choose dev or prod ────────────────────────────────────────────
echo "${BOLD}Step 1b/9: Deployment mode${NC}"
echo ""
echo "  ${BOLD}dev${NC}   Source bind-mounts, hot reload, dev-friendly defaults."
echo "        Use when actively developing on this machine."
echo "  ${BOLD}prod${NC}  Standalone images, no source mounts, production Dockerfiles."
echo "        Use for VM / server / cloudflare-tunnel deployments."
echo ""

# Carry over the mode from .env on re-runs so the user doesn't have to type
# it again. If neither flag/env/.env provides a value, default to dev.
if [ -z "$CLAW_MODE" ] && [ -f "$ENV_FILE" ]; then
  CARRIED_NODE_ENV="$(get_env_value "NODE_ENV" "$ENV_FILE")"
  case "$CARRIED_NODE_ENV" in
    production)  CLAW_MODE="prod" ;;
    development) CLAW_MODE="dev"  ;;
  esac
fi

if [ -z "$CLAW_MODE" ]; then
  if [ -t 0 ]; then
    ask "Mode [dev/prod] (default: dev): "
    read -r MODE_INPUT
    MODE_INPUT="$(echo "${MODE_INPUT:-dev}" | tr '[:upper:]' '[:lower:]')"
    case "$MODE_INPUT" in
      prod|production) CLAW_MODE="prod" ;;
      dev|development|"") CLAW_MODE="dev" ;;
      *)
        fail "Unknown mode '$MODE_INPUT'. Expected 'dev' or 'prod'."
        exit 1
        ;;
    esac
  else
    CLAW_MODE="dev"  # non-interactive default
    info "Non-interactive run — defaulting to dev. Override with --prod or CLAW_MODE=prod."
  fi
fi

apply_mode_compose_paths

if [ "$CLAW_MODE" = "prod" ]; then
  NODE_ENV_VALUE="production"
  ok "Mode: ${BOLD}production${NC} (compose files: docker/docker-compose.prod.*.yml)"
else
  NODE_ENV_VALUE="development"
  ok "Mode: ${BOLD}development${NC} (compose files: docker/docker-compose.dev.*.yml)"
fi
export CLAW_MODE NODE_ENV_VALUE
echo ""

# ─── Step 2: Check port availability ────────────────────────────────────────
echo "${BOLD}Step 2/9: Checking port availability${NC}"
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

# ─── Step 2b: Hostname / public URL ─────────────────────────────────────────
echo "${BOLD}Step 2b/9: Hostname${NC}"
echo ""
echo "  The host your Claw instance will be reachable at from a browser."
echo "  Local install:   claw.local   (recommended — install-tls adds it to /etc/hosts)"
echo "  Server/VM:       claw.example.com, app.intranet, or a bare IP like 192.168.1.50"
echo ""

EXISTING_HOSTNAME=""
if [ -f "$ENV_FILE" ]; then
  EXISTING_HOSTNAME="$(get_env_value "CLAW_HOSTNAME" "$ENV_FILE")"
fi
DEFAULT_HOSTNAME="${CLAW_HOSTNAME:-${EXISTING_HOSTNAME:-claw.local}}"

if [ -t 0 ] && [ -z "${CLAW_HOSTNAME:-}" ]; then
  ask "Hostname [default: $DEFAULT_HOSTNAME]: "
  read -r CLAW_HOSTNAME_INPUT
  CLAW_HOSTNAME="${CLAW_HOSTNAME_INPUT:-$DEFAULT_HOSTNAME}"
else
  CLAW_HOSTNAME="${CLAW_HOSTNAME:-$DEFAULT_HOSTNAME}"
fi

# Basic sanity check — no spaces, no protocol prefix, non-empty
if [[ -z "$CLAW_HOSTNAME" || "$CLAW_HOSTNAME" =~ [[:space:]] || "$CLAW_HOSTNAME" =~ ^https?:// ]]; then
  fail "Invalid hostname '$CLAW_HOSTNAME'. Use a bare host (e.g. claw.local, app.example.com, or 10.0.0.5)."
  exit 1
fi

# Derived URLs (single source of truth — every other reference points back here)
CLAW_BASE_URL="https://${CLAW_HOSTNAME}"
CORS_ORIGINS_VALUE="https://${CLAW_HOSTNAME},https://${CLAW_HOSTNAME}:3000"
export CLAW_HOSTNAME

ok "Hostname: $CLAW_HOSTNAME"
ok "Base URL: $CLAW_BASE_URL"
echo ""

# ─── Step 2c: Volume-vs-env consistency check ───────────────────────────────
# Postgres / Mongo / RabbitMQ named volumes are initialised with the password
# in .env on FIRST start. On subsequent starts the container demands the SAME
# password — even if .env now contains a different one. This bites hard when:
#   - User wipes .env between attempts (re-runs install.sh) but keeps volumes
#   - User runs install.sh on a machine where a previous attempt left volumes
#   - User restored .env from a backup that doesn't match the volume data
# Symptom: every backend service crashes with `Authentication failed` on
# Mongo, `ACCESS-REFUSED PLAIN` on RabbitMQ, and `password authentication
# failed for user "claw"` on Postgres.
EXISTING_VOLUMES="$(docker volume ls -q 2>/dev/null | grep -E '^claw[_-]|claw-pg-|claw-mongo|claw-rabbit' || true)"
if [ ! -f "$ENV_FILE" ] && [ -n "$EXISTING_VOLUMES" ]; then
  echo ""
  fail "Found existing claw-* docker volumes from a previous install, but no .env file."
  echo ""
  echo "  The volumes hold the OLD credentials. If install.sh generates fresh ones,"
  echo "  every backend service will crash with Auth/ACCESS-REFUSED errors."
  echo ""
  echo "  Pick one:"
  echo "    A) Wipe the stale volumes and start fresh (DATA LOSS):"
  echo "         docker volume rm \$(docker volume ls -q | grep -E '^claw[_-]|claw-pg-|claw-mongo|claw-rabbit')"
  echo "    B) Restore the .env file from your previous install (it has the matching passwords)."
  echo ""
  if [ -t 0 ]; then
    ask "Wipe volumes and continue? (type WIPE to confirm, anything else aborts): "
    read -r WIPE_CONFIRM
    if [ "$WIPE_CONFIRM" = "WIPE" ]; then
      info "Stopping any running claw containers (waiting for full stop)..."
      docker ps -q --filter "name=claw-" | xargs -r docker stop --time 30 >/dev/null 2>&1 || true
      docker ps -aq --filter "name=claw-" | xargs -r docker rm -f -v >/dev/null 2>&1 || true
      # Wait for the docker daemon to release volume mounts (race condition:
      # `rm -f` returns before vfs unmount finishes on some hosts).
      sleep 2
      info "Removing stale volumes..."
      # Capture failures and retry once — `docker volume rm` rejects volumes
      # that are still attached, even after container rm. A second pass after
      # a short sleep catches the stragglers without continuing silently.
      FAILED_VOLUMES=""
      for vol in $EXISTING_VOLUMES; do
        if ! docker volume rm "$vol" >/dev/null 2>&1; then
          FAILED_VOLUMES="$FAILED_VOLUMES $vol"
        fi
      done
      if [ -n "$FAILED_VOLUMES" ]; then
        warn "First-pass volume removal left:$FAILED_VOLUMES — retrying after 5s"
        sleep 5
        for vol in $FAILED_VOLUMES; do
          docker rm -f "$(docker ps -aq --filter "volume=$vol")" >/dev/null 2>&1 || true
          if ! docker volume rm "$vol" >/dev/null 2>&1; then
            fail "Could not remove $vol. Run manually:"
            echo "    docker rm -f \$(docker ps -aq --filter 'volume=$vol')"
            echo "    docker volume rm $vol"
            exit 1
          fi
        done
      fi
      ok "Stale volumes removed — proceeding with fresh secrets"
    else
      fail "Aborted. Restore .env or wipe volumes manually, then re-run."
      exit 1
    fi
  else
    fail "Non-interactive run can't safely choose. Set CLAW_WIPE_VOLUMES=1 to wipe, or restore .env."
    if [ "${CLAW_WIPE_VOLUMES:-0}" != "1" ]; then exit 1; fi
    docker ps -q --filter "name=claw-" | xargs -r docker stop >/dev/null 2>&1 || true
    docker ps -aq --filter "name=claw-" | xargs -r docker rm -f >/dev/null 2>&1 || true
    echo "$EXISTING_VOLUMES" | xargs -r docker volume rm >/dev/null 2>&1 || true
    ok "Stale volumes removed (CLAW_WIPE_VOLUMES=1)"
  fi
  echo ""
fi

# ─── Step 3: Generate secrets ────────────────────────────────────────────────
echo "${BOLD}Step 3/9: Generating secrets${NC}"
echo ""

JWT_SECRET=$(gen_secret_b64)
ENCRYPTION_KEY=$(gen_secret_hex)
DB_PASSWORD=$(gen_password)
MONGO_PASS=$(gen_password)
RABBIT_PASS=$(gen_password)
ADMIN_PASS=$(gen_password)
INTER_SERVICE_AUTH_TOKEN=$(gen_secret_hex)
GITHUB_WEBHOOK_SECRET=$(gen_secret_hex)
GITLAB_WEBHOOK_SECRET=$(gen_secret_hex)
SLACK_SIGNING_SECRET=$(gen_secret_hex)
JIRA_WEBHOOK_SECRET=$(gen_secret_hex)
BITBUCKET_WEBHOOK_SECRET=$(gen_secret_hex)
FIGMA_WEBHOOK_SECRET=$(gen_secret_hex)

ok "JWT secret generated (${#JWT_SECRET} chars)"
ok "Encryption key generated (${#ENCRYPTION_KEY} hex chars)"
ok "Database passwords generated"
ok "Admin password generated"
ok "Inter-service auth token generated (${#INTER_SERVICE_AUTH_TOKEN} hex chars)"
ok "Workspace webhook secrets generated (6 providers)"

# ─── Preserve infrastructure secrets from an existing .env ───────────────────
# Postgres / Mongo named-volumes are initialised with the first password they
# ever see. If we generate fresh secrets on a re-run and overwrite .env, the
# data dirs keep the OLD password and every service crashes with
#   `password authentication failed for user "claw"`
# To avoid that footgun, we read the previous secrets (if .env exists) and
# REUSE them. The freshly-generated values above are kept only when there is
# no .env on disk yet, or when the user later explicitly chooses to wipe and
# regenerate. If the user wants new secrets they MUST also wipe the docker
# volumes (the script warns about this in Step 7).
if [ -f "$ENV_FILE" ]; then
  PREV_DB_PASSWORD="$(get_env_value "PG_AUTH_PASSWORD" "$ENV_FILE")"
  PREV_MONGO_PASS="$(get_env_value "MONGO_PASSWORD" "$ENV_FILE")"
  PREV_RABBIT_PASS="$(get_env_value "RABBITMQ_PASSWORD" "$ENV_FILE")"
  PREV_JWT_SECRET="$(get_env_value "JWT_SECRET" "$ENV_FILE")"
  PREV_ENCRYPTION_KEY="$(get_env_value "ENCRYPTION_KEY" "$ENV_FILE")"
  if [ -n "$PREV_DB_PASSWORD" ]; then
    DB_PASSWORD="$PREV_DB_PASSWORD"
    ok "Preserved PG_*_PASSWORD from existing .env (postgres volumes already use this)"
  fi
  if [ -n "$PREV_MONGO_PASS" ]; then
    MONGO_PASS="$PREV_MONGO_PASS"
    ok "Preserved MONGO_PASSWORD from existing .env"
  fi
  if [ -n "$PREV_RABBIT_PASS" ]; then
    RABBIT_PASS="$PREV_RABBIT_PASS"
    ok "Preserved RABBITMQ_PASSWORD from existing .env"
  fi
  if [ -n "$PREV_JWT_SECRET" ]; then
    JWT_SECRET="$PREV_JWT_SECRET"
    ok "Preserved JWT_SECRET from existing .env (invalidating it would log out every user)"
  fi
  if [ -n "$PREV_ENCRYPTION_KEY" ]; then
    ENCRYPTION_KEY="$PREV_ENCRYPTION_KEY"
    ok "Preserved ENCRYPTION_KEY from existing .env (changing it would invalidate stored connector secrets)"
  fi
fi
echo ""

# ─── Step 4: Admin configuration ────────────────────────────────────────────
echo "${BOLD}Step 4/9: Admin configuration${NC}"
echo ""

ADMIN_EMAIL="admin@claw.local"   # kept stable regardless of CLAW_HOSTNAME so admin login works on IP-hosted instances
ADMIN_USERNAME="claw-admin"
REUSE_EXISTING_ADMIN="false"
EXISTING_ADMIN_EMAIL=""
EXISTING_ADMIN_USERNAME=""
EXISTING_ADMIN_PASS=""

if [ -f "$ENV_FILE" ]; then
  EXISTING_ADMIN_EMAIL="$(get_env_value "ADMIN_EMAIL" "$ENV_FILE")"
  EXISTING_ADMIN_USERNAME="$(get_env_value "ADMIN_USERNAME" "$ENV_FILE")"
  EXISTING_ADMIN_PASS="$(get_env_value "ADMIN_PASSWORD" "$ENV_FILE")"
fi

if [ -n "$EXISTING_ADMIN_EMAIL" ] && [ -n "$EXISTING_ADMIN_USERNAME" ] && [ -n "$EXISTING_ADMIN_PASS" ]; then
  ask "Reuse admin credentials from the previous install? [Y/n]: "
  read -r reuse_admin
  if [[ "$reuse_admin" != "n" && "$reuse_admin" != "N" ]]; then
    REUSE_EXISTING_ADMIN="true"
    ADMIN_EMAIL="${EXISTING_ADMIN_EMAIL:-$ADMIN_EMAIL}"
    ADMIN_USERNAME="${EXISTING_ADMIN_USERNAME:-$ADMIN_USERNAME}"
    ADMIN_PASS="${EXISTING_ADMIN_PASS:-$ADMIN_PASS}"
    ok "Reusing admin credentials from existing .env"
  fi
fi

if [ "$REUSE_EXISTING_ADMIN" != "true" ]; then
  ask "Admin email [${ADMIN_EMAIL}]: "
  read -r input
  if [ -n "$input" ]; then ADMIN_EMAIL="$input"; fi

  ask "Admin username [${ADMIN_USERNAME}]: "
  read -r input
  if [ -n "$input" ]; then ADMIN_USERNAME="$input"; fi

  ask "Admin password [auto-generated]: "
  read -r input
  if [ -n "$input" ]; then ADMIN_PASS="$input"; fi
fi

echo ""

# ─── Step 5: GPU / Ollama detection ─────────────────────────────────────────
echo "${BOLD}Step 5/9: Ollama & GPU detection${NC}"
echo ""

USE_GPU="false"
ENABLE_OLLAMA="true"
GPU_STATUS="No supported GPU detected"

if GPU_INFO="$(detect_gpu)"; then
  GPU_VENDOR="${GPU_INFO%%|*}"
  GPU_NAME="${GPU_INFO#*|}"
  ok "GPU detected: $GPU_NAME"

  case "$GPU_VENDOR" in
    nvidia)
      # Auto-enable when an NVIDIA card is present + nvidia-container-toolkit
      # is installed. Asking Y/n here was a footgun — users hit Enter without
      # reading, got CPU mode silently, then wondered why llamacpp said
      # `linux-x64-cpu` and binary downloads tried to write 22 GB of weights
      # without GPU acceleration. Override with --no-gpu if you really want
      # CPU-only on a GPU host.
      if [ "$DISABLE_GPU" = "true" ]; then
        GPU_STATUS="NVIDIA GPU detected: $GPU_NAME (--no-gpu flag set; CPU mode)"
      elif docker info 2>/dev/null | grep -q "Runtimes:.*nvidia"; then
        USE_GPU="true"
        ok "NVIDIA GPU detected: $GPU_NAME — enabling CUDA passthrough"
        GPU_STATUS="NVIDIA GPU detected: $GPU_NAME (GPU mode enabled)"
      else
        warn "NVIDIA GPU detected but docker has no 'nvidia' runtime."
        warn "Install nvidia-container-toolkit and restart docker, then re-run install.sh."
        GPU_STATUS="NVIDIA GPU detected: $GPU_NAME (nvidia-container-toolkit missing; CPU mode)"
      fi
      ;;
    amd)
      warn "AMD/Radeon GPU detected: $GPU_NAME"
      info "This Docker-based Ollama install will stay in CPU mode unless you use a ROCm-enabled runtime."
      GPU_STATUS="AMD/Radeon GPU detected: $GPU_NAME (Docker CPU mode)"
      ;;
    apple)
      warn "Apple GPU detected: $GPU_NAME"
      info "This Docker-based Ollama install will stay in CPU mode on macOS unless you switch to a native Ollama host install."
      GPU_STATUS="Apple GPU detected: $GPU_NAME (Docker CPU mode)"
      ;;
    intel)
      info "Intel GPU detected: $GPU_NAME"
      info "This Docker-based Ollama install will use CPU mode."
      GPU_STATUS="Intel GPU detected: $GPU_NAME (Docker CPU mode)"
      ;;
    *)
      info "GPU detected: $GPU_NAME"
      info "This Docker-based Ollama install will use CPU mode."
      GPU_STATUS="GPU detected: $GPU_NAME (Docker CPU mode)"
      ;;
  esac
else
  info "No supported GPU detected — Ollama will use CPU mode"
fi

if [ "$USE_GPU" = "true" ]; then
  if [ -f "$NVIDIA_SERVICE_GPU_FILE" ] && [ -f "$NVIDIA_OLLAMA_GPU_FILE" ]; then
    COMPOSE_FILES="$BASE_COMPOSE_FILES -f $NVIDIA_SERVICE_GPU_FILE -f $NVIDIA_OLLAMA_GPU_FILE"
  else
    warn "NVIDIA GPU overlays are missing — continuing in CPU mode"
    USE_GPU="false"
    GPU_STATUS="NVIDIA GPU detected: $GPU_NAME (GPU overlays missing; CPU mode selected)"
  fi
fi
echo ""

# ─── Step 6: Local TLS / SSL certificates (forced — no prompt) ──────────────
echo "${BOLD}Step 6/9: Installing local TLS certificates${NC}"
echo ""

if [ -x "$SCRIPT_DIR/install-tls.sh" ]; then
  bash "$SCRIPT_DIR/install-tls.sh" || true   # don't propagate exit; we verify by file presence below
elif [ -f "$SCRIPT_DIR/install-tls.sh" ]; then
  warn "scripts/install-tls.sh is not executable — running with bash"
  bash "$SCRIPT_DIR/install-tls.sh" || true
else
  warn "scripts/install-tls.sh missing — skipping TLS setup"
fi

# Hard gate: nginx and every backend service expects certs/claw.crt at startup.
# If both mkcert (Tier 1) and the openssl-via-docker fallback (Tier 2) failed,
# bring-up will restart-loop with "cannot load certificate ... BIO_new_file()".
# Better to fail here with an actionable message than silently break compose.
if [ ! -f "$PROJECT_ROOT/certs/claw.crt" ] || [ ! -f "$PROJECT_ROOT/certs/claw.key" ]; then
  echo ""
  fail "TLS install did not produce certs/claw.crt + certs/claw.key."
  echo ""
  echo "  Without these, nginx restart-loops with"
  echo "    'cannot load certificate \"/etc/nginx/certs/claw.crt\"'"
  echo "  and every backend service falls back to HTTP, breaking the dev stack."
  echo ""
  echo "  Recovery (pick one):"
  echo "    1) Install mkcert and re-run: brew install mkcert  (mac)"
  echo "                                   apt install mkcert  (debian)"
  echo "       then re-run: bash scripts/install.sh"
  echo "    2) Generate self-signed certs via docker (needs Docker running):"
  echo "         bash scripts/install-tls.sh"
  echo "    3) See docs/08-runtime-devops/tls-setup.md for manual cert generation."
  echo ""
  exit 1
fi
ok "TLS certs present at certs/claw.crt"
echo ""

# ─── Step 7: Generate .env ──────────────────────────────────────────────────
echo "${BOLD}Step 7/9: Generating .env file${NC}"
echo ""

# Detect the dangerous scenario where .env is missing (so we generated fresh
# DB_PASSWORD this run) but Postgres named-volumes from a previous install
# still exist — those volumes were initialised with the OLD password and will
# reject every service connection. Offer to wipe them so the new secrets stick.
if [ ! -f "$ENV_FILE" ] && command -v docker >/dev/null 2>&1; then
  STALE_VOLUMES="$(docker volume ls --format '{{.Name}}' 2>/dev/null | grep -E '^claw_pg-|^claw_mongo|^claw_rabbitmq' || true)"
  if [ -n "$STALE_VOLUMES" ]; then
    warn "Detected $(echo "$STALE_VOLUMES" | wc -l | tr -d ' ') existing data volume(s) from a previous install:"
    while IFS= read -r v; do echo "    - $v"; done <<<"$STALE_VOLUMES"
    warn "Your .env is missing, so fresh secrets were just generated. Those secrets"
    warn "will NOT match the passwords baked into the volumes above. Every service"
    warn "will fail with 'password authentication failed for user \"claw\"'."
    ask "Wipe these volumes so the new secrets work? Type 'WIPE' to confirm: "
    read -r confirm_wipe
    if [ "$confirm_wipe" = "WIPE" ]; then
      while IFS= read -r v; do
        docker volume rm "$v" >/dev/null 2>&1 && ok "Removed $v" || warn "Could not remove $v (still in use?)"
      done <<<"$STALE_VOLUMES"
    else
      warn "Volumes kept. Restore the prior .env (or its DB_PASSWORD) before continuing"
      warn "or re-run with 'WIPE' to clear the data."
    fi
  fi
fi

SKIP_ENV=false

if [ -f "$ENV_FILE" ]; then
  if [ "$REUSE_EXISTING_ADMIN" = "true" ]; then
    info "Keeping existing .env and reusing the previous admin credentials"
    SKIP_ENV=true
  else
    warn "Existing .env file found"
    info "Note: infrastructure secrets (DB / Mongo / RabbitMQ / JWT / ENCRYPTION_KEY)"
    info "      are PRESERVED from the existing .env regardless of your answer below"
    info "      so docker volumes keep working. Only admin/hostname/webhook secrets"
    info "      are rewritten on overwrite."
    ask "Overwrite it with the recreated credentials? [y/N]: "
    read -r overwrite
    if [[ "$overwrite" != "y" && "$overwrite" != "Y" ]]; then
      info "Keeping existing .env — skipping generation"
      if [ -n "$EXISTING_ADMIN_EMAIL" ]; then ADMIN_EMAIL="$EXISTING_ADMIN_EMAIL"; fi
      if [ -n "$EXISTING_ADMIN_USERNAME" ]; then ADMIN_USERNAME="$EXISTING_ADMIN_USERNAME"; fi
      if [ -n "$EXISTING_ADMIN_PASS" ]; then ADMIN_PASS="$EXISTING_ADMIN_PASS"; fi
      SKIP_ENV=true
    fi
  fi
fi

if [ "$SKIP_ENV" != "true" ]; then
  cat > "$ENV_FILE" << ENVEOF
# =============================================================================
# Claw — Auto-generated Environment Configuration
# Generated on: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# =============================================================================

# --- General ---
NODE_ENV=${NODE_ENV_VALUE}

# --- Hostname / Public URL (single source of truth) ---
# Change CLAW_HOSTNAME and re-run scripts/install-tls.sh to reissue the TLS cert.
CLAW_HOSTNAME=${CLAW_HOSTNAME}
CORS_ORIGINS=${CORS_ORIGINS_VALUE}

# --- TLS / SSL (mkcert-managed — see scripts/install-tls.sh) ---
# Containers always look here. The leaf cert + private key + root CA are
# regenerated by install-tls.sh and bind-mounted via docker compose.
HTTPS_CERT_PATH=/certs/claw.crt
HTTPS_KEY_PATH=/certs/claw.key
NODE_EXTRA_CA_CERTS=/certs/rootCA.pem

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

PG_WORKSPACE_USER=claw
PG_WORKSPACE_PASSWORD=${DB_PASSWORD}
PG_WORKSPACE_DB=claw_workspace
PG_WORKSPACE_PORT=5450

PG_AGENT_USER=claw
PG_AGENT_PASSWORD=${DB_PASSWORD}
PG_AGENT_DB=claw_agent
PG_AGENT_PORT=5451

PG_RESEARCH_USER=claw
PG_RESEARCH_PASSWORD=${DB_PASSWORD}
PG_RESEARCH_DB=claw_research
PG_RESEARCH_PORT=5452

PG_LLAMACPP_USER=claw
PG_LLAMACPP_PASSWORD=${DB_PASSWORD}
PG_LLAMACPP_DB=claw_llamacpp
PG_LLAMACPP_PORT=5440

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
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=Claw
NEXT_PUBLIC_APP_URL=${CLAW_BASE_URL}
# Phase 8 UI transparency — dev-only Thread Context Inspector toggle.
NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=false
FRONTEND_PORT=3000

# =============================================================================
# Ollama
# =============================================================================
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_ROUTER_MODEL=qwen3:1.7b
OLLAMA_ROUTER_TIMEOUT_MS=10000
ROUTER_COMPACT_PROMPT=true
OLLAMA_GENERATE_TIMEOUT_MS=300000
OLLAMA_KEEP_ALIVE=-1m
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_NUM_PARALLEL=1
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
MEMORY_EXTRACTION_MODEL=AUTO

# --- Local-only vision attachment policy (Slice B) ---
# When LOCAL_ONLY/PRIVACY_FIRST routing has no vision-capable local model
# (llava, bakllava, moondream, minicpm-v, llama3.2-vision, *-vision,
# *-multimodal), image attachments are dropped and the user is warned via
# chat.localOnly.imagesDropped. Flip to true to forward images anyway.
ALLOW_LOCAL_ONLY_ATTACHMENTS_WITHOUT_VISION=false
LOCAL_VISION_MODEL_DETECTION_TIMEOUT_MS=3000

# =============================================================================
# Memory + Context V2 Flagship
# =============================================================================
MEMORY_V2_ENABLED=true
CONTEXT_V2_ENABLED=true
RETRIEVAL_V2_ENABLED=true
MEMORY_SENSITIVITY_MODEL=gemma3:4b
MEMORY_EMBEDDING_MODEL=nomic-embed-text
CONTEXT_EMBEDDING_MODEL=nomic-embed-text
CONTEXT_COMPRESSION_MODEL=gemma3:4b
MEMORY_AUTO_APPROVE_DEFAULT=0.85
MEMORY_RETENTION_SWEEP_INTERVAL_MS=3600000
MEMORY_SUGGESTION_TTL_DAYS=30
CONTEXT_VERSION_RETENTION_COUNT=20
CONTEXT_TOKEN_ESTIMATOR_MODE=char/4
RETRIEVAL_MEMORY_SEMANTIC_BUDGET=5
RETRIEVAL_CONTEXT_SEMANTIC_BUDGET=12
RETRIEVAL_TOKEN_GUARD_PCT=0.4

# =============================================================================
# File Service
# =============================================================================
FILE_STORAGE_PATH=/data/files

# --- File retention (Slice C foundation 3) ---
FILE_RETENTION_DAYS=30
FILE_RETENTION_SWEEP_CRON='0 2 * * *'
FILE_RETENTION_SWEEP_BATCH_LIMIT=100

# --- ZIP archive expansion guardrails (Slice C foundation 3) ---
ZIP_MAX_EXTRACTED_SIZE_MB=500
ZIP_MAX_ENTRY_COUNT=10000
ZIP_MAX_NESTING_DEPTH=5
ZIP_COMPRESSION_RATIO_THRESHOLD=1000
ZIP_TEMP_EXTRACTION_PATH=/tmp/claw-zip-extraction

# --- Compare/Judge/Critic file attachments (Slice D foundation 3) ---
# Anthropic native PDF + Gemini Files API + OCR pipeline. All flags default
# OFF / safe-mode so deployments opt-in. See docs/03-architecture/compare-file-attachments.md.
ENABLE_ANTHROPIC_NATIVE_PDF=false

ENABLE_GEMINI_FILES_API=false
GEMINI_FILES_API_SIZE_THRESHOLD_BYTES=20000000
GEMINI_FILES_API_TIMEOUT_MS=60000
GEMINI_FILES_API_CACHE_ENABLED=true
GEMINI_FILES_API_TTL_MINUTES=1440
GEMINI_CONCURRENT_UPLOADS_LIMIT=3

OCR_ENABLED=false
OCR_TIMEOUT_MS=30000
OCR_CONFIDENCE_MIN=0.5
OCR_LANGUAGE=eng
OCR_WORKER_THREADS=2
SCANNED_PDF_CHAR_THRESHOLD=100

# =============================================================================
# Inter-Service URLs
# =============================================================================
# All inter-service hops go over HTTPS — node trusts the mkcert root CA
# via NODE_EXTRA_CA_CERTS (set above). Ports unchanged.
OLLAMA_SERVICE_URL=https://ollama-service:4008
CONNECTOR_SERVICE_URL=https://connector-service:4003
AUTH_SERVICE_URL=https://auth-service:4001
CHAT_SERVICE_URL=https://chat-service:4002
ROUTING_SERVICE_URL=https://routing-service:4004
MEMORY_SERVICE_URL=https://memory-service:4005
FILE_SERVICE_URL=https://file-service:4006
AUDIT_SERVICE_URL=https://audit-service:4007
CLIENT_LOGS_SERVICE_URL=https://client-logs-service:4010
SERVER_LOGS_SERVICE_URL=https://server-logs-service:4011
IMAGE_SERVICE_URL=https://image-service:4012
FILE_GENERATION_SERVICE_URL=https://file-generation-service:4013
WORKSPACE_SERVICE_URL=https://workspace-service:4014
AGENT_SERVICE_URL=https://agent-service:4015
RESEARCH_SERVICE_URL=https://research-service:4016
LLAMACPP_SERVICE_URL=https://llamacpp-service:4017

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
WORKSPACE_PORT=4014
AGENT_PORT=4015
RESEARCH_PORT=4016
LLAMACPP_PORT=4017

# Workspace scheduled sync (Stream 01 Phase 5)
WORKSPACE_SCHEDULER_ENABLED=true
WORKSPACE_SCHEDULER_TICK_CRON=*/30 * * * * *
WORKSPACE_SYNC_STALE_DETECTOR_CRON=*/60 * * * * *
WORKSPACE_SYNC_STALE_MULTIPLIER=3
WORKSPACE_SYNC_DEFAULT_INTERVAL_SECONDS=600
WORKSPACE_SYNC_MAX_CONCURRENT_GLOBAL=20
WORKSPACE_SYNC_MAX_CONCURRENT_PER_PROVIDER=5
WORKSPACE_SYNC_MAX_CONCURRENT_PER_CONNECTOR=1
WORKSPACE_SYNC_RETRY_MAX_ATTEMPTS=3
WORKSPACE_SYNC_RETRY_BASE_MS=1000
WORKSPACE_SYNC_RETRY_JITTER_MS=500
WORKSPACE_SYNC_DLQ_ROUTING_PREFIX=workspace.sync.dlq

# Desktop Agent auth (Phase A)
AGENT_ACCESS_TTL_SECONDS=900
AGENT_REFRESH_TTL_DAYS=30
AGENT_PAIRING_TTL_SECONDS=120
AGENT_DEVICE_CODE_TTL_SECONDS=900
AGENT_REFRESH_GRACE_SECONDS=15

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Workspace webhook signing secrets (per provider). Used to verify inbound
# webhook payloads — auto-generated above; rotate via UI or by re-running
# scripts/install.sh.
GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
GITLAB_WEBHOOK_SECRET=${GITLAB_WEBHOOK_SECRET}
SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
JIRA_WEBHOOK_SECRET=${JIRA_WEBHOOK_SECRET}
BITBUCKET_WEBHOOK_SECRET=${BITBUCKET_WEBHOOK_SECRET}
FIGMA_WEBHOOK_SECRET=${FIGMA_WEBHOOK_SECRET}

# Stream 22 — service-to-service auth (file-service /upload-internal + /download-internal)
INTER_SERVICE_AUTH_TOKEN=${INTER_SERVICE_AUTH_TOKEN}

# Stream 22 — Gmail HTML rendering + attachments
WORKSPACE_GMAIL_FETCH_ATTACHMENTS=true
WORKSPACE_GMAIL_MAX_ATTACHMENT_BYTES=26214400

# Desktop Agent capability framework (Stream 10 + V2 Stream 01 closeout)
# CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE controls whether
# CommandRiskService also calls CapabilityRiskService for the
# terminal-command soak window. Default-on while the divergence-count
# (GET /api/v1/agent/capability/dual-write-status) is non-zero; flip to
# `false` once the divergence rate has been zero for 7 consecutive days.
# See docs/15-ai-context/desktop-agent-dual-write-retirement.md for the
# retirement plan and post-flip rollback instructions.
CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE=true

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
WORKSPACE_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-workspace:5432/claw_workspace?schema=public
AGENT_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-agent:5432/claw_agent?schema=public
RESEARCH_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-research:5432/claw_research?schema=public
LLAMACPP_DATABASE_URL=postgresql://claw:${DB_PASSWORD}@pg-llamacpp:5432/claw_llamacpp?schema=public

# claw-llamacpp-service (Local Frontier LLM runtime)
# Path matches the `llamacpp-data` Docker named volume so binary + weights
# survive container rebuilds across Linux/macOS/Windows hosts.
LLAMACPP_DATA_PATH=/var/lib/claw/llamacpp
# Auto-updated by BinaryInstallerManager when GitHub API is reachable; the
# pinned fallback below is the version live-tested in 2026-05-09 QA.
LLAMACPP_BINARY_VERSION=b9095
LLAMACPP_GPU_BACKEND=auto
LLAMACPP_DEFAULT_CTX_SIZE=8192
LLAMACPP_AUTO_INSTALL_BINARY=true
LLAMACPP_FORCE_PINNED_BINARY=false
LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED=true
LLAMACPP_LOAD_TIMEOUT_MS=600000
LLAMACPP_BIND_HOST=127.0.0.1
LLAMACPP_PROCESS_PORT_MIN=48500
LLAMACPP_PROCESS_PORT_MAX=48999
HUGGINGFACE_TOKEN=
HUGGINGFACE_API_BASE=https://huggingface.co

STABLE_DIFFUSION_URL=http://stable-diffusion:7860
COMFYUI_BASE_URL=http://comfyui:8188
COMFYUI_PORT=8188
COMFYUI_MODELS_PATH=/var/lib/claw/comfyui-models
AUTO_PULL_MODELS=qwen3:1.7b

DISCOVERY_AUTO_REFRESH_ENABLED=true
DISCOVERY_MAX_RESULTS_PER_SOURCE=50
DISCOVERY_AUTO_APPROVE_CONFIDENCE=0.85

CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_ENABLED=true

# Workspace AI Actions — dynamic model resolution
# Model selection is dynamic — resolved at runtime from connected connectors
# (claw-connector-service) and installed Ollama models (claw-ollama-service).
# DO NOT pin a specific local model here; the system resolves the best
# available model per action kind based on what's actually present.
AI_ACTION_REQUEST_TIMEOUT_MS=300000
AI_ACTION_MODEL_RESOLVER_TTL_SECONDS=300

# Workspace AI Action Approval Engine (Stream 10)
AI_ACTION_QUEUE_EXPIRY_HOURS=24
AI_ACTION_RISK_AUTO_APPROVE_MAX=30
AI_ACTION_QUEUE_EXPIRY_SWEEP_CRON=0 */15 * * * *
AI_ACTION_QUEUE_EXPIRY_BATCH_LIMIT=100

# Workspace runtime gates (Phase E close-out, 2026-05-02)
WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR=100
WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE=60
AUTO_SUGGEST_INBOX_REPLY_CRON=0 */15 * * * *
AUTO_SUGGEST_INBOX_REPLY_LOOKBACK_HOURS=48

# =============================================================================
# Semantic Router Flagship — phased rollout flags
# See docs/03-architecture/semantic-router-flagship-plan.md
# Defaults preserve the current v1 hot path; flip to advance a phase.
# =============================================================================
# Phase 2 — Semantic Intent Analyzer
ROUTING_SEMANTIC_ANALYZER_ENABLED=false
ROUTING_SEMANTIC_ANALYZER_USE_FOR_ROUTING=false
# Phase 4 — AI Route Planner
ROUTING_AI_ROUTE_PLANNER_ENABLED=false
ROUTING_AI_ROUTE_PLANNER_USE_FOR_ROUTING=false
ROUTING_V2_CANARY_PERCENT=0
# Phase 1 — Thread Context + Follow-up detection (on by default)
ROUTING_THREAD_CONTEXT_INJECTION_ENABLED=true
ROUTING_FOLLOW_UP_DETECTION_ENABLED=true
# Phase 5 — Formal 3-attempt Fallback Executor
ROUTING_FALLBACK_ATTEMPTS_ENABLED=false
ROUTING_MAX_FALLBACK_ATTEMPTS=3
# Phase 7 — Auto-judge for high-risk routes
ROUTING_JUDGE_HIGH_RISK_ENABLED=false
# Phase 9 — Learning loop integrated into scoring (live learnedSuccess)
ROUTING_LEARNING_LOOP_INTEGRATED_ENABLED=false
# Phase 8 — Dev-only context inspector panel
ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=false

AUDIT_MONGODB_URI=mongodb://claw:${MONGO_PASS}@mongodb:27017/claw_audit?authSource=admin
CLIENT_LOGS_MONGODB_URI=mongodb://claw:${MONGO_PASS}@mongodb:27017/claw_client_logs?authSource=admin
SERVER_LOGS_MONGODB_URI=mongodb://claw:${MONGO_PASS}@mongodb:27017/claw_server_logs?authSource=admin

# =============================================================================
# Desktop Agent — native capability tooling (populated by install-agent-tooling)
# =============================================================================
# Set automatically by scripts/install-agent-tooling.{sh,ps1} when the binaries
# are downloaded. Leave blank to use whatever's on PATH.
#   AUDIO.TRANSCRIBE — whisper.cpp + ggml model
WHISPER_CLI_PATH=
WHISPER_MODEL_PATH=
#   AUDIO.SYNTHESIZE — Piper binary
PIPER_BIN_PATH=
#   SCREEN.OCR — tesseract is auto-detected on PATH; override here if needed
TESSERACT_BIN_PATH=
ENVEOF

  ok ".env file generated"
fi
echo ""

# ─── Summary before launch ──────────────────────────────────────────────────
echo "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BOLD}  Configuration Summary${NC}"
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Mode:              ${CLAW_MODE} (${NODE_ENV_VALUE})"
echo "  Hostname:          ${CLAW_HOSTNAME}"
echo "  Frontend:          ${CLAW_BASE_URL}"
echo "  API Gateway:       ${CLAW_BASE_URL}"
echo "  RabbitMQ UI:       http://localhost:15672"
echo ""
echo "  Admin email:       ${ADMIN_EMAIL}"
echo "  Admin username:    ${ADMIN_USERNAME}"
echo "  Admin password:    stored in .env"
echo "  GPU:               ${GPU_STATUS}"
echo ""
echo "  Ollama:            $([ "$ENABLE_OLLAMA" = "true" ] && echo "Enabled" || echo "Disabled") $([ "$USE_GPU" = "true" ] && echo "(GPU)" || echo "(CPU)")"
echo "  Containers:        ~22 (7 databases, 11 services, nginx, frontend, redis, rabbitmq, ollama)"
echo ""
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ask "Start Claw? [Y/n]: "
read -r start_answer
if [[ "$start_answer" == "n" || "$start_answer" == "N" ]]; then
  info "Aborted. Run 'docker compose --env-file "$ENV_FILE" $COMPOSE_FILES up -d' when ready."
  exit 0
fi
echo ""

# ─── Step 7: Desktop-agent native tooling (optional) ────────────────────────
echo "${BOLD}Step 8/9: Desktop-agent native tooling${NC}"
echo ""
info "The desktop agent uses native binaries for OCR / STT / TTS / browser / GUI automation."
info "This step installs: Tesseract, ffmpeg, whisper-cli + base.en model, Piper, Playwright Chromium, Rust + Tauri CLI."
info "It is idempotent — components already present are skipped."
echo ""
ask "Install desktop-agent native tooling now? [Y/n]: "
read -r tooling_answer
if [[ "$tooling_answer" != "n" && "$tooling_answer" != "N" ]]; then
  if [ -x "$SCRIPT_DIR/install-agent-tooling.sh" ]; then
    bash "$SCRIPT_DIR/install-agent-tooling.sh" || warn "Some agent-tooling components failed; rerun scripts/install-agent-tooling.sh later."
  else
    warn "scripts/install-agent-tooling.sh not found or not executable"
  fi

  # Append any env hints produced by the tooling installer (WHISPER_MODEL_PATH / PIPER_BIN_PATH)
  if [ -s "$PROJECT_ROOT/.env.agent-tooling" ]; then
    info "Merging tooling env hints into .env"
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      key="${line%%=*}"
      if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        # Replace existing line
        if [[ "$(uname -s)" == "Darwin" ]]; then
          sed -i '' "s|^${key}=.*|${line}|" "$ENV_FILE"
        else
          sed -i "s|^${key}=.*|${line}|" "$ENV_FILE"
        fi
      else
        echo "$line" >> "$ENV_FILE"
      fi
    done < "$PROJECT_ROOT/.env.agent-tooling"
  fi
else
  info "Skipped. You can run scripts/install-agent-tooling.sh anytime."
fi
echo ""

# ─── Step 8: Launch ─────────────────────────────────────────────────────────
echo "${BOLD}Step 9/9: Starting Claw${NC}"
echo ""

ensure_docker_network

info "Fetching Docker progress plan..."
COMPOSE_TASKS=()
if COMPOSE_TASKS_RAW="$(resolve_compose_tasks)"; then
  while IFS= read -r task_line; do
    [ -n "$task_line" ] && COMPOSE_TASKS+=("$task_line")
  done <<< "$COMPOSE_TASKS_RAW"
fi

TOTAL_TASKS=${#COMPOSE_TASKS[@]}

if [ "$TOTAL_TASKS" -gt 0 ]; then
  # Two-phase plan: collect all download / build / cached tasks, then run a
  # SINGLE `docker compose pull` and a SINGLE `docker compose build` so Compose
  # parallelises across services (default behaviour since v2). The old
  # one-service-at-a-time loop serialised work that Compose was happy to do
  # concurrently.
  DOWNLOAD_NAMES=()
  DOWNLOAD_DETAILS=()
  BUILD_NAMES=()
  BUILD_DETAILS=()
  CACHED_NAMES=()
  CACHED_IMAGES=()

  for TASK in "${COMPOSE_TASKS[@]}"; do
    IFS='|' read -r TASK_PHASE TASK_NAME TASK_DETAIL TASK_IMAGE <<< "$TASK"
    if [ "$TASK_PHASE" = "download" ]; then
      DOWNLOAD_NAMES+=("$TASK_NAME")
      DOWNLOAD_DETAILS+=("$TASK_NAME ($TASK_DETAIL)")
    else
      if docker_image_exists "$TASK_IMAGE"; then
        CACHED_NAMES+=("$TASK_NAME")
        CACHED_IMAGES+=("$TASK_NAME ($TASK_IMAGE)")
      else
        BUILD_NAMES+=("$TASK_NAME")
        BUILD_DETAILS+=("$TASK_NAME ($TASK_DETAIL)")
      fi
    fi
  done

  DOWNLOAD_COUNT=${#DOWNLOAD_NAMES[@]}
  BUILD_COUNT=${#BUILD_NAMES[@]}
  CACHED_BUILD_COUNT=${#CACHED_NAMES[@]}

  info "Docker plan: $DOWNLOAD_COUNT pull, $BUILD_COUNT build, $CACHED_BUILD_COUNT cached"

  if [ "$DOWNLOAD_COUNT" -gt 0 ]; then
    info "[10%] Pulling $DOWNLOAD_COUNT image(s) in parallel:"
    for entry in "${DOWNLOAD_DETAILS[@]}"; do
      info "  - $entry"
    done
    docker compose --env-file "$ENV_FILE" $COMPOSE_FILES pull "${DOWNLOAD_NAMES[@]}"
  fi

  if [ "$CACHED_BUILD_COUNT" -gt 0 ]; then
    info "[40%] Reusing $CACHED_BUILD_COUNT cached image(s):"
    for entry in "${CACHED_IMAGES[@]}"; do
      info "  - $entry"
    done
  fi

  if [ "$BUILD_COUNT" -gt 0 ]; then
    info "[50%] Building $BUILD_COUNT service(s) in parallel:"
    for entry in "${BUILD_DETAILS[@]}"; do
      info "  - $entry"
    done
    # Docker Compose v2 builds services concurrently when given multiple names.
    # `--progress plain` keeps per-service log lines visible while they run.
    docker compose --env-file "$ENV_FILE" $COMPOSE_FILES build --progress plain "${BUILD_NAMES[@]}"
  fi

  ok "Docker progress plan: $DOWNLOAD_COUNT downloads, $BUILD_COUNT builds, $CACHED_BUILD_COUNT cached builds"
else
  warn "Could not resolve Docker progress plan; falling back to the legacy startup path"
  info "Pulling Docker images (this may take a few minutes on first run)..."
  docker compose --env-file "$ENV_FILE" $COMPOSE_FILES pull --ignore-pull-failures
  info "Building any service images that aren't on the registry..."
  docker compose --env-file "$ENV_FILE" $COMPOSE_FILES build
  info "Starting containers..."
  docker compose --env-file "$ENV_FILE" $COMPOSE_FILES up -d
fi

# Final reconcile pass. DO NOT pass --no-build here: in prod mode every
# backend service is `build:`-only (no image in any registry) and if the
# earlier build step skipped one for any reason, --no-build hard-fails with
# "No such image: claw-<svc>:latest" before any container starts.
info "[90%] Finalizing containers..."
docker compose --env-file "$ENV_FILE" $COMPOSE_FILES up -d

echo ""
info "Waiting for services to become healthy..."

# Wait up to 180 seconds
MAX_WAIT=180
ELAPSED=0
INTERVAL=5
TOTAL_SERVICES=$(docker compose --env-file "$ENV_FILE" $COMPOSE_FILES config --services 2>/dev/null | awk 'END {print NR+0}')

while [ $ELAPSED -lt $MAX_WAIT ]; do
  HEALTHY=$(docker compose --env-file "$ENV_FILE" $COMPOSE_FILES ps 2>/dev/null | grep -c "(healthy)" || echo "0")
  PROGRESS=$((90 + (ELAPSED * 10 / MAX_WAIT)))
  if [ "$PROGRESS" -gt 99 ]; then
    PROGRESS=99
  fi

  info "[$PROGRESS%] Finalizing containers: $HEALTHY/$TOTAL_SERVICES healthy"

  # Check if auth-service is healthy (key indicator — it depends on DB + runs seed)
  if docker compose --env-file "$ENV_FILE" $COMPOSE_FILES ps auth-service 2>/dev/null | grep -q "(healthy)"; then
    break
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

info "[100%] Finalizing containers: complete"
echo ""
echo ""

# Final status
UNHEALTHY=$(docker compose --env-file "$ENV_FILE" $COMPOSE_FILES ps 2>/dev/null | grep -c "unhealthy" || echo "0")

if [ "$UNHEALTHY" -eq 0 ]; then
  echo "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${GREEN}${BOLD}  Claw is ready!${NC}"
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${YELLOW}${BOLD}  Claw started with $UNHEALTHY unhealthy container(s)${NC}"
  echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  warn "Check logs: docker compose --env-file "$ENV_FILE" $COMPOSE_FILES logs <service>"
fi

echo ""
echo "  ${BOLD}Open Claw:${NC}         ${CLAW_BASE_URL}"
echo "  ${BOLD}API Gateway:${NC}       ${CLAW_BASE_URL}"
echo "  ${BOLD}RabbitMQ UI:${NC}       http://localhost:15672  (claw / ${RABBIT_PASS})"
echo ""
echo "  ${BOLD}Admin login:${NC}"
echo "    Email:           ${ADMIN_EMAIL}"
echo "    Password:        ${ADMIN_PASS}"
echo ""
# Show mode-aware claw.sh commands so users don't accidentally invoke the
# default dev mode against a production install.
CLAW_FLAG=""
if [ "$CLAW_MODE" = "prod" ]; then CLAW_FLAG=" --prod"; fi
echo "  ${BOLD}Useful commands:${NC}"
echo "    ./scripts/claw.sh${CLAW_FLAG} status        Check service status"
echo "    ./scripts/claw.sh${CLAW_FLAG} logs <name>   Follow service logs"
echo "    ./scripts/claw.sh${CLAW_FLAG} down          Stop everything"
echo ""
