# Skill: Docker Operations Toolkit

> Use this skill for all Docker-related operations: starting services, rebuilding containers, inspecting state, and diagnosing networking issues.

> **Base image:** all images are `node:26-bookworm-slim` (Debian/glibc), **never
> Alpine** — the tsgo and llama.cpp release binaries are glibc-linked. `scripts/claw.sh`
> is the only supported entrypoint (it stitches the split `docker/` compose files +
> the right GPU overlay); never call `docker compose -f …` directly. Build internals:
> [docs/08-runtime-devops/build-system.md](../docs/08-runtime-devops/build-system.md).

---

## Start/Stop Commands

```bash
# Start full dev environment (all 22+ containers)
./scripts/claw.sh up -d

# Start specific services
./scripts/claw.sh up -d chat-service connector-service

# Stop all services
./scripts/claw.sh down

# Stop without removing volumes (preserves DB data)
./scripts/claw.sh stop

# Check status of all containers
./scripts/claw.sh ps

# Alternative via management script
./scripts/claw.sh up
./scripts/claw.sh status
./scripts/claw.sh down
```

---

## Container Rebuild Procedure (MANDATORY for shared package changes)

**Always follow this exact 4-step sequence:**

```bash
# STEP 1: Stop the container
./scripts/claw.sh stop <service-name>

# STEP 2: Remove the container
./scripts/claw.sh rm -f <service-name>

# STEP 3: Remove the image
docker rmi claw-<service-name>

# STEP 4: Rebuild and start
./scripts/claw.sh service:rebuild <service-name>
```

NEVER skip steps. Never use `--build` alone without removing the old container and image first.

### When to restart, recreate, or rebuild

Three different things. Picking the weakest one that seems plausible is the
most common way to spend an hour on a change that never took effect — every
wrong choice here fails **silently**, with the old value still in place and no
error anywhere to say so.

| The change                                                                   | What it needs                                                                                  | Command                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `src/` code the hot-reloader missed                                          | restart                                                                                        | `docker restart claw-<service>`                |
| An `.env` value read at **runtime** (`AppConfig`, `process.env` server-side) | **recreate** — `env_file` is read when a container is _created_, never on restart              | `./scripts/claw.sh service:recreate <service>` |
| Any `NEXT_PUBLIC_*` value                                                    | **rebuild** — passed as a build arg and inlined by `next build`, so it lives in the shipped JS | `./scripts/claw.sh service:rebuild frontend`   |
| `package.json` deps, a shared package, a Prisma schema, a Dockerfile         | **rebuild**                                                                                    | `./scripts/claw.sh service:rebuild <service>`  |
| A compose file edit                                                          | **recreate**                                                                                   | `./scripts/claw.sh service:recreate <service>` |

Add `--prod` before the command on a production box.

**`claw.sh up` takes no service argument.** `./scripts/claw.sh up -d frontend`
does not act on the frontend — the argument is ignored and the _entire stack_
comes up, recreating containers you did not intend to touch. Use
`service:recreate` / `service:rebuild` for one service.

A `.env` edit also survives no deployment on its own: `deploy-prod.sh` rebuilds
only the services the deployed **commit** touches, and `.env` is untracked host
state its planner cannot see. Change a value on the box, then recreate or
rebuild that service by hand.

Prompt-plan or docs-only edits under `plan-prompts/` do not require a Docker action at all.

---

## Shared Package Rebuild (Cascading Rebuild)

When any of these change:

- `packages/shared-types`
- `packages/shared-constants`
- `packages/shared-rabbitmq`
- `packages/shared-auth`

Rebuild ALL services that depend on them:

```bash
# Rebuild all services (nuclear option)
./scripts/claw.sh down
docker rmi $(docker images "claw-*" -q)
# db:up first — `down` stopped the databases too, and services:rebuild only
# covers the services group. Skipping it starts eighteen services against
# nothing to connect to.
./scripts/claw.sh db:up
./scripts/claw.sh services:rebuild
```

