# ClawAI — Skills Index

> This folder contains god-mode operational skills for AI agents working on ClawAI. Each skill is a self-contained runbook for a specific task. Use these to execute common operations correctly, quickly, and without asking for clarification.

---

## Available Skills

| Skill                      | File                        | When to Use                                                               |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| Codebase Navigation        | `01-codebase-navigation.md` | Finding files, understanding code flow, tracing a feature end-to-end      |
| New Service Scaffolding    | `02-service-scaffold.md`    | Adding the next NestJS service (the monorepo already has 17 + a frontend) |
| New Feature Scaffolding    | `03-feature-scaffold.md`    | Adding a backend + frontend feature within an existing service            |
| Debug Toolkit              | `04-debug-toolkit.md`       | Diagnosing errors, tracing RabbitMQ events, checking Docker logs          |
| QA Automation Toolkit      | `05-qa-toolkit.md`          | Writing and running QA scripts, API fuzzing, DB verification              |
| Docker Operations          | `06-docker-toolkit.md`      | Container management, rebuild procedures, networking                      |
| Prisma / Database Toolkit  | `07-database-toolkit.md`    | Migrations, seeding, query patterns, pgvector                             |
| RabbitMQ Event Bus Toolkit | `08-event-bus-toolkit.md`   | Publishing events, consuming events, DLQ inspection                       |
| Refactor Toolkit           | `09-refactor-toolkit.md`    | Per-service refactor: dedup, extraction, splits, logging, coverage        |

---

## Key Reference Docs

These `docs/` pages answer the questions skills most often depend on:

| Question                                                         | Doc                                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| How does the build/compile work? (tsgo, tsc-alias, tsconfig, CI) | [docs/08-runtime-devops/build-system.md](../docs/08-runtime-devops/build-system.md)             |
| What port / database does service X use?                         | [docs/08-runtime-devops/port-service-map.md](../docs/08-runtime-devops/port-service-map.md)     |
| How does a request flow across services?                         | [docs/03-architecture/end-to-end-data-flow.md](../docs/03-architecture/end-to-end-data-flow.md) |
| Something is broken — which runbook?                             | [docs/11-runbooks/README.md](../docs/11-runbooks/README.md)                                     |
| Every event producer/consumer                                    | [docs/03-architecture/event-bus.md](../docs/03-architecture/event-bus.md)                       |
| Per-service deep dive                                            | [docs/04-backend/service-guide-<name>.md](../docs/04-backend/)                                  |
| All env vars                                                     | [docs/06-data/environment-variables.md](../docs/06-data/environment-variables.md)               |

> **Build reminder:** the repo uses **tsgo** (`@typescript/native-preview`) +
> `tsc-alias`, NOT `tsc`/`nest build`. `npm run build/typecheck/dev` already
> wrap tsgo per workspace. Docker images are `node:26-bookworm-slim` (glibc).

---

## How to Use This Folder

1. Identify the type of task you are about to perform
2. Open the relevant skill file
3. Follow the runbook step-by-step
4. If the skill file does not cover your case, check `rules/` for constraints first

---

## Skill Update Rule

When you discover a new technique, shortcut, or pattern that isn't documented here, add it to the relevant skill file immediately. Skills rot when they go stale — keep them current.

---

## Quick-Reference Card

### Find anything in the codebase

```bash
# Find a file
find apps/ -name "*.ts" | xargs grep -l "keyword"

# Find a function
grep -r "functionName" apps/ --include="*.ts" -l

# Find all usages of an enum value
grep -r "ModelLifecycle.ACTIVE" apps/ --include="*.ts"

# Find all endpoints
grep -r "@Get\|@Post\|@Put\|@Patch\|@Delete" apps/ --include="*.controller.ts" -l
```

### Run the full quality suite

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

### Check a service is healthy

```bash
curl -s http://localhost:4003/health | jq .
./scripts/claw.sh ps connector-service
```

### Get auth token for API testing

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.ai","password":"Admin123!"}' | jq -r '.accessToken')
echo $TOKEN
```

### Tail service logs

```bash
./scripts/claw.sh logs -f chat-service
./scripts/claw.sh logs connector-service --tail=50
```
