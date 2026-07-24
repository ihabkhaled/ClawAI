---
name: create-microservice
summary: Add a new NestJS microservice to the ClawAI monorepo and wire it into every infra surface.
task_keywords:
  [
    new service,
    microservice,
    scaffold service,
    add service,
    nestjs service,
    new backend service,
    wire service,
    service port,
    compose files,
    nginx upstream,
    health service,
    ci matrix,
  ]
applies_to: [backend, infra, apps/claw-<service>-service]
required_rules: [02-backend-rules, 05-infra-rules, 08-security-rules, 06-docs-rules]
required_context: [ai-context-pack, codebase-navigation, system-architecture, data-ownership]
affected_workspaces:
  [
    apps/claw-<service>-service,
    packages/shared-constants,
    packages/shared-types,
    apps/claw-health-service,
    apps/claw-frontend,
  ]
required_tests: [unit (jest *.spec.ts), health endpoint smoke, qa/test-<service>.sh]
required_docs:
  [docs/04-backend/service-guide-<service>.md, docs/04-backend/services-index.md, CLAUDE.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a New Microservice

This skill EXTENDS the mechanical 12-step wiring in [`./02-service-scaffold.md`](./02-service-scaffold.md). Read that first for the exact YAML/nginx/CI snippets. This file adds the resolver, tests-first, and per-folder-gate framing the older skill predates. Do not duplicate the 12 steps here.

## When to use

- A genuinely new bounded context is needed that no existing service owns (new DB, new domain, new port after 4017).
- The work cannot be a module inside an existing service (if it can, use [`./create-backend-module.md`](./create-backend-module.md) instead).

## When NOT to use

- The feature fits an existing service's domain — add a module, not a service.
- You only need a new endpoint or event on an existing service.
- You are extending a layer that already solves the problem class (see the extend-don't-parallelize mindset in root `CLAUDE.md`).

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md) — run the resolver to surface the exact rules/docs for this task.
- [`./02-service-scaffold.md`](./02-service-scaffold.md) — the 12 wiring steps (compose, nginx, CI, health).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md), [`../rules/05-infra-rules.md`](../rules/05-infra-rules.md), [`../rules/08-security-rules.md`](../rules/08-security-rules.md).
- [`../docs/03-architecture/data-ownership.md`](../docs/03-architecture/data-ownership.md) — confirm the new service owns its own DB and crosses boundaries only via HTTP or RabbitMQ.

## Repository discovery steps

1. `npm run knowledge:context -- --task="add <name> service"` — surface the ranked rules/skills.
2. Pick the closest existing service (e.g. `apps/claw-ollama-service`) as the boilerplate donor — read its layout under `src/app`, `src/modules`, `src/common`.
3. Confirm the next free port from `packages/shared-constants` (current max is 4017).
4. Grep every place a sibling service name appears in infra to build your wiring checklist: `docker/docker-compose.*.yml`, `infra/nginx/nginx.conf`, `.github/workflows/ci.yml`, `apps/claw-health-service`.

## Tests-first plan

- Write a `*.spec.ts` for the first service method and its DTO (happy + boundary + invalid) BEFORE the implementation.
- Add a health-endpoint smoke assertion (`GET /health → { status: 'ok', service }`).
- Seed `qa/test-<service>.sh` with auth + one happy path + one 400 + DB verification + a Docker-log scan.

## Implementation steps

1. Copy the donor service to `apps/claw-<service>-service`; rename `package.json`, imports, `prisma/schema.prisma` provider + env name.
2. Define config in `src/app/config/app.config.ts` (Zod-validated AppConfig) — never `process.env` directly (see [`./add-config-value.md`](./add-config-value.md)).
3. Add the port + service name to `packages/shared-constants`; add any published event patterns to `packages/shared-types` (see [`./add-rabbitmq-event.md`](./add-rabbitmq-event.md)).
4. Wire ALL split compose files: `docker/docker-compose.dev.{databases,services,ollama}.yml` and `docker/docker-compose.prod.{databases,services}.yml`, plus GPU overlays only if it needs passthrough. DB → databases files; service → services files; volumes declared in every file that references them.
5. Add nginx upstream + `/api/v1/<name>/` location block (SSE routes need `proxy_buffering off`).
6. Register the service URL in `apps/claw-health-service`.
7. CI needs BOTH edits per job in `.github/workflows/ci.yml`: the Prisma generate loop entry AND the test env vars — and, for any NEW shared package, the build-step `cd` line plus the `strategy.matrix.include` entry (all four jobs).
8. Add env vars to `.env`, `.env.example`, `scripts/install.sh`, `scripts/install.ps1`; append the docker hostname to `scripts/install-tls.{sh,ps1}` HOSTS.
9. Build controller → service → repository → module per [`./create-controller.md`](./create-controller.md), [`./create-service.md`](./create-service.md), [`./create-repository.md`](./create-repository.md).

## Security considerations

- Every endpoint carries an auth guard from `@claw/shared-auth` or an explicit `@Public()`; add `RequirePermissions` where role gating applies.
- Helmet, throttler, Zod validation, and Pino redaction come from the donor — do not strip them.
- Never expose encrypted config, tokens, or password hashes; strip them in the repository mapping.

## Failure modes

- DB added to one compose file only → `container not found` on deploy. Add to all.
- New shared package missing from CI matrix → its lint/typecheck/test silently never runs.
- Missing TLS SAN → inter-service HTTPS calls fail with `Hostname/IP doesn't match certificate`.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

Then `./scripts/claw.sh up -d --build claw-<service>-service` and `curl http://localhost:4000/api/v1/<name>/health`. Run only per-touched-folder gates; never all-workspace.

## Documentation updates

- `docs/04-backend/service-guide-<service>.md`, `docs/04-backend/services-index.md`, root `CLAUDE.md` workspace + nginx + event tables, and `apps/claw-<service>-service/CLAUDE.md`.

## Definition of done

- All infra surfaces wired, gates green in the touched folder, health reachable through nginx, QA script passes 0 failures, docs updated.