---

## Log Inspection

```bash
# Follow logs in real-time
./scripts/claw.sh logs -f chat-service

# Last N lines
./scripts/claw.sh logs --tail=50 connector-service

# Logs since N minutes ago
./scripts/claw.sh logs --since="5m" routing-service

# Search for errors
./scripts/claw.sh logs connector-service --tail=200 | \
  grep -E "ERROR|FATAL|UnhandledPromiseRejection"

# Multiple services
./scripts/claw.sh logs chat-service routing-service --tail=30
```

---

## Container Shell Access

```bash
# Open bash in a running container
docker exec -it claw-chat-service bash

# Run a one-off command
docker exec claw-chat-service node -e "console.log(process.env.CHAT_PORT)"

# Check environment variables
docker exec claw-chat-service env | grep -E "DATABASE|PORT|SERVICE"
```

---

## Database Shell Access

```bash
# PostgreSQL interactive shell
docker exec -it claw-db-chat psql -U claw_user -d claw_chat

# PostgreSQL one-off query
docker exec claw-db-chat psql -U claw_user -d claw_chat \
  -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# MongoDB shell
docker exec -it claw-mongo mongosh
docker exec -it claw-mongo mongosh claw_audit

# Redis CLI
docker exec -it claw-redis redis-cli
```

---

## Networking Diagnostics

```bash
# Test service-to-service connectivity from inside Docker
docker exec claw-connector-service wget -qO- http://ollama:11434/api/tags
docker exec claw-chat-service curl -s http://claw-routing-service:4004/health

# Check container network
docker inspect claw-chat-service | jq '.[0].NetworkSettings.Networks'

# List all containers on claw-network
docker network inspect claw-network | jq '.[0].Containers | to_entries | .[] | .value.Name'

# DNS resolution test from inside container
docker exec claw-connector-service nslookup ollama
docker exec claw-connector-service nslookup claw-chat-service
```

---

## Docker System Cleanup

```bash
# Remove stopped containers
docker container prune -f

# Remove dangling images
docker image prune -f

# Remove unused volumes (WARNING: removes DB data too if containers stopped)
docker volume prune -f

# Remove all claw images (for clean rebuild)
docker rmi $(docker images "claw-*" -q) 2>/dev/null || true

# Full nuclear cleanup (removes ALL unused Docker resources)
docker system prune -f
```

---

## Health Check Verification

```bash
# Check all service health via health service
curl -s http://localhost:4009/api/v1/health | jq .

# Check individual service health
curl -s http://localhost:4001/health  # auth
curl -s http://localhost:4002/health  # chat
curl -s http://localhost:4003/health  # connector
curl -s http://localhost:4004/health  # routing
curl -s http://localhost:4008/health  # ollama

# Check via nginx
curl -s http://localhost:4000/api/v1/health | jq .
```

---

## Ollama-Specific Commands

```bash
# Check Ollama API directly
curl -s http://localhost:11434/api/tags | jq .

# Pull a model
curl -X POST http://localhost:11434/api/pull \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3:1.7b"}'

# List running models
curl -s http://localhost:11434/api/ps | jq .

# From inside Docker (use service name)
docker exec claw-connector-service curl -s http://ollama:11434/api/tags | jq .
```

---

## RabbitMQ Management

```bash
# Open management UI
# http://localhost:15672 (user/pass from .env: RABBITMQ_USER/RABBITMQ_PASSWORD)

# List all queues
curl -s -u admin:admin http://localhost:15672/api/queues/%2F/ | \
  jq '.[] | {name: .name, messages: .messages, consumers: .consumers}'

# Purge a queue (clear all messages)
curl -s -u admin:admin -X DELETE \
  "http://localhost:15672/api/queues/%2F/claw.events.dlq/contents"

# Check DLQ for failed messages
curl -s -u admin:admin http://localhost:15672/api/queues/%2F/claw.events.dlq | \
  jq '{messages: .messages}'
```
