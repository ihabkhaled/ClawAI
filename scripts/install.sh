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
#
# Resuming:
#   The installer records every completed step and every answer you gave in
#   .claw-install.state. Re-running it RESUMES: finished steps are skipped and
#   answered questions are not asked again. This matters most over SSH, where a
#   dropped session used to mean starting the whole interview from scratch.
#
#   bash scripts/install.sh --resume                 # explicit; also the default
#   bash scripts/install.sh --reconfigure            # ask the questions again, keep finished work
#   bash scripts/install.sh --fresh                  # forget all state and start over
#   bash scripts/install.sh --yes                    # never prompt; use saved answers/defaults
#   bash scripts/install.sh --status                 # print what is done and exit
# =============================================================================
set -euo pipefail

# ─── Mode selection (dev vs prod) ───────────────────────────────────────────
# Parse --dev / --prod from args; fall back to CLAW_MODE env var; default dev.
CLAW_MODE_ARG=""
DISABLE_GPU="false"
LOCAL_AI_ARG=""   # "", "true", or "false" — empty means "ask"
FRESH_INSTALL="false"
RECONFIGURE="false"
ASSUME_YES="false"
STATUS_ONLY="false"
for arg in "$@"; do
  case "$arg" in
    --prod)        CLAW_MODE_ARG="prod" ;;
    --dev)         CLAW_MODE_ARG="dev"  ;;
    --no-gpu)      DISABLE_GPU="true"   ;;
    --local-ai)    LOCAL_AI_ARG="true"  ;;
    --no-local-ai) LOCAL_AI_ARG="false" ;;
    --fresh)       FRESH_INSTALL="true" ;;
    --reconfigure) RECONFIGURE="true"   ;;
    --resume)      FRESH_INSTALL="false" ;;
    --yes|-y)      ASSUME_YES="true"    ;;
    --status)      STATUS_ONLY="true"   ;;
  esac
done
CLAW_MODE="${CLAW_MODE_ARG:-${CLAW_MODE:-}}"

# A non-interactive shell (`ssh host 'bash install.sh'`, CI, a pipe) cannot
# answer a prompt: `read` gets EOF and the answer silently becomes empty, which
# previously produced a half-configured install that looked like it succeeded.
# Treat that as --yes so saved answers and defaults are used deliberately.
if [ ! -t 0 ] && [ "$ASSUME_YES" != "true" ]; then
  ASSUME_YES="true"
  NON_INTERACTIVE_AUTOYES="true"
else
  NON_INTERACTIVE_AUTOYES="false"
fi

# ─── Colors ──────────────────────────────────────────────────────────────────
# ANSI-C quoted so the variables hold real escape characters. With plain
# single quotes they hold the literal text \033[1m, which printf expands but
# bash's builtin echo does not — so every `echo "${BOLD}Step ...${NC}"` in this
# script printed raw escape codes at the user instead of bold text.
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'; CYAN=$'\033[0;36m'; BOLD=$'\033[1m'; NC=$'\033[0m'

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

# ─── Install state ──────────────────────────────────────────────────────────
# Records which steps finished and which questions were answered, so a re-run
# resumes instead of restarting the interview. Deliberately a SEPARATE file from
# .env: .env is the running configuration, this is the installer's own progress,
# and conflating them made "did this step run?" indistinguishable from "is this
# value set?".
#
# NO SECRETS are written here. Passwords and keys live only in .env, which
# already has the right handling; duplicating them into a second file would
# widen the blast radius of a stray copy for no benefit.
STATE_FILE="$PROJECT_ROOT/.claw-install.state"
STATE_VERSION="1"

state_get() {
  local key="$1"
  [ -f "$STATE_FILE" ] || return 0
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, "", $0); print; exit }' "$STATE_FILE"
}

# Rewrites the key in place so the file never accumulates duplicate entries that
# would make the last-write-wins ordering matter.
state_set() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp "${STATE_FILE}.XXXXXX")"
  if [ -f "$STATE_FILE" ]; then
    grep -v "^${key}=" "$STATE_FILE" > "$tmp" 2>/dev/null || true
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$STATE_FILE"
  chmod 600 "$STATE_FILE" 2>/dev/null || true
}

state_mark_done() { state_set "STEP_$1" "done"; }
step_done() { [ "$(state_get "STEP_$1")" = "done" ]; }

# True when a finished step should be skipped. --reconfigure re-asks the
# questions but must NOT undo work that already succeeded, so only the question
# steps consult RECONFIGURE; the doing steps consult this.
step_skip() {
  step_done "$1"
}

# Announces a skip so a resumed run still shows what it is standing on, rather
# than appearing to have silently missed a step.
skip_step() {
  printf "${GREEN}[DONE]${NC}  %s ${BLUE}(already completed — skipping)${NC}\n" "$1"
}

# Reads an answer, preferring one already recorded. An answered question is
# never asked again unless --reconfigure was passed.
#   state_answer <state-key> <prompt> <default> [secret]
state_answer() {
  local key="$1" prompt="$2" fallback="$3" saved="" reply=""
  saved="$(state_get "$key")"

  if [ -n "$saved" ] && [ "$RECONFIGURE" != "true" ]; then
    printf '%s\n' "$saved"
    return 0
  fi

  local suggestion="${saved:-$fallback}"
  if [ "$ASSUME_YES" = "true" ]; then
    state_set "$key" "$suggestion"
    printf '%s\n' "$suggestion"
    return 0
  fi

  ask "$prompt [${suggestion}]: " >&2
  read -r reply
  [ -n "$reply" ] || reply="$suggestion"
  state_set "$key" "$reply"
  printf '%s\n' "$reply"
}

if [ "$FRESH_INSTALL" = "true" ] && [ -f "$STATE_FILE" ]; then
  rm -f "$STATE_FILE"
fi

RESUMING="false"
if [ -f "$STATE_FILE" ]; then
  RESUMING="true"
elif [ "$STATUS_ONLY" != "true" ]; then
  # --status must not create the file it is reporting on, or "nothing has been
  # started yet" becomes unreportable after the first --status.
  state_set "STATE_VERSION" "$STATE_VERSION"
  state_set "STARTED_AT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

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

