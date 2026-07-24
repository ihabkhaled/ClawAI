---
name: create-backend-module
summary: Add a NestJS feature module (module, controller, service, repository, dto, types) inside an existing service.
task_keywords:
  [
    new module,
    feature module,
    nestjs module,
    add controller service repository,
    domain module,
    module wiring,
    src/modules,
    add feature to service,
  ]
applies_to: [backend, apps/claw-<service>-service/src/modules/<domain>]
required_rules: [02-backend-rules, 04-testing-rules, 08-security-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [unit (jest *.spec.ts) for service + dto, controller smoke]
required_docs: [docs/04-backend/service-guide-<service>.md, service CLAUDE.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Backend Feature Module

A NestJS feature module lives under `apps/claw-<service>-service/src/modules/<domain>/` and bundles a controller, service, repository, DTOs, types, and a `*.module.ts` that registers them. Use it when the work belongs to an existing service's bounded context.

## When to use

- Adding a new domain concept (e.g. `templates`, `webhooks`) to a service that already owns the data.
- Grouping related endpoints + events + persistence under one cohesive module.

## When NOT to use

- The domain needs its own database or crosses a service boundary → use [`./create-microservice.md`](./create-microservice.md).
- You only need one extra endpoint on an existing module → just add controller + service methods.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — layer boundaries, no-inline-declaration rule.
- The target service's `CLAUDE.md` and its `docs/04-backend/service-guide-<service>.md`.

## Repository discovery steps

1. `npm run knowledge:context -- --task="add <domain> module to <service>"`.
2. Read an existing sibling module in the same service to mirror its folder shape (`dto/`, `types/`, `constants/`, `repositories/`, `services/`, `managers/`).
3. Confirm the module is registered in `AppModule` and check how sibling modules import `PrismaModule`/`RabbitMQModule`.

## Tests-first plan

- Write `service.spec.ts` for each public method (happy, boundary, null, invalid, error path).
- Write DTO fuzz tests (valid + `.max()` boundary + invalid + empty/overflow).
- Add a controller smoke test asserting it delegates to the service (3-line methods).

## Implementation steps

1. Create the folder: `src/modules/<domain>/` with subfolders `dto/`, `types/`, `constants/`, `enums` go to `src/common/enums/`.
2. DTOs → `dto/<name>.dto.ts` (Zod, export schema + inferred type) per [`./create-dto.md`](./create-dto.md).
3. Types → `types/<name>.types.ts`; enums → `src/common/enums/`; constants → `constants/<name>.constants.ts`. No inline declarations in logic files.
4. Repository → `<domain>.repository.ts` per [`./create-repository.md`](./create-repository.md).
5. Service → `<domain>.service.ts` (≤30 lines/method, ownership checks, event publishing) per [`./create-service.md`](./create-service.md).
6. Manager → only if orchestration/external calls are needed, per [`./create-manager-or-use-case.md`](./create-manager-or-use-case.md).
7. Controller → `<domain>.controller.ts` (3-line methods, guards) per [`./create-controller.md`](./create-controller.md).
8. Module → `<domain>.module.ts` registers controller + providers; import it into `AppModule`.
9. Wire events via `packages/shared-types` + `RabbitMQService` if the module publishes (see [`./add-rabbitmq-event.md`](./add-rabbitmq-event.md)).

## Security considerations

- Ownership/permission checks live in the service layer, not the controller or repository.
- Apply `RequirePermissions` from `@claw/shared-auth` for gated actions (see [`./add-permission.md`](./add-permission.md)).
- Never return sensitive columns; strip them in the repository mapping.

## Failure modes

- Module created but not imported into `AppModule` → routes 404.
- Inline `type`/`enum`/`const` in logic files → ESLint `no-restricted-syntax` failure.
- Repository throwing instead of returning null → violates repository rule.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Update `docs/04-backend/service-guide-<service>.md` with the new module + endpoints.
- Update the service `CLAUDE.md` if a new pattern was introduced.

## Definition of done

- Module registered, layered per the rules, tests green ≥92% coverage, docs updated, gates green in the touched folder only.
