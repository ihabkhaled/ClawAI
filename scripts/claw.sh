#!/bin/bash
# =============================================================================
# ClawAI Infrastructure Manager — THE canonical entrypoint
# =============================================================================
# One command to rule them all. Auto-detects GPU and picks the right overlay.
#
# Usage:
#   ./scripts/claw.sh [--dev|--prod] <command>
#   CLAW_ENV=prod ./scripts/claw.sh <command>
#
# GPU detection (cross-platform, auto):
#   - NVIDIA (Linux, WSL2, Windows): `nvidia-smi -L` succeeds
#   - AMD ROCm (Linux):              /dev/kfd exists
#   - Intel/Vulkan (Linux):          /dev/dri/render* exists
#   - Apple Silicon (macOS):         warned — Docker can't access Metal
#   - None:                          CPU-only (no overlay)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

MODE="${CLAW_ENV:-dev}"

ARGS=()
for arg in "$@"; do
  case "$arg" in
    --prod) MODE="prod" ;;
    --dev)  MODE="dev" ;;
    *)      ARGS+=("$arg") ;;
  esac
done
set -- "${ARGS[@]}"

# Compose files for this mode
if [ "$MODE" = "prod" ]; then
  DB_FILE="$PROJECT_ROOT/docker/docker-compose.prod.databases.yml"
  SVC_FILE="$PROJECT_ROOT/docker/docker-compose.prod.services.yml"
  OLLAMA_FILE="$PROJECT_ROOT/docker/docker-compose.prod.ollama.yml"
  GPU_NVIDIA_FILE="$PROJECT_ROOT/docker/docker-compose.prod.gpu-nvidia.yml"
  OLLAMA_GPU_NVIDIA_FILE="$PROJECT_ROOT/docker/docker-compose.prod.ollama.gpu-nvidia.yml"
  GPU_ROCM_FILE="$PROJECT_ROOT/docker/docker-compose.prod.gpu-rocm.yml"
  GPU_VULKAN_FILE="$PROJECT_ROOT/docker/docker-compose.prod.gpu-vulkan.yml"
else
  DB_FILE="$PROJECT_ROOT/docker/docker-compose.dev.databases.yml"
  SVC_FILE="$PROJECT_ROOT/docker/docker-compose.dev.services.yml"
  OLLAMA_FILE="$PROJECT_ROOT/docker/docker-compose.dev.ollama.yml"
  GPU_NVIDIA_FILE="$PROJECT_ROOT/docker/docker-compose.dev.gpu-nvidia.yml"
  OLLAMA_GPU_NVIDIA_FILE="$PROJECT_ROOT/docker/docker-compose.dev.ollama.gpu-nvidia.yml"
  GPU_ROCM_FILE="$PROJECT_ROOT/docker/docker-compose.dev.gpu-rocm.yml"
  GPU_VULKAN_FILE="$PROJECT_ROOT/docker/docker-compose.dev.gpu-vulkan.yml"
fi

# -----------------------------------------------------------------------------
# Cross-platform GPU detection
# -----------------------------------------------------------------------------
GPU_OVERLAY=""
OLLAMA_GPU_OVERLAY=""
GPU_VENDOR="none"

detect_gpu() {
  local host_os
  host_os="$(uname -s)"

  # macOS — Docker can't access Metal regardless. Always CPU-only inside the container.
  if [ "$host_os" = "Darwin" ]; then
    GPU_VENDOR="metal-host-only"
    echo "ℹ macOS detected — Docker can't access Apple Silicon Metal." >&2
    echo "  llamacpp-service will run CPU-only inside the container." >&2
    echo "  For GPU: run claw-llamacpp-service natively outside Docker." >&2
    return 0
  fi

  # NVIDIA — Linux native, Linux Docker Desktop, or WSL2
  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
    if [ -f "$GPU_NVIDIA_FILE" ]; then
      GPU_VENDOR="nvidia"
      GPU_OVERLAY="-f $GPU_NVIDIA_FILE"
      if [ -f "$OLLAMA_GPU_NVIDIA_FILE" ]; then
        OLLAMA_GPU_OVERLAY="-f $OLLAMA_GPU_NVIDIA_FILE"
      fi
      local gpu_name
      gpu_name="$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 | tr -d '\r')"
      echo "✓ NVIDIA GPU detected ($gpu_name) — enabling CUDA passthrough" >&2
      return 0
    fi
  fi

  # AMD ROCm — Linux only, requires /dev/kfd
  if [ -e /dev/kfd ] && [ -d /dev/dri ]; then
    if [ -f "$GPU_ROCM_FILE" ]; then
      GPU_VENDOR="rocm"
      GPU_OVERLAY="-f $GPU_ROCM_FILE"
      echo "✓ AMD ROCm GPU detected — enabling ROCm passthrough" >&2
      return 0
    fi
  fi

  # Intel iGPU / Intel Arc / generic Vulkan via /dev/dri render node
  if [ -d /dev/dri ] && ls /dev/dri/render* >/dev/null 2>&1; then
    if [ -f "$GPU_VULKAN_FILE" ]; then
      GPU_VENDOR="vulkan"
      GPU_OVERLAY="-f $GPU_VULKAN_FILE"
      echo "✓ Intel/Vulkan-capable GPU detected — enabling /dev/dri passthrough" >&2
      return 0
    fi
  fi

  GPU_VENDOR="none"
  echo "ℹ No GPU detected on host — running CPU-only" >&2
}