# ─── Progress report ────────────────────────────────────────────────────────
# The ordered list of steps, so --status and the resume banner describe the
# install in the same words the run itself uses.
STEP_KEYS="prereqs mode ports hostname secrets admin ai tls env tooling start publictls"
step_label() {
  case "$1" in
    prereqs)   echo "Prerequisites" ;;
    mode)      echo "Deployment mode" ;;
    ports)     echo "Port availability" ;;
    hostname)  echo "Hostname" ;;
    secrets)   echo "Secrets" ;;
    admin)     echo "Admin configuration" ;;
    ai)        echo "AI mode & GPU" ;;
    tls)       echo "TLS certificates (internal)" ;;
    env)       echo ".env file" ;;
    tooling)   echo "Desktop-agent tooling" ;;
    start)     echo "Stack start" ;;
    publictls) echo "Public TLS (Let's Encrypt)" ;;
    *)         echo "$1" ;;
  esac
}

print_install_status() {
  echo "${BOLD}Install progress${NC}"
  echo ""
  local key
  for key in $STEP_KEYS; do
    if step_done "$key"; then
      printf "  ${GREEN}✔${NC} %s\n" "$(step_label "$key")"
    else
      printf "  ${YELLOW}·${NC} %s ${BLUE}(pending)${NC}\n" "$(step_label "$key")"
    fi
  done
  echo ""
  local saved_mode saved_host saved_ai
  saved_mode="$(state_get "ANSWER_MODE")"
  saved_host="$(state_get "ANSWER_HOSTNAME")"
  saved_ai="$(state_get "ANSWER_LOCAL_AI")"
  if [ -n "$saved_mode$saved_host$saved_ai" ]; then
    echo "${BOLD}Saved answers${NC}"
    [ -n "$saved_mode" ] && echo "  mode:     $saved_mode"
    [ -n "$saved_host" ] && echo "  hostname: $saved_host"
    [ -n "$saved_ai" ]   && echo "  local AI: $saved_ai"
    echo ""
  fi
}

if [ "$STATUS_ONLY" = "true" ]; then
  if [ ! -f "$STATE_FILE" ]; then
    info "No install has been started yet (no .claw-install.state)."
    exit 0
  fi
  print_install_status
  info "Re-run without --status to continue from the first pending step."
  exit 0
fi

if [ "$RESUMING" = "true" ]; then
  info "Resuming a previous install — completed steps are skipped and answered questions are not repeated."
  info "Use --reconfigure to change your answers, or --fresh to start over."
  echo ""
  print_install_status
fi

if [ "$NON_INTERACTIVE_AUTOYES" = "true" ]; then
  info "No terminal attached — running non-interactively with saved answers and defaults."
  echo ""
fi

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
  info "Answers you already gave are saved — re-running resumes from here."
  exit 1
fi
# Re-verified on every run rather than skipped: this describes the machine as
# it is now, and a Docker daemon that has since stopped must fail the run
# rather than be assumed from a previous success.
state_mark_done "prereqs"
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

# An explicit flag or env var always wins over a saved answer, so an operator
# can override a resumed install without editing the state file.
if [ -z "$CLAW_MODE" ]; then
  SAVED_MODE="$(state_get "ANSWER_MODE")"
  if [ -n "$SAVED_MODE" ] && [ "$RECONFIGURE" != "true" ]; then
    CLAW_MODE="$SAVED_MODE"
    info "Mode answered on a previous run: ${BOLD}${CLAW_MODE}${NC}"
  else
    MODE_INPUT="$(state_answer "ANSWER_MODE" "Mode [dev/prod]" "${SAVED_MODE:-dev}")"
    MODE_INPUT="$(echo "$MODE_INPUT" | tr '[:upper:]' '[:lower:]')"
    case "$MODE_INPUT" in
      prod|production) CLAW_MODE="prod" ;;
      dev|development|"") CLAW_MODE="dev" ;;
      *)
        fail "Unknown mode '$MODE_INPUT'. Expected 'dev' or 'prod'."
        exit 1
        ;;
    esac
  fi
fi
state_set "ANSWER_MODE" "$CLAW_MODE"

apply_mode_compose_paths

if [ "$CLAW_MODE" = "prod" ]; then
  NODE_ENV_VALUE="production"
  ok "Mode: ${BOLD}production${NC} (compose files: docker/docker-compose.prod.*.yml)"
else
  NODE_ENV_VALUE="development"
  ok "Mode: ${BOLD}development${NC} (compose files: docker/docker-compose.dev.*.yml)"
fi
export CLAW_MODE NODE_ENV_VALUE
state_mark_done "mode"
echo ""

# ─── Step 2: Check port availability ────────────────────────────────────────
# Below this, images are built one at a time instead of all at once. Each Node
# service build peaks near a gigabyte and Compose starts them together.
LOW_MEMORY_BUILD_THRESHOLD_MB=12000

# PHYSICAL memory available to the build, in MB — deliberately NOT counting swap.
#
# Swap decides whether the bake survives; it does not make a parallel build a
# good idea. Measured on an 8 GB server with 8 GB of swap: the parallel bake
# stopped being OOM-killed, but sat at 3.5 GB swapped with under 1 GB free,
# thrashing. Counting swap toward the budget put that host on the parallel path
# when sequential would have been both faster and safer, so the decision uses
# real memory and swap stays what it should be — the safety net underneath it.
#
# On macOS and Windows the build runs inside the Docker Desktop VM, whose
# allocation is configured in Docker rather than reported by the host, so the
# daemon's own figure is the right one on every platform.
#
# Returns a large number when it cannot tell, so an unreadable daemon keeps the
# faster parallel path rather than being silently degraded.
build_memory_budget_mb() {
  local daemon_bytes=""
  daemon_bytes="$(docker info --format '{{.MemTotal}}' 2>/dev/null || true)"
  if [ -n "$daemon_bytes" ] && [ "$daemon_bytes" -gt 0 ] 2>/dev/null; then
    echo $((daemon_bytes / 1024 / 1024))
    return 0
  fi
  if command -v free &>/dev/null; then
    free -m 2>/dev/null | awk '/^Mem:/ { print int($2); exit }'
    return 0
  fi
  echo "999999"
}

