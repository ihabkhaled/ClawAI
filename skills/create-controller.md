---
name: create-controller
summary: Write a NestJS controller with 3-line methods, guards, and no try/catch or business logic.
task_keywords:
  [
    controller,
    nestjs controller,
    http endpoint,
    route handler,
    guards,
    requirepermissions,
    currentuser decorator,
    3-line methods,
    no try catch controller,
  ]
applies_to: [backend, apps/claw-<service>-service/src/modules/<domain>]
required_rules: [02-backend-rules, 08-security-rules]
required_context: [ai-context-pack, authorization-rbac]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [controller smoke (delegation), e2e via qa script]
required_docs: [docs/04-backend/service-guide-<service>.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a Controller

A controller is the HTTP boundary. It extracts params, calls exactly ONE service method, and returns the result. It contains no logic, no try/catch, and never throws — the `GlobalExceptionFilter` owns error responses.

## When to use

- Exposing a new endpoint on an existing or new module.
- Adding a route that maps a request to a single service operation.

## When NOT to use

- You need branching, transformation, or multiple service calls → that belongs in the service or a manager.
- The route streams SSE with special logging concerns → follow the SSE lessons in root `CLAUDE.md` (`@SkipLogging()`, `@SkipThrottle()`).

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — Controller Rules section.
- [`../docs/03-architecture/authorization-rbac.md`](../docs/03-architecture/authorization-rbac.md) — guards and permissions.

## Repository discovery steps

1. Read a sibling `*.controller.ts` in the same service for decorator conventions.
2. Confirm the DTO + service method you will call already exist (or create them first).
3. Check `infra/nginx/nginx.conf` for the location block that fronts this route prefix.

## Tests-first plan

- Write a smoke test that mocks the service and asserts the controller calls the right method with the extracted params and returns its result verbatim.
- Add the endpoint (happy + 400 + 401 + 403 + 404) to `qa/test-<service>.sh`.

## Implementation steps

1. Decorate the class with `@Controller('api/v1/<domain>')`.
2. Apply guards: `@UseGuards(AuthGuard, RolesGuard)` from `@claw/shared-auth`, plus `@RequirePermissions(Permission.X)` or `@Roles(...)` as needed; `@Public()` only for explicitly unauthenticated routes.
3. Each method is 3 lines: extract params (from `@Body()`/`@Param()`/`@CurrentUser()`), call ONE service method, return.
4. Validate `@Body()` with the module's Zod DTO via the shared Zod validation pipe — never class-validator.
5. Give every method an explicit return type.
6. No try/catch, no throw, no direct repository or Prisma access.

## Security considerations

- No JWT in query params; SSE uses `fetch()` with an Authorization header, never `EventSource`.
- Never return `encryptedConfig`, `encryptedTokens`, or `passwordHash` — the repository already strips them.
- Every endpoint has an auth guard or an explicit `@Public()`.

## Failure modes

- try/catch in a controller → duplicates GlobalExceptionFilter and hides `headersSent` checks.
- Business logic leaking into the controller → move it to the service.
- Missing guard → unauthenticated access (A01 broken access control).

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Add the endpoint to `docs/04-backend/service-guide-<service>.md` and, if user-facing, `docs/12-reference/api-reference.md`.

## Definition of done

- 3-line methods, guarded, DTO-validated, explicit return types, delegation test green, endpoint covered in the QA script.
