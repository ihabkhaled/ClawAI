#!/bin/bash
# ClawAI Infrastructure Manager
# Granular control over database, service, and Ollama groups.
# The original docker-compose.dev.yml remains the all-in-one option.

set -e

# Resolve the project root (parent of the scripts/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_FILE="$PROJECT_ROOT/docker-compose.databases.yml"
SVC_FILE="$PROJECT_ROOT/docker-compose.services.yml"
OLLAMA_FILE="$PROJECT_ROOT/docker-compose.ollama.yml"

case "$1" in
  up)
    echo "Starting all ClawAI services..."
    docker compose -f "$DB_FILE" up -d
    echo "Waiting for databases to become healthy..."
    sleep 10
    docker compose -f "$SVC_FILE" up -d
    echo "Starting Ollama runtime..."
    docker compose -f "$OLLAMA_FILE" up -d
    echo "All services started."
    ;;
  down)
    echo "Stopping all ClawAI services..."
    docker compose -f "$SVC_FILE" down
    docker compose -f "$OLLAMA_FILE" down
    docker compose -f "$DB_FILE" down
    echo "All services stopped."
    ;;
  db:up)
    echo "Starting databases + infrastructure..."
    docker compose -f "$DB_FILE" up -d
    ;;
  db:down)
    echo "Stopping databases + infrastructure..."
    docker compose -f "$DB_FILE" down
    ;;
  services:up)
    echo "Starting backend + frontend services..."
    docker compose -f "$SVC_FILE" up -d
    ;;
  services:down)
    echo "Stopping backend + frontend services..."
    docker compose -f "$SVC_FILE" down
    ;;
  services:rebuild)
    echo "Rebuilding and starting backend + frontend services..."
    docker compose -f "$SVC_FILE" up -d --build
    ;;
  ollama:up)
    echo "Starting Ollama runtime..."
    docker compose -f "$OLLAMA_FILE" up -d
    ;;
  ollama:down)
    echo "Stopping Ollama runtime..."
    docker compose -f "$OLLAMA_FILE" down
    ;;
  status)
    echo "=== Databases + Infrastructure ==="
    docker compose -f "$DB_FILE" ps
    echo ""
    echo "=== Backend + Frontend Services ==="
    docker compose -f "$SVC_FILE" ps
    echo ""
    echo "=== Ollama Runtime ==="
    docker compose -f "$OLLAMA_FILE" ps
    ;;
  logs)
    docker compose -f "$SVC_FILE" logs -f ${2:-}
    ;;
  *)
    echo "ClawAI Infrastructure Manager"
    echo ""
    echo "Usage: ./scripts/claw.sh <command>"
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
    echo "All-in-one alternative:"
    echo "  docker compose -f docker-compose.dev.yml up -d"
    ;;
esac