# Ensure the shared docker network exists before any `up` command.
# Compose files declare claw-network as external, so we own its lifecycle here.
# Idempotent: no-op if the network already exists.
ensure_network() {
  if ! docker network inspect claw-network >/dev/null 2>&1; then
    echo "Creating shared docker network: claw-network"
    docker network create claw-network >/dev/null
  fi
}

# Preflight checks for any `up`-style command. Catches the two most common
# server-side failures BEFORE compose runs and burns the user 60s of pointless
# container starts that crash with cryptic messages:
#   1. No .env at the project root  → compose can't interpolate ${PG_*_PASSWORD}
#      and every postgres container starts with the default `claw_secret`,
#      which then fails to match the per-service DATABASE_URL.
#   2. Missing certs                → every backend service crashes at boot with
#      `ENOENT: no such file or directory, open '/certs/claw.crt'`.
# A WARNING is enough — we still let the user proceed in case they know what
# they are doing — but we exit early on missing .env because there's nothing
# useful that can happen without it.
preflight_up() {
  local fatal=0
  if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo ""
    echo "ERROR: $PROJECT_ROOT/.env is missing."
    echo "       docker compose needs it to interpolate every PG_*_PASSWORD,"
    echo "       MONGO_PASSWORD, JWT_SECRET, etc. Without it, services start"
    echo "       with stale fallback values and the postgres password mismatch"
    echo "       will reject every connection."
    echo ""
    echo "Run one of:"
    echo "   ./scripts/install.sh          # interactive, generates fresh secrets"
    echo "   ./scripts/setup.sh            # quick path: copies .env.example → .env"
    echo ""
    fatal=1
  fi
  if [ ! -f "$PROJECT_ROOT/certs/claw.crt" ] || \
     [ ! -f "$PROJECT_ROOT/certs/claw.key" ] || \
     [ ! -f "$PROJECT_ROOT/certs/rootCA.pem" ]; then
    echo ""
    echo "WARNING: $PROJECT_ROOT/certs is missing one or more of claw.crt / claw.key / rootCA.pem."
    echo "         Every backend service mounts ./certs:/certs:ro and will fall back to"
    echo "         HTTP (with a noisy startup warning) instead of HTTPS."
    echo "         Generate them with: ./scripts/install-tls.sh"
    echo ""
  fi
  if [ "$fatal" -ne 0 ]; then
    exit 1
  fi
}

# Compose-merged file flags for the services group (with optional GPU overlay).
build_svc_compose_flags() {
  if [ -n "$GPU_OVERLAY" ]; then
    echo "-f $SVC_FILE $GPU_OVERLAY"
  else
    echo "-f $SVC_FILE"
  fi
}

# Compose-merged file flags for the Ollama group (with optional NVIDIA GPU overlay).
build_ollama_compose_flags() {
  if [ -n "$OLLAMA_GPU_OVERLAY" ]; then
    echo "-f $OLLAMA_FILE $OLLAMA_GPU_OVERLAY"
  else
    echo "-f $OLLAMA_FILE"
  fi
}