check_port() {
  local port=$1 name=$2
  if (echo >/dev/tcp/localhost/"$port") 2>/dev/null; then
    warn "Port $port ($name) is in use"
  else
    ok "Port $port ($name) is available"
  fi
}

# Re-checked on every run rather than skipped: ports are a property of the
# machine right now, not a decision that was made once, and a port that freed
# up or got taken since the last attempt is exactly what an operator needs to
# see before starting the stack.
echo "${BOLD}Step 2/9: Checking port availability${NC}"
echo ""
check_port 3000 "Frontend"
check_port 4000 "API Gateway (Nginx)"
check_port 5672 "RabbitMQ"
check_port 6380 "Redis"
check_port 27018 "MongoDB"
# Only the production stack publishes the privileged ports. 80 is not optional
# there: it carries the Let's Encrypt HTTP-01 challenge, which the CA will only
# ever request on the standard port, and a host nginx or Apache squatting on it
# fails the whole public-TLS step much later with a confusing 404.
if [ "$CLAW_MODE" = "prod" ]; then
  check_port 80 "HTTP / ACME challenge (Nginx)"
  check_port 443 "HTTPS (Nginx)"
fi
state_mark_done "ports"
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

if [ -n "${CLAW_HOSTNAME:-}" ]; then
  : # explicit env var wins over anything recorded
else
  CLAW_HOSTNAME="$(state_answer "ANSWER_HOSTNAME" "Hostname" "$DEFAULT_HOSTNAME")"
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

state_set "ANSWER_HOSTNAME" "$CLAW_HOSTNAME"

# A name a public CA is able to validate. Everything excluded here resolves
# only on this machine or inside a LAN, so Let's Encrypt cannot be used and the
# mkcert certificate remains the right answer. Kept in sync with the identical
# check in scripts/install-letsencrypt.sh, which makes the final decision.
hostname_is_public_domain() {
  local d="$1"
  [ -n "$d" ] || return 1
  [[ "$d" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] && return 1
  [[ "$d" == *.* ]] || return 1
  case "$d" in
    localhost|*.localhost) return 1 ;;
    *.local|*.internal|*.lan|*.home|*.corp|*.test|*.example|*.invalid) return 1 ;;
  esac
  return 0
}

# Asked here rather than at issuance time so the whole interview stays in one
# place and an unattended --yes run never stalls waiting for it later.
LETSENCRYPT_EMAIL_VALUE=""
if hostname_is_public_domain "$CLAW_HOSTNAME" && [ "$CLAW_MODE" = "prod" ]; then
  EXISTING_LE_EMAIL=""
  if [ -f "$ENV_FILE" ]; then
    EXISTING_LE_EMAIL="$(get_env_value "LETSENCRYPT_EMAIL" "$ENV_FILE")"
  fi
  info "'$CLAW_HOSTNAME' is a public domain — a Let's Encrypt certificate will be"
  info "issued for it after the stack starts, so browsers trust it without warnings."
  LETSENCRYPT_EMAIL_VALUE="$(state_answer "ANSWER_LE_EMAIL" \
    "Email for certificate-expiry warnings (blank to skip)" \
    "${LETSENCRYPT_EMAIL:-$EXISTING_LE_EMAIL}")"
fi

state_mark_done "hostname"
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
# Separate from ENCRYPTION_KEY on purpose: vaulted gateway payment tokens are
# encrypted under their own key so a payment-token compromise does not also
# expose connector API keys, and so the two can be rotated independently.
PAYMENT_TOKEN_ENCRYPTION_KEY=$(gen_secret_hex)

# Every Postgres database gets its OWN password.
#
# One shared credential defeats the reason each service owns a separate
# database: a single leaked connection string — a log line, a stack trace, one
# compromised service — would hand an attacker every other database in the
# platform. Per-database passwords keep that blast radius to the data the
# leaking service already had.
#
# The suffixes are the contract. They must match the PG_<KEY>_PASSWORD names
# written to .env below, which are exactly the variables each container reads
# as POSTGRES_PASSWORD in docker/docker-compose.*.databases.yml. Adding a
# database means adding its key here and in all three places.
PG_DB_KEYS="AUTH CHAT CONNECTOR ROUTING MEMORY FILES OLLAMA IMAGES FILE_GENERATIONS WORKSPACE AGENT RESEARCH PAYMENTS LLAMACPP"
for pg_key in $PG_DB_KEYS; do
  printf -v "PG_PW_${pg_key}" '%s' "$(gen_password)"
done

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
ok "Payment token encryption key generated (${#PAYMENT_TOKEN_ENCRYPTION_KEY} hex chars)"
ok "Database passwords generated (one distinct password per Postgres database)"
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
  # Each Postgres password is preserved INDEPENDENTLY, because each named
  # volume was initialised with whatever password its own container first saw.
  #
  # This is also the upgrade path for installs that predate per-database
  # passwords: those have the same value repeated across every PG_*_PASSWORD,
  # and reading them key by key carries each one forward unchanged, so an
  # existing deployment keeps booting with no manual migration. A database
  # whose variable is absent — a service added since the last run, whose volume
  # does not exist yet — keeps the fresh distinct password generated above.
  PG_PRESERVED_COUNT=0
  for pg_key in $PG_DB_KEYS; do
    prev_pg_password="$(get_env_value "PG_${pg_key}_PASSWORD" "$ENV_FILE")"
    if [ -n "$prev_pg_password" ]; then
      printf -v "PG_PW_${pg_key}" '%s' "$prev_pg_password"
      PG_PRESERVED_COUNT=$((PG_PRESERVED_COUNT + 1))
    fi
  done

  PREV_MONGO_PASS="$(get_env_value "MONGO_PASSWORD" "$ENV_FILE")"
  PREV_RABBIT_PASS="$(get_env_value "RABBITMQ_PASSWORD" "$ENV_FILE")"
  PREV_JWT_SECRET="$(get_env_value "JWT_SECRET" "$ENV_FILE")"
  PREV_ENCRYPTION_KEY="$(get_env_value "ENCRYPTION_KEY" "$ENV_FILE")"
  PREV_PAYMENT_TOKEN_KEY="$(get_env_value "PAYMENT_TOKEN_ENCRYPTION_KEY" "$ENV_FILE")"
  if [ "$PG_PRESERVED_COUNT" -gt 0 ]; then
    ok "Preserved $PG_PRESERVED_COUNT PG_*_PASSWORD value(s) from existing .env (those volumes already use them)"
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
  if [ -n "$PREV_PAYMENT_TOKEN_KEY" ]; then
    PAYMENT_TOKEN_ENCRYPTION_KEY="$PREV_PAYMENT_TOKEN_KEY"
    ok "Preserved PAYMENT_TOKEN_ENCRYPTION_KEY from existing .env (changing it would orphan every vaulted payment method)"
  fi
