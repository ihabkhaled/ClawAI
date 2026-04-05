#!/bin/bash
# =============================================================================
# ClawAI Infrastructure Manager
# =============================================================================
# Granular control over database, service, and Ollama groups.
# Supports both dev and prod modes via --dev / --prod flags or CLAW_ENV variable.
#
# Usage:
#   ./scripts/claw.sh [--dev|--prod] <command>
#   CLAW_ENV=prod ./scripts/claw.sh <command>
# =============================================================================

set -e

# Resolve the project root (parent of the scripts/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Default to dev mode, allow override via CLAW_ENV
MODE="${CLAW_ENV:-dev}"

# Parse --dev / --prod flags (remove them from positional args)
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --prod) MODE="prod" ;;
    --dev)  MODE="dev" ;;
    *)      ARGS+=("$arg") ;;
  esac
done
set -- "${ARGS[@]}"

# Select compose files based on mode
if [ "$MODE" = "prod" ]; then
  DB_FILE="$PROJECT_ROOT/docker-compose.prod.databases.yml"
  SVC_FILE="$PROJECT_ROOT/docker-compose.prod.services.yml"
  OLLAMA_FILE="$PROJECT_ROOT/docker-compose.prod.ollama.yml"
else
  DB_FILE="$PROJECT_ROOT/docker-compose.dev.databases.yml"
  SVC_FILE="$PROJECT_ROOT/docker-compose.dev.services.yml"
  OLLAMA_FILE="$PROJECT_ROOT/docker-compose.dev.ollama.yml"
fi

case "$1" in
  up)
    echo "Starting all ClawAI services ($MODE mode)..."
    docker compose -f "$DB_FILE" up -d
    echo "Waiting for databases to become healthy..."
    sleep 10
    docker compose -f "$SVC_FILE" up -d
    echo "Starting Ollama runtime..."
    docker compose -f "$OLLAMA_FILE" up -d
    echo "All services started."
    ;;
  down)
    echo "Stopping all ClawAI services ($MODE mode)..."
    docker compose -f "$SVC_FILE" down
    docker compose -f "$OLLAMA_FILE" down
    docker compose -f "$DB_FILE" down
    echo "All services stopped."
    ;;
  db:up)
    echo "Starting databases + infrastructure ($MODE mode)..."
    docker compose -f "$DB_FILE" up -d
    ;;
  db:down)
    echo "Stopping databases + infrastructure ($MODE mode)..."
    docker compose -f "$DB_FILE" down
    ;;
  services:up)
    echo "Starting backend + frontend services ($MODE mode)..."
    docker compose -f "$SVC_FILE" up -d
    ;;
  services:down)
    echo "Stopping backend + frontend services ($MODE mode)..."
    docker compose -f "$SVC_FILE" down
    ;;
  services:rebuild)
    echo "Rebuilding and starting backend + frontend services ($MODE mode)..."
    docker compose -f "$SVC_FILE" up -d --build
    ;;
  ollama:up)
    echo "Starting Ollama runtime ($MODE mode)..."
    docker compose -f "$OLLAMA_FILE" up -d
    ;;
  ollama:down)
    echo "Stopping Ollama runtime ($MODE mode)..."
    docker compose -f "$OLLAMA_FILE" down
    ;;
  status)
    echo "=== ClawAI Status ($MODE mode) ==="
    echo ""
    echo "--- Databases + Infrastructure ---"
    docker compose -f "$DB_FILE" ps
    echo ""
    echo "--- Backend + Frontend Services ---"
    docker compose -f "$SVC_FILE" ps
    echo ""
    echo "--- Ollama Runtime ---"
    docker compose -f "$OLLAMA_FILE" ps
    ;;
  logs)
    if [ -n "$2" ]; then
      docker compose -f "$SVC_FILE" -f "$DB_FILE" -f "$OLLAMA_FILE" logs -f "$2"
    else
      docker compose -f "$SVC_FILE" logs -f
    fi
    ;;
  *)
    echo "ClawAI Infrastructure Manager"
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
    echo "  logs [service]    Follow logs (optionally for a specific service)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/claw.sh up                  # Dev mode (default)"
    echo "  ./scripts/claw.sh --prod up            # Production mode"
    echo "  ./scripts/claw.sh --prod services:rebuild"
    echo "  CLAW_ENV=prod ./scripts/claw.sh status"
    ;;
esac
