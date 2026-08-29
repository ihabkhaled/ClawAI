# ClawAI — Skills Index

> This folder contains god-mode operational skills for AI agents working on ClawAI. Each skill is a self-contained runbook for a specific task. Use these to execute common operations correctly, quickly, and without asking for clarification.

---

## Available Skills

| Skill                                    | File                                 | When to Use                                                                                                                                          |
| ---------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codebase Navigation                      | `01-codebase-navigation.md`          | Finding files, understanding code flow, tracing a feature end-to-end                                                                                 |
| New Service Scaffolding                  | `02-service-scaffold.md`             | Adding the next NestJS service (the monorepo already has 17 + a frontend)                                                                            |
| New Feature Scaffolding                  | `03-feature-scaffold.md`             | Adding a backend + frontend feature within an existing service                                                                                       |
| Debug Toolkit                            | `04-debug-toolkit.md`                | Diagnosing errors, tracing RabbitMQ events, checking Docker logs                                                                                     |
| QA Automation Toolkit                    | `05-qa-toolkit.md`                   | Writing and running QA scripts, API fuzzing, DB verification                                                                                         |
| Docker Operations                        | `06-docker-toolkit.md`               | Container management, rebuild procedures, networking                                                                                                 |
| Prisma / Database Toolkit                | `07-database-toolkit.md`             | Migrations, seeding, query patterns, pgvector                                                                                                        |
| RabbitMQ Event Bus Toolkit               | `08-event-bus-toolkit.md`            | Publishing events, consuming events, DLQ inspection                                                                                                  |
| Refactor Toolkit                         | `09-refactor-toolkit.md`             | Per-service refactor: dedup, extraction, splits, logging, coverage                                                                                   |
| Commit and Push Each Change              | `commit-and-push-each-change.md`     | Landing work: one gated commit, pushed before the next one starts                                                                                    |
| Reconcile Billing State                  | `reconcile-billing-state.md`         | Diagnose, run, and verify owner-safe billing reconciliation                                                                                          |
| Debug a Stuck Scheduled Job              | `debug-a-stuck-scheduled-job.md`     | Recover locked, crashed, or incomplete bounded scheduled work                                                                                        |
| Add a Payment Gateway Flow               | `add-a-payment-gateway-flow.md`      | Add verified, idempotent, redacted provider payment behavior                                                                                         |
| Deadlock Recovery                        | `deadlock-recovery.md`               | Reasoning stuck (rabbit hole) or activity looping with no progress (deadlock/livelock)                                                               |
| Reasoning Balance                        | `reasoning-balance.md`               | Deciding whether to keep investigating or start executing (over- vs under-thinking)                                                                  |
| Blocker Validation                       | `blocker-validation.md`              | Before declaring "Blocked:" — checklist for a real blocker vs. an excuse to stop                                                                     |
| Add an App Route (page)                  | `add-app-route.md`                   | Adding a new navigable screen to the portal that needs a URL, sidebar entry, and route constant.                                                     |
| Publish a Public Marketing Page          | `publish-a-public-marketing-page.md` | Adding an indexable page under `(marketing)`: registry entry, 13-locale SEO copy, Lighthouse URL, internal links, coverage tests.                    |
| Add a Config Value                       | `add-config-value.md`                | A new tunable, threshold, feature flag, timeout, URL, or credential reference is needed by a service.                                                |
| Add an Event Consumer                    | `add-event-consumer.md`              | A service must react to another service's event (audit logging, cache invalidation, downstream sync).                                                |
| Add a Library Adapter / Wrapper          | `add-library-adapter.md`             | Introducing a new npm package (HTTP SDK, PDF renderer, diffusion client, etc.) into a service.                                                       |
| Add a Migration                          | `add-migration.md`                   | Any `schema.prisma` change (new model, column, index, relation, enum value).                                                                         |
| Add a Permission                         | `add-permission.md`                  | A new endpoint or action needs its own authorization gate distinct from existing permissions.                                                        |
| Meter a Paid Provider Call               | `meter-a-paid-provider-call.md`      | Adding ANY new code path that calls a paid cloud model. Reserve/finalize/release, the requestId, the PaygSurface, the 402.                           |
| Deploy PAYG Credit                       | `deploy-payg-credit.md`              | Shipping or rolling back the connector-credit wallet. Boot order, seed verification, kill switch.                                                    |
| Add a Prisma Model                       | `add-prisma-model.md`                | A new persisted entity is needed inside a service's bounded context.                                                                                 |
| Add an AI Provider Connector             | `add-provider-connector.md`          | Onboarding a new upstream AI provider with its own auth, model list, and health semantics.                                                           |
| Add a RabbitMQ Event                     | `add-rabbitmq-event.md`              | A domain state change should notify other services (created/updated/deleted, completed, health-checked, synced, etc.).                               |
| Add a Workspace Connector                | `add-workspace-connector.md`         | Onboarding a new SaaS/productivity provider that needs OAuth, webhook ingestion, and background sync.                                                |
| backend-architecture-review.md           | `backend-architecture-review.md`     | See the runbook.                                                                                                                                     |
| Skill — communicate briefly              | `communicate-briefly.md`             | See the runbook.                                                                                                                                     |
| Create a Backend Feature Module          | `create-backend-module.md`           | Adding a new domain concept (e.g. `templates`, `webhooks`) to a service that already owns the data. - Grouping related endpoints + events + persi…   |
| Create a Client Container                | `create-client-container.md`         | A page/section needs interactivity (`'use client'`) and must connect a controller hook to a presentational subtree.                                  |
| Create a Controller                      | `create-controller.md`               | Exposing a new endpoint on an existing or new module.                                                                                                |
| Create a DTO                             | `create-dto.md`                      | Adding or changing a request body, query, or event payload shape.                                                                                    |
| Create a Frontend Module (feature slice) | `create-frontend-module.md`          | Adding a brand-new user-facing area (list + detail + create/edit) that spans a page, hooks, repository, and i18n.                                    |
| Create a Manager / Use Case              | `create-manager-or-use-case.md`      | Chaining multiple external calls (LLM providers, connector adapters) with retries or fallback.                                                       |
| Create a New Microservice                | `create-microservice.md`             | A genuinely new bounded context is needed that no existing service owns (new DB, new domain, new port after 4017).                                   |
| Create a Presentational Component        | `create-presentational-component.md` | Adding a card, row, badge, list item, form field, or any pure-render piece driven by props.                                                          |
| Create a Query Hook (useQuery)           | `create-query.md`                    | Reading a list or a single entity from the backend (`/api/v1/...` via nginx).                                                                        |
| Create a Repository                      | `create-repository.md`               | Adding persistence for a new model or a new query on an existing model.                                                                              |
| Create a Service                         | `create-service.md`                  | Implementing the behaviour behind a controller endpoint.                                                                                             |
| Create a View-Model (Controller) Hook    | `create-view-model-hook.md`          | A page/container needs data + handlers wired together behind one `use<Domain>Page()` call.                                                           |
| debug-flaky-test.md                      | `debug-flaky-test.md`                | A test fails intermittently in CI or locally without a code change.                                                                                  |
| does the shape exist at all?             | `execute-prompt-pack.md`             | Whenever work arrives as a document rather than a one-line request: a prompt pack, an execution prompt, a plan pack, an implementation brief.        |
| frontend-architecture-review.md          | `frontend-architecture-review.md`    | See the runbook.                                                                                                                                     |
| increase-coverage-correctly.md           | `increase-coverage-correctly.md`     | A workspace's coverage is below the target in [`../testing/coverage-policy.md`](../testing/coverage-policy.md), or your change dropped it.           |
| Reuse Before Creating                    | `reuse-before-creating.md`           | You are about to write a utility, type, constant, enum, guard, or adapter.                                                                           |
| security-review.md                       | `security-review.md`                 | See the runbook.                                                                                                                                     |
| write-api-contract-tests.md              | `write-api-contract-tests.md`        | When a DTO/schema is consumed by more than one place (another service via HTTP, the frontend, or a shared package) and you need to prove a change t… |
| write-backend-e2e-tests.md               | `write-backend-e2e-tests.md`         | For any endpoint whose correctness depends on the full request pipeline — guards, interceptors, validation pipes, the exception filter — not just t… |
| Write Integration Tests                  | `write-integration-tests.md`         | A feature spans multiple modules or multiple services (e.g.                                                                                          |
| Write Service-Layer Tests                | `write-service-tests.md`             | New/changed `*.service.ts` or `*.manager.ts` method.                                                                                                 |
| Write Unit Tests                         | `write-unit-tests.md`                | New/changed utility in `src/common/utilities/` or `packages/shared-utilities/`.                                                                      |
| Grow the Knowledge Layer                 | `grow-the-knowledge-layer.md`        | Every change: work out which rules/skills/docs/.ai files must move with the code (rule 33)                                                           |
| Run the Gates Once and Land              | `run-gates-once-and-land.md`         | Proving a change green once, landing it, and giving the machine back (rule 34)                                                                       |

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

## Generated artifacts are a HARD GATE (never optional)

`.ai/**`, every workspace `AGENTS.md`, and
`docs/features/ai-native-engineering-os/inventory.snapshot.json` are
**generated from the tree**. CI verifies them on every push:

| CI job              | Command                    | Fails when                                                           |
| ------------------- | -------------------------- | -------------------------------------------------------------------- |
| Knowledge freshness | `npm run knowledge:check`  | a generated file's hash no longer matches the tree                   |
| Knowledge integrity | `npm run knowledge:verify` | stale file, broken link, orphan reviewer, hook-bypass, contradiction |
| Inventory audit     | `npm run audit:check`      | the inventory snapshot hash has drifted                              |

**A stale artifact turns the build red on every subsequent push**, for everyone,
until someone regenerates it. It is not a warning and it is not deferrable.

### The rule

Any commit that touches `packages/**`, `apps/**`, `infra/**`, `docker/**`,
`docs/**`, `scripts/**`, `rules/**`, `skills/**`, `tools/**` or `.env.example`
MUST regenerate and stage:

```bash
npm run knowledge:build      # rewrites .ai/** + workspace AGENTS.md
npm run audit                # rewrites the inventory snapshot
git add .ai docs/features/ai-native-engineering-os/inventory.snapshot.json
git add apps/*/AGENTS.md packages/*/AGENTS.md 2>/dev/null
npm run knowledge:verify     # what CI runs
npm run audit:check          # what CI runs
```

The pre-commit hook now does all of this **automatically**, so in normal use
there is nothing to remember. The rule is written down because the hook can be
skipped (it must not be) and because a red CI needs a documented fix.

### Order matters — regenerate AFTER formatting, never before

This is the mistake that actually caused a red build:

1. `npm run knowledge:build` — hashes the current bytes
2. `git add` / commit — **lint-staged reformats the staged files**
3. the reformatted bytes no longer match the hashes recorded in step 1
4. `knowledge:check` passes locally (it ran before the reformat) but
   `knowledge:verify` fails in CI

Generators must run **after** prettier and `eslint --fix` have settled. The
pre-commit hook is ordered that way deliberately: lint-staged is step 1,
regeneration is step 2.

### Never hand-edit a generated artifact

If a generated file is wrong, fix the **generator or its input**, then
regenerate. Editing `.ai/manifests/*.json` or a workspace `AGENTS.md` by hand is
overwritten on the next build and hides the real problem.