fi
state_mark_done "secrets"
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
  # Credentials that already exist and already work are reused by default. A
  # resumed install must never silently rotate the admin password: the operator
  # may have saved it, and the seeded account in the database still holds the
  # old one until it is re-seeded.
  if step_done "admin" && [ "$RECONFIGURE" != "true" ]; then
    reuse_admin="y"
  elif [ "$ASSUME_YES" = "true" ]; then
    reuse_admin="y"
  else
    ask "Reuse admin credentials from the previous install? [Y/n]: "
    read -r reuse_admin
  fi
  if [[ "$reuse_admin" != "n" && "$reuse_admin" != "N" ]]; then
    REUSE_EXISTING_ADMIN="true"
    ADMIN_EMAIL="${EXISTING_ADMIN_EMAIL:-$ADMIN_EMAIL}"
    ADMIN_USERNAME="${EXISTING_ADMIN_USERNAME:-$ADMIN_USERNAME}"
    ADMIN_PASS="${EXISTING_ADMIN_PASS:-$ADMIN_PASS}"
    ok "Reusing admin credentials from existing .env"
  fi
fi

if [ "$REUSE_EXISTING_ADMIN" != "true" ]; then
  # Email and username are recorded so they survive a re-run. The PASSWORD is
  # not: it lives in .env only, and writing it to a second file would duplicate
  # a secret for no gain.
  ADMIN_EMAIL="$(state_answer "ANSWER_ADMIN_EMAIL" "Admin email" "$ADMIN_EMAIL")"
  ADMIN_USERNAME="$(state_answer "ANSWER_ADMIN_USERNAME" "Admin username" "$ADMIN_USERNAME")"

  if [ "$ASSUME_YES" = "true" ]; then
    info "Admin password: auto-generated (non-interactive run)"
  else
    ask "Admin password [auto-generated]: "
    read -r input
    if [ -n "$input" ]; then ADMIN_PASS="$input"; fi
  fi
fi

state_mark_done "admin"
echo ""

# ─── Step 5: AI mode + GPU detection ────────────────────────────────────────
echo "${BOLD}Step 5/9: AI mode & GPU detection${NC}"
echo ""

# --- 5a: local-AI vs API-only ------------------------------------------------
# API-only (default) skips every heavy component: no Ollama runtime, no
# llamacpp, no ComfyUI / Stable Diffusion, no extra databases, and NO
# multi-gigabyte model downloads. The install is fast and small, and the app
# runs on external AI providers configured in the Connectors UI.
LOCAL_AI="$LOCAL_AI_ARG"
if [ -z "$LOCAL_AI" ]; then
  SAVED_LOCAL_AI="$(state_get "ANSWER_LOCAL_AI")"
  if [ -n "$SAVED_LOCAL_AI" ] && [ "$RECONFIGURE" != "true" ]; then
    LOCAL_AI="$SAVED_LOCAL_AI"
    info "AI mode answered on a previous run: $([ "$LOCAL_AI" = "true" ] && echo "local + API" || echo "API only")"
  else
    echo "How should Claw run AI models?"
    echo "  1) API only (recommended, default) — external providers via the"
    echo "     Connectors UI (OpenAI, Anthropic, Gemini, DeepSeek, Grok, or an"
    echo "     Ollama-compatible API key). No local downloads, fast install."
    echo "  2) Local + API — also run Ollama, llamacpp, ComfyUI and Stable"
    echo "     Diffusion locally. Offline-capable, GPU-accelerated, pulls several"
    echo "     GB of model weights on first start."
    echo ""
    if [ "$ASSUME_YES" = "true" ]; then
      ai_choice="1"
      info "Non-interactive run — choosing API only."
    else
      ask "Choose [1]: "
      read -r ai_choice
    fi
    case "$ai_choice" in
      2) LOCAL_AI="true" ;;
      *) LOCAL_AI="false" ;;
    esac
  fi
fi
state_set "ANSWER_LOCAL_AI" "$LOCAL_AI"

if [ "$LOCAL_AI" = "true" ]; then
  ok "Local-AI runtime ENABLED — Ollama / llamacpp / ComfyUI / Stable Diffusion"
  export COMPOSE_PROFILES=local-ai
else
  ok "API-only mode — no local models will be downloaded"
  info "Add a provider (OpenAI, Gemini, Anthropic, ...) in the Connectors UI after startup."
  # Ensure no stale profile leaks in from the caller's environment.
  unset COMPOSE_PROFILES
fi
echo ""

USE_GPU="false"
ENABLE_OLLAMA="$LOCAL_AI"
GPU_STATUS="No supported GPU detected"

# GPU detection only matters when local models actually run.
if [ "$LOCAL_AI" != "true" ]; then
  info "Skipping GPU detection (API-only mode)."
  GPU_STATUS="n/a (API-only mode)"
elif GPU_INFO="$(detect_gpu)"; then
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
# GPU detection itself is re-run every time (hardware and the container toolkit
# can change between attempts); it is the ANSWER above that is preserved.
state_mark_done "ai"
echo ""

# ─── Step 6: Internal TLS / SSL certificates (forced — no prompt) ───────────
# This is the mkcert leaf, and it is the stack's INTERNAL identity: every
# service presents it on its own HTTPS listener and nginx verifies upstreams
# against the matching root CA. Its SANs are container hostnames, so no public
# CA can issue a replacement — this step is mandatory even on a production
# server with a real domain. Browser-facing TLS for that domain is issued
# separately in step 9b and layered on top; it never replaces this.
echo "${BOLD}Step 6/9: Installing internal TLS certificates${NC}"
echo ""

