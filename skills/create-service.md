---
name: create-service
summary: Write a service-layer class with ≤30-line methods, ownership checks, and event publishing.
task_keywords:
  [
    service layer,
    business logic,
    service method,
    ownership check,
    permission check,
    publish event,
    nestjs service,
    30 lines,
    businessexception,
  ]
applies_to: [backend, apps/claw-<service>-service/src/modules/<domain>]
required_rules: [02-backend-rules, 08-security-rules, 04-testing-rules]
required_context: [ai-context-pack, event-bus, data-ownership]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [unit (jest *.spec.ts) per method incl. error path]
required_docs: [docs/04-backend/service-guide-<service>.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Service

The service layer holds business logic: ownership and permission checks, orchestration of repositories, and event publishing. Every public method does ONE thing and stays within 30 lines / complexity 10.

## When to use

- Implementing the behaviour behind a controller endpoint.
- Adding ownership-validated CRUD or a domain operation that persists and/or emits events.

## When NOT to use

- The work is pure data access → repository.
- The work orchestrates external APIs, retries, or parallel calls → manager ([`./create-manager-or-use-case.md`](./create-manager-or-use-case.md)).

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — Service Rules + Method-Size Discipline.
- [`../docs/03-architecture/event-bus.md`](../docs/03-architecture/event-bus.md), [`../docs/03-architecture/data-ownership.md`](../docs/03-architecture/data-ownership.md).

## Repository discovery steps

1. Read a sibling `*.service.ts` for ownership-check and event-publish patterns.
2. Confirm the repository methods you need exist and return data-or-null.
3. Confirm the event pattern (if publishing) exists in `packages/shared-types` (see [`./add-rabbitmq-event.md`](./add-rabbitmq-event.md)).

## Tests-first plan

- Per public method: happy path, empty/null input, boundary, invalid, and error path (repo returns null → `EntityNotFoundException`; forbidden → `BusinessException` FORBIDDEN).
- Assert events are published after persistence (mock `RabbitMQService`).

## Implementation steps

1. Inject the repository and `RabbitMQService`; add `private readonly logger = new Logger(<Class>.name)`.
2. Validate ownership/permissions FIRST — compare against `@CurrentUser()` id passed from the controller.
3. Call the repository; if it returns null, throw `EntityNotFoundException(entity, id)`.
4. Apply domain rules; throw `BusinessException(message, HttpStatus, code)` with a machine-readable `code` on violation.
5. Persist, THEN publish the event via `RabbitMQService` (never before persistence, never from the controller).
6. Log per the logging-coverage rule: `debug` on entry, `info` on side effects, `warn` on fallback, `error` in every catch.
7. If a method exceeds 30 lines, extract a private helper or delegate to a manager.

## Security considerations

- Ownership check is mandatory and lives here — not in the controller or repository.
- Never log secrets/tokens; use redaction-safe stringify.
- Map to DTO / strip sensitive fields before returning (repository does this; verify).

## Failure modes

- Publishing an event before the DB write commits → consumers act on data that may roll back.
- Swallowing an error without logging or storing a user-visible record.
- Method creeping past 30 lines / complexity 10.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Update `docs/04-backend/service-guide-<service>.md` with new operations and emitted events.

## Definition of done

- ≤30-line methods, ownership enforced, events after persistence, error paths tested, gates green in the touched folder.