case "$1" in
  up)
    preflight_up
    detect_gpu
    ensure_network
    SVC_FLAGS=$(build_svc_compose_flags)
    OLLAMA_FLAGS=$(build_ollama_compose_flags)
    echo "Starting all ClawAI services ($MODE mode, gpu=$GPU_VENDOR)..."
    docker compose -p claw -f "$DB_FILE" up -d
    echo "Waiting for databases to become healthy..."
    sleep 10
    # shellcheck disable=SC2086
    docker compose -p claw $SVC_FLAGS up -d
    echo "Starting Ollama runtime..."
    # shellcheck disable=SC2086
    docker compose -p claw $OLLAMA_FLAGS up -d
    echo "All services started."
    ;;
  down)
    echo "Stopping all ClawAI services ($MODE mode)..."
    SVC_FLAGS=$(build_svc_compose_flags)
    OLLAMA_FLAGS=$(build_ollama_compose_flags)
    # shellcheck disable=SC2086
    docker compose -p claw $SVC_FLAGS down
    # shellcheck disable=SC2086
    docker compose -p claw $OLLAMA_FLAGS down
    docker compose -p claw -f "$DB_FILE" down
    echo "All services stopped."
    ;;
  db:up)
    preflight_up
    ensure_network
    echo "Starting databases + infrastructure ($MODE mode)..."
    docker compose -p claw -f "$DB_FILE" up -d
    ;;
  db:down)
    echo "Stopping databases + infrastructure ($MODE mode)..."
    docker compose -p claw -f "$DB_FILE" down
    ;;
  services:up)
    preflight_up
    detect_gpu
    ensure_network
    SVC_FLAGS=$(build_svc_compose_flags)
    echo "Starting backend + frontend services ($MODE mode, gpu=$GPU_VENDOR)..."
    # shellcheck disable=SC2086
    docker compose -p claw $SVC_FLAGS up -d
    ;;
  services:down)
    SVC_FLAGS=$(build_svc_compose_flags)
    echo "Stopping backend + frontend services ($MODE mode)..."
    # shellcheck disable=SC2086
    docker compose -p claw $SVC_FLAGS down
    ;;
  services:rebuild)
    preflight_up
    detect_gpu
    ensure_network
    SVC_FLAGS=$(build_svc_compose_flags)
    echo "Building backend + frontend services in parallel ($MODE mode, gpu=$GPU_VENDOR)..."
    # Split into explicit build + up so progress for the parallel build phase
    # is unambiguous and not interleaved with the container-start phase.
    # Docker Compose v2 builds across services concurrently by default; this
    # invocation passes no service list so every service in the stitched
    # compose files is included.
    # shellcheck disable=SC2086
    docker compose -p claw $SVC_FLAGS build --progress plain
    echo "Starting backend + frontend services..."
    # shellcheck disable=SC2086
    docker compose -p claw $SVC_FLAGS up -d --no-build
    ;;
  ollama:up)
    detect_gpu
    ensure_network
    OLLAMA_FLAGS=$(build_ollama_compose_flags)
    echo "Starting Ollama runtime ($MODE mode)..."
    # shellcheck disable=SC2086
    docker compose -p claw $OLLAMA_FLAGS up -d
    ;;
  ollama:down)
    OLLAMA_FLAGS=$(build_ollama_compose_flags)
    echo "Stopping Ollama runtime ($MODE mode)..."
    # shellcheck disable=SC2086
    docker compose -p claw $OLLAMA_FLAGS down
    ;;
  status)
    detect_gpu
    SVC_FLAGS=$(build_svc_compose_flags)
    OLLAMA_FLAGS=$(build_ollama_compose_flags)
    echo "=== ClawAI Status ($MODE mode, gpu=$GPU_VENDOR) ==="
    echo ""
    echo "--- Databases + Infrastructure ---"
    docker compose -p claw -f "$DB_FILE" ps
    echo ""
    echo "--- Backend + Frontend Services ---"
    # shellcheck disable=SC2086
    docker compose -p claw $SVC_FLAGS ps
    echo ""
    echo "--- Ollama Runtime ---"
    # shellcheck disable=SC2086
    docker compose -p claw $OLLAMA_FLAGS ps
    ;;
  gpu)
    # Diagnostic: show what GPU detection finds without starting anything.
    detect_gpu
    echo "GPU vendor: $GPU_VENDOR"
    if [ -n "$GPU_OVERLAY" ]; then
      echo "GPU overlay: $GPU_OVERLAY"
    fi
    ;;
  logs)
    SVC_FLAGS=$(build_svc_compose_flags)
    if [ -n "$2" ]; then
      # shellcheck disable=SC2086
      docker compose -p claw $SVC_FLAGS -f "$DB_FILE" -f "$OLLAMA_FILE" logs -f "$2"
    else
      # shellcheck disable=SC2086
      docker compose -p claw $SVC_FLAGS logs -f
    fi
    ;;
  *)
    echo "ClawAI Infrastructure Manager — THE canonical entrypoint"
    echo ""
    echo "Usage: ./scripts/claw.sh [--dev|--prod] <command>"
    echo ""
    echo "Flags:"
    echo "  --dev             Use development compose files (default)"
    echo "  --prod            Use production compose files"
    echo ""
    echo "  Environment variable CLAW_ENV=dev|prod also supported."
    echo ""
    echo "Commands:"
    echo "  up                Start everything (databases -> services -> ollama)"
    echo "  down              Stop everything (services -> ollama -> databases)"
    echo "  db:up             Start databases + infrastructure only"
    echo "  db:down           Stop databases + infrastructure only"
    echo "  services:up       Start backend + frontend services only"
    echo "  services:down     Stop backend + frontend services only"
    echo "  services:rebuild  Rebuild and start backend + frontend services"
    echo "  ollama:up         Start Ollama LLM runtime"
    echo "  ollama:down       Stop Ollama LLM runtime"
    echo "  status            Show status of all groups"
    echo "  gpu               Show detected GPU vendor + overlay file"
    echo "  logs [service]    Follow logs (optionally for a specific service)"
    echo ""
    echo "GPU passthrough is auto-detected on every up/services:up/services:rebuild:"
    echo "  - NVIDIA (CUDA)        — nvidia-smi found"
    echo "  - AMD ROCm             — /dev/kfd exists"
    echo "  - Intel/Vulkan         — /dev/dri/render* exists"
    echo "  - Apple Silicon Metal  — Docker can't access; runs CPU-only"
    echo ""
    echo "Examples:"
    echo "  ./scripts/claw.sh up                  # Dev (default), auto-GPU"
    echo "  ./scripts/claw.sh --prod up           # Production, auto-GPU"
    echo "  ./scripts/claw.sh gpu                 # Just probe and report"
    echo "  ./scripts/claw.sh --prod services:rebuild"
    ;;
esac