# Certificate generation is the slowest optional step and it touches the system
# trust store, so it is not repeated once it has produced usable certs for the
# hostname still in effect. The verification gate below runs either way, so a
# skipped step can never mean an unverified one.
TLS_ALREADY_DONE="false"
if step_done "tls" \
  && [ -f "$PROJECT_ROOT/certs/claw.crt" ] \
  && [ -f "$PROJECT_ROOT/certs/claw.key" ] \
  && [ "$(state_get "TLS_HOSTNAME")" = "$CLAW_HOSTNAME" ]; then
  TLS_ALREADY_DONE="true"
fi

if [ "$TLS_ALREADY_DONE" = "true" ]; then
  skip_step "TLS certificates for $CLAW_HOSTNAME"
elif [ -x "$SCRIPT_DIR/install-tls.sh" ]; then
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
state_set "TLS_HOSTNAME" "$CLAW_HOSTNAME"
state_mark_done "tls"
ok "TLS certs present at certs/claw.crt"
echo ""

# ─── Step 7: Generate .env ──────────────────────────────────────────────────
echo "${BOLD}Step 7/9: Generating .env file${NC}"
echo ""

# Detect the dangerous scenario where .env is missing (so a fresh password was
# generated for every database this run) but Postgres named-volumes from a
# previous install still exist — those volumes were initialised with the OLD
# passwords and will reject every service connection. Offer to wipe them so the
# new secrets stick.
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
      warn "Volumes kept. Restore the prior .env (or its PG_*_PASSWORD values) before continuing"
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
    # A resumed run keeps the .env it already wrote. Rewriting it would rotate
    # the webhook/admin secrets underneath a stack that may already be seeded
    # with them, which is the opposite of resuming.
    if step_done "env" && [ "$RECONFIGURE" != "true" ]; then
      overwrite="n"
      info "Resuming — keeping the .env written by the previous run."
    elif [ "$ASSUME_YES" = "true" ]; then
      overwrite="n"
      info "Non-interactive run — keeping the existing .env."
    else
      ask "Overwrite it with the recreated credentials? [y/N]: "
      read -r overwrite
    fi
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

# --- Local-AI runtime toggle (set by install: ${LOCAL_AI}) ---
# false = API-only (external providers via Connectors UI). true = full local
# runtime. scripts/claw.sh reads this to decide whether the profiled local-AI
# containers are created. See .env.example for the full explanation.
CLAW_LOCAL_AI=${LOCAL_AI}

# --- Hostname / Public URL (single source of truth) ---
# Change CLAW_HOSTNAME and re-run scripts/install-tls.sh to reissue the TLS cert.
CLAW_HOSTNAME=${CLAW_HOSTNAME}
CORS_ORIGINS=${CORS_ORIGINS_VALUE}

# --- Internal TLS / SSL (mkcert-managed — see scripts/install-tls.sh) ---
# Containers always look here. The leaf cert + private key + root CA are
# regenerated by install-tls.sh and bind-mounted via docker compose.
# These are the INTERNAL identity of the stack (SANs are container hostnames)
# and are never what a browser sees on a public domain.
HTTPS_CERT_PATH=/certs/claw.crt
HTTPS_KEY_PATH=/certs/claw.key
NODE_EXTRA_CA_CERTS=/certs/rootCA.pem

# --- Public TLS (Let's Encrypt — see scripts/install-letsencrypt.sh) ---
# Contact address Let's Encrypt uses for certificate-expiry warnings. Leave it
# blank to register without one; the certificate still issues and renews, but a
# renewal that silently breaks will not be reported to anyone before it expires.
# Ignored unless CLAW_HOSTNAME is a publicly resolvable domain.
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL_VALUE}

# --- Rate Limiting ---
THROTTLE_TTL=60000
THROTTLE_LIMIT=2500

# =============================================================================
# PostgreSQL Credentials
# =============================================================================
PG_AUTH_USER=claw
PG_AUTH_PASSWORD=${PG_PW_AUTH}
PG_AUTH_DB=claw_auth
PG_AUTH_PORT=5441

PG_CHAT_USER=claw
PG_CHAT_PASSWORD=${PG_PW_CHAT}
PG_CHAT_DB=claw_chat
PG_CHAT_PORT=5442

PG_CONNECTOR_USER=claw
PG_CONNECTOR_PASSWORD=${PG_PW_CONNECTOR}
PG_CONNECTOR_DB=claw_connectors
PG_CONNECTOR_PORT=5443

PG_ROUTING_USER=claw
PG_ROUTING_PASSWORD=${PG_PW_ROUTING}
PG_ROUTING_DB=claw_routing
PG_ROUTING_PORT=5444

PG_MEMORY_USER=claw
PG_MEMORY_PASSWORD=${PG_PW_MEMORY}
PG_MEMORY_DB=claw_memory
PG_MEMORY_PORT=5445

PG_FILES_USER=claw
PG_FILES_PASSWORD=${PG_PW_FILES}
PG_FILES_DB=claw_files
PG_FILES_PORT=5446

PG_OLLAMA_USER=claw
PG_OLLAMA_PASSWORD=${PG_PW_OLLAMA}
PG_OLLAMA_DB=claw_ollama
PG_OLLAMA_PORT=5447

PG_IMAGES_USER=claw
PG_IMAGES_PASSWORD=${PG_PW_IMAGES}
PG_IMAGES_DB=claw_images
PG_IMAGES_PORT=5448

PG_FILE_GENERATIONS_USER=claw
PG_FILE_GENERATIONS_PASSWORD=${PG_PW_FILE_GENERATIONS}
PG_FILE_GENERATIONS_DB=claw_file_generations
PG_FILE_GENERATIONS_PORT=5449

PG_WORKSPACE_USER=claw
PG_WORKSPACE_PASSWORD=${PG_PW_WORKSPACE}
PG_WORKSPACE_DB=claw_workspace
PG_WORKSPACE_PORT=5450

PG_AGENT_USER=claw
PG_AGENT_PASSWORD=${PG_PW_AGENT}
PG_AGENT_DB=claw_agent
PG_AGENT_PORT=5451

PG_RESEARCH_USER=claw
PG_RESEARCH_PASSWORD=${PG_PW_RESEARCH}
PG_RESEARCH_DB=claw_research
PG_RESEARCH_PORT=5452

# PostgreSQL — Payment Service (separate instance from claw_auth by design)
PG_PAYMENTS_USER=claw
PG_PAYMENTS_PASSWORD=${PG_PW_PAYMENTS}
PG_PAYMENTS_DB=claw_payments
PG_PAYMENTS_PORT=5453

PG_LLAMACPP_USER=claw
PG_LLAMACPP_PASSWORD=${PG_PW_LLAMACPP}
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
# Subscriptions, Billing & Payments (claw-payment-service, port 4018)
# =============================================================================
# Plan PRICES are never read from env — they live in the database as versioned
# PlanPriceVersion rows so a price change creates a new immutable version and
# never reprices an existing subscription or invoice.

# Envelope key for vaulted GATEWAY TOKENS (never card data — ClawAI never
# receives a PAN or CVV). Separate from ENCRYPTION_KEY so the two rotate
# independently.
PAYMENT_TOKEN_ENCRYPTION_KEY=${PAYMENT_TOKEN_ENCRYPTION_KEY}
PAYMENT_TOKEN_KEY_VERSION=1

# Where a gateway sends the customer back after payment. Return URLs are built
# from THIS value server-side, never from a client-supplied redirect parameter.
FRONTEND_URL=https://${CLAW_HOSTNAME}

# Gateways start DISABLED. Fill in a complete credential set to enable one — a
# partial set does not half-enable a gateway.
# PayPal: https://developer.paypal.com/dashboard/applications
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_ENV=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=

# Paymob: dashboard > Settings > Account Info / Integrations
PAYMOB_SECRET_KEY=
PAYMOB_PUBLIC_KEY=
PAYMOB_API_KEY=
PAYMOB_HMAC_SECRET=
PAYMOB_CARD_INTEGRATION_ID=
# Optional public HTTPS callback endpoint. Required when the app hostname is
# local-only; expose only the Paymob webhook route through a tunnel.
PAYMOB_WEBHOOK_URL=
PAYMOB_CURRENCY=EGP
NEXT_PUBLIC_PAYMOB_PUBLIC_KEY=

# Foreign exchange (plan prices stay canonical in USD)
EXCHANGE_RATE_API_BASE_URL=https://open.er-api.com/v6
EXCHANGE_RATE_CACHE_TTL_MS=3600000
# 0 means "fail checkout rather than charge against a stale hardcoded rate".
USD_TO_EGP_FALLBACK_RATE=0
FX_QUOTE_TTL_MS=900000
FX_SAFETY_MARGIN_BPS=150

# Lifecycle, reconciliation and outbound bounds
WEBHOOK_REPLAY_TOLERANCE_MS=600000
BILLING_GRACE_PERIOD_MS=259200000
BILLING_RECONCILIATION_CRON=0 */15 * * * *
PAYMENT_OUTBOX_POLL_INTERVAL_MS=5000
PAYMENT_OUTBOX_MAX_ATTEMPTS=10
PAYMENT_GATEWAY_TIMEOUT_MS=20000
PAYMENT_GATEWAY_MAX_RETRIES=2

# =============================================================================
# Admin Seed
# =============================================================================
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASS}
# Permission reconcile on auth boot: false=add-only (first init seeds fully,
# later boots only ADD new seed permissions, never remove admin-granted extras).
SEED_RECONCILE_PERMISSIONS=false

# =============================================================================
# Frontend
# =============================================================================
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=Claw
NEXT_PUBLIC_APP_URL=${CLAW_BASE_URL}

# Canonical origin for public shared-chat URLs, built server-side by
# chat-service. Never derived from a request Host header.
PUBLIC_SITE_URL=${CLAW_BASE_URL}
# Phase 8 UI transparency — dev-only Thread Context Inspector toggle.
NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=false
FRONTEND_PORT=3000
# Server-only canonical origin for the public marketing site (sitemap,
# robots.txt, canonical URLs, Open Graph, ads.txt). Reuses the same
# resolved hostname as NEXT_PUBLIC_APP_URL for local installs; replace with
# your real production domain before deploying publicly.
SITE_URL=${CLAW_BASE_URL}
NEXT_PUBLIC_SOCIAL_X_URL=
NEXT_PUBLIC_SOCIAL_LINKEDIN_URL=
NEXT_PUBLIC_SOCIAL_DISCORD_URL=
# Google AdSense (marketing pages only). OFF by default; set a real
# ca-pub-... id to enable /ads.txt + the verification/serving machinery.
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_ADSENSE_SERVING_ENABLED=false
NEXT_PUBLIC_ADSENSE_REVIEW_MODE=false
ADSENSE_PUBLISHER_ID=
# Per-placement ad slot ids. Blank = that unit never renders. Keep blank
# locally: the Playwright suite asserts no ad is requested in a test run.
NEXT_PUBLIC_ADSENSE_HOME_SLOT=
NEXT_PUBLIC_ADSENSE_CONTENT_SLOT=
NEXT_PUBLIC_ADSENSE_SHARED_CHAT_TOP_SLOT=
NEXT_PUBLIC_ADSENSE_SHARED_CHAT_INLINE_SLOT=
NEXT_PUBLIC_ADSENSE_SHARED_CHAT_BOTTOM_SLOT=
# Public contact form (/api/contact). Server-only — SMTP creds never reach the
# browser. OFF by default; set ENABLED=true + PROVIDER=smtp with credentials.
CONTACT_EMAIL_ENABLED=false
CONTACT_EMAIL_PROVIDER=none
CONTACT_EMAIL_FROM=no-reply@claw.local
CONTACT_EMAIL_TO=
CONTACT_RATE_LIMIT_MAX=3
CONTACT_RATE_LIMIT_WINDOW_MS=3600000
CONTACT_SMTP_HOST=
CONTACT_SMTP_PORT=587
CONTACT_SMTP_SECURE=false
CONTACT_SMTP_USER=
CONTACT_SMTP_PASS=

# =============================================================================
# Ollama
# =============================================================================
# Used only when CLAW_LOCAL_AI=true. In API-only mode the runtime is absent and
# routing falls back to its heuristic classifier.
OLLAMA_BASE_URL=http://ollama:11434
# Bearer token for a hosted Ollama-compatible API. Empty for the local runtime.
# Never expose to the frontend / any NEXT_PUBLIC_* variable.
OLLAMA_API_KEY=
OLLAMA_ROUTER_MODEL=qwen3:1.7b
OLLAMA_ROUTER_TIMEOUT_MS=10000
ROUTER_COMPACT_PROMPT=true
OLLAMA_GENERATE_TIMEOUT_MS=300000
# Native /api/chat — the tool-calling surface. Own budget: an agent turn is a
# full model call plus tool-result context.
OLLAMA_CHAT_TIMEOUT_MS=300000
OLLAMA_KEEP_ALIVE=-1m
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_NUM_PARALLEL=1
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
MEMORY_EXTRACTION_MODEL=AUTO

# --- Ollama Cloud agentic tool-loop caps ---
# Bounds the runaway agentic tool loop used by deepseek-v4-pro / kimi-k2 /
# glm-5.1. When EITHER cap is hit, chat-service issues one final tool-less
# POST forcing the model to synthesize an answer from already gathered
# evidence (metadata.toolTranscript.gracefullyWrapped=true).
OLLAMA_TOOL_LOOP_MAX_ITERATIONS=50
OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS=600000

# --- Runtime V2 provider-native tool calling ---
# When true, the admitted Runtime V2 tool catalog is translated into the
# provider's native tool dialect and attached to the request. When false the
# run falls back to the prompt-JSON lane, which cannot express a real tool
# call. The catalog is re-sent on every turn, so it is budgeted in bytes.
CHAT_NATIVE_TOOL_CALLING_ENABLED=true
CHAT_TOOL_CATALOG_MAX_BYTES=262144

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
PAYMENT_SERVICE_URL=https://payment-service:4018
LLAMACPP_SERVICE_URL=https://llamacpp-service:4017

# =============================================================================
# Per-Service Ports
# =============================================================================
AUTH_PORT=4001
CHAT_PORT=4002
CONNECTOR_PORT=4003
ROUTING_PORT=4004
# Local-model compute cost accounting (routing-service).
# Local inference is NOT free — someone bought the GPU and someone pays for the
# electricity. USER_OWNED means the user runs the hardware, so it costs the
# platform nothing. PLATFORM_HOSTED means you run it, and the estimate below
# must be set: leaving it at 0 while hosting is treated as a misconfiguration
# and local models are priced as UNPRICED (fail closed) rather than free.
LOCAL_COMPUTE_OWNERSHIP=USER_OWNED
LOCAL_COMPUTE_COST_PER_MILLION_MICRO_USD=0

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
PAYMENT_SERVICE_PORT=4018
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
AUTH_DATABASE_URL=postgresql://claw:${PG_PW_AUTH}@pg-auth:5432/claw_auth?schema=public
CHAT_DATABASE_URL=postgresql://claw:${PG_PW_CHAT}@pg-chat:5432/claw_chat?schema=public
CONNECTOR_DATABASE_URL=postgresql://claw:${PG_PW_CONNECTOR}@pg-connector:5432/claw_connectors?schema=public
ROUTING_DATABASE_URL=postgresql://claw:${PG_PW_ROUTING}@pg-routing:5432/claw_routing?schema=public
MEMORY_DATABASE_URL=postgresql://claw:${PG_PW_MEMORY}@pg-memory:5432/claw_memory?schema=public
FILES_DATABASE_URL=postgresql://claw:${PG_PW_FILES}@pg-files:5432/claw_files?schema=public
OLLAMA_DATABASE_URL=postgresql://claw:${PG_PW_OLLAMA}@pg-ollama:5432/claw_ollama?schema=public
IMAGE_DATABASE_URL=postgresql://claw:${PG_PW_IMAGES}@pg-images:5432/claw_images?schema=public
FILE_GENERATION_DATABASE_URL=postgresql://claw:${PG_PW_FILE_GENERATIONS}@pg-file-generations:5432/claw_file_generations?schema=public
WORKSPACE_DATABASE_URL=postgresql://claw:${PG_PW_WORKSPACE}@pg-workspace:5432/claw_workspace?schema=public
AGENT_DATABASE_URL=postgresql://claw:${PG_PW_AGENT}@pg-agent:5432/claw_agent?schema=public
RESEARCH_DATABASE_URL=postgresql://claw:${PG_PW_RESEARCH}@pg-research:5432/claw_research?schema=public
PAYMENT_DATABASE_URL=postgresql://claw:${PG_PW_PAYMENTS}@pg-payments:5432/claw_payments?schema=public
LLAMACPP_DATABASE_URL=postgresql://claw:${PG_PW_LLAMACPP}@pg-llamacpp:5432/claw_llamacpp?schema=public

# claw-llamacpp-service (Local Frontier LLM runtime)
# Path matches the `llamacpp-data` Docker named volume so binary + weights
# survive container rebuilds across Linux/macOS/Windows hosts.
LLAMACPP_DATA_PATH=/var/lib/claw/llamacpp
# Auto-updated by BinaryInstallerManager when GitHub API is reachable; the
# pinned fallback below is the version live-tested in 2026-05-09 QA.
LLAMACPP_BINARY_VERSION=b9095
LLAMACPP_GPU_BACKEND=auto
LLAMACPP_DEFAULT_CTX_SIZE=32768
LLAMACPP_AUTO_INSTALL_BINARY=true
LLAMACPP_FORCE_PINNED_BINARY=false
LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED=true
LLAMACPP_LOAD_TIMEOUT_MS=600000
LLAMACPP_BIND_HOST=127.0.0.1
LLAMACPP_PROCESS_PORT_MIN=48500
LLAMACPP_PROCESS_PORT_MAX=48999
# Launch tool-capable catalog entries with `--jinja` so llama-server parses
# emitted tool calls into `message.tool_calls`. Applied per catalog entry (only
# entries advertising the `tools` capability), never globally — a GGUF whose
# template is not tool-aware can fail to start under --jinja. Kill switch if an
# upstream llama.cpp release regresses.
LLAMACPP_ENABLE_JINJA=true
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
state_mark_done "env"
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
if [ "$LOCAL_AI" = "true" ]; then
  echo "  AI mode:           Local + API $([ "$USE_GPU" = "true" ] && echo "(GPU)" || echo "(CPU)")"
  echo "  Containers:        ~25 (13 databases, 15 services, nginx, frontend, redis, rabbitmq, ollama, comfyui, stable-diffusion)"
else
  echo "  AI mode:           API only (external providers via Connectors UI)"
  echo "  Containers:        ~20 (11 databases, 13 services, nginx, frontend, redis, rabbitmq) — no local-AI runtime"
fi
echo ""
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$ASSUME_YES" = "true" ]; then
  start_answer="y"
  info "Non-interactive run — starting Claw."
else
  ask "Start Claw? [Y/n]: "
  read -r start_answer
fi
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
# Recorded like any other answer: this pulls Rust, Playwright Chromium and
# model weights, so a resumed run must not start it again just because the
# session dropped the first time.
if step_done "tooling" && [ "$RECONFIGURE" != "true" ]; then
  tooling_answer="n"
  skip_step "Desktop-agent native tooling"
elif [ "$ASSUME_YES" = "true" ]; then
  # Defaults to NO without a terminal. It is a long, network-heavy install and
  # an unattended run (CI, `ssh host 'bash install.sh'`) should not silently
  # commit to it; --reconfigure or an interactive run opts in.
  tooling_answer="n"
  info "Non-interactive run — skipping desktop-agent native tooling."
else
  ask "Install desktop-agent native tooling now? [Y/n]: "
  read -r tooling_answer
fi
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
state_mark_done "tooling"
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
    if [ "$(build_memory_budget_mb)" -lt "$LOW_MEMORY_BUILD_THRESHOLD_MB" ]; then
      # Compose hands every target to BuildKit at once, and each Node build
      # peaks around a gigabyte. On a small VM that is an OOM kill of the whole
      # bake — `failed to execute bake: signal: killed` — after which NOTHING is
      # built, not even the images that had finished, so the operator waits out
      # a long build for nothing. Building one at a time is slower and finishes.
      warn "Low build memory — building services one at a time instead of in parallel."
      info "      RAM + swap available is under ${LOW_MEMORY_BUILD_THRESHOLD_MB} MB. Adding swap makes this much faster."
      info "[50%] Building $BUILD_COUNT service(s) sequentially:"
      for entry in "${BUILD_DETAILS[@]}"; do
        info "  - $entry"
      done
      for build_name in "${BUILD_NAMES[@]}"; do
        info "  building $build_name ..."
        docker compose --env-file "$ENV_FILE" $COMPOSE_FILES build --progress plain "$build_name"
      done
    else
      info "[50%] Building $BUILD_COUNT service(s) in parallel:"
      for entry in "${BUILD_DETAILS[@]}"; do
        info "  - $entry"
      done
      # Docker Compose v2 builds services concurrently when given multiple names.
      # `--progress plain` keeps per-service log lines visible while they run.
      docker compose --env-file "$ENV_FILE" $COMPOSE_FILES build --progress plain "${BUILD_NAMES[@]}"
    fi
  fi

  ok "Docker progress plan: $DOWNLOAD_COUNT downloads, $BUILD_COUNT builds, $CACHED_BUILD_COUNT cached builds"
else
  warn "Could not resolve Docker progress plan; falling back to the legacy startup path"
  info "Pulling Docker images (this may take a few minutes on first run)..."
  docker compose --env-file "$ENV_FILE" $COMPOSE_FILES pull --ignore-pull-failures
  info "Building any service images that aren't on the registry..."
  # Same low-memory guard as the planned path above. This fallback is the branch
  # a real server actually took, so protecting only the planned path would have
  # left the OOM-killed bake exactly as it was.
  if [ "$(build_memory_budget_mb)" -lt "$LOW_MEMORY_BUILD_THRESHOLD_MB" ]; then
    warn "Low build memory — building services one at a time instead of in parallel."
    for fallback_service in $(docker compose --env-file "$ENV_FILE" $COMPOSE_FILES config --services 2>/dev/null); do
      # `|| true`: not every service has a build context (databases, redis,
      # rabbitmq are image-only), and asking to build one is a no-op error that
      # must not abort the whole install.
      docker compose --env-file "$ENV_FILE" $COMPOSE_FILES build "$fallback_service" 2>/dev/null || true
    done
  else
    docker compose --env-file "$ENV_FILE" $COMPOSE_FILES build
  fi
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

# ─── Step 9b: Public TLS certificate (Let's Encrypt) ────────────────────────
# Runs AFTER the stack is up, and that ordering is load-bearing. Validation is
# HTTP-01: the CA fetches a token over plain HTTP from the running nginx
# container. Attempting this alongside the mkcert step — before anything is
# listening — could only work by binding port 80 standalone, which then
# collides with nginx at every renewal and takes the site down to renew.
#
# Non-fatal by design. A DNS record that has not propagated, a blocked port 80
# or a Let's Encrypt rate limit must not fail an otherwise working install: the
# stack keeps serving the mkcert certificate and the operator re-runs
# scripts/install-letsencrypt.sh once the cause is fixed.
if step_done "publictls"; then
  skip_step "Public TLS certificate for $CLAW_HOSTNAME"
elif [ "$CLAW_MODE" != "prod" ]; then
  info "Dev mode — skipping the public certificate (mkcert covers local browsing)."
elif [ ! -f "$SCRIPT_DIR/install-letsencrypt.sh" ]; then
  warn "scripts/install-letsencrypt.sh missing — skipping public TLS."
else
  echo "${BOLD}Step 9b/9: Public TLS certificate (Let's Encrypt)${NC}"
  # The script decides for itself whether CLAW_HOSTNAME is a name a public CA
  # can validate, and exits 0 with an explanation when it is not, so an
  # IP-hosted or claw.local install passes through here cleanly.
  if bash "$SCRIPT_DIR/install-letsencrypt.sh"; then
    state_mark_done "publictls"
  else
    warn "Public TLS setup did not complete — the stack is still serving the mkcert cert."
    info "  Browsers will warn on ${CLAW_BASE_URL} until this succeeds."
    info "  Re-run on its own once the cause is fixed:"
    info "    bash scripts/install-letsencrypt.sh --verify-renewal"
  fi
  echo ""
fi

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
echo "    bash scripts/install.sh --status            Show install progress"
echo ""

state_mark_done "start"
state_set "COMPLETED_AT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
