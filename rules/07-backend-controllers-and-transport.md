# 07 — Backend Controllers and Transport

## Purpose

Controllers are the thinnest layer: they translate transport (HTTP/SSE) into a
single service call and translate the result back. Keeping them dumb means all
logic is testable without HTTP, and errors are handled in exactly one place.

## Applies to

`apps/claw-*/src/**/*.controller.ts` and SSE controllers.

## Mandatory rules

1. **3-line methods only:** extract params, call ONE service method, return.
2. **No `try/catch` and no `throw`** in controllers — the `GlobalExceptionFilter`
   turns `BusinessException`/`EntityNotFoundException` into responses.
3. **No business logic, no branching, no DB access** — delegate everything.
4. **Validate input with a Zod DTO** applied via the validation pipe (see
   [11](11-dtos-and-validation.md)); controllers never hand-parse the body.
5. **Guards enforce auth/RBAC** — `AuthGuard`, `RolesGuard`, and permission
   decorators live on the controller/route, not as inline checks (see [16](16-authentication-and-authorization.md)).
6. **SSE endpoints follow the streaming contract:** `@SkipLogging()`,
   `@SkipThrottle()`, exclude from pino autoLogging, and require
   `proxy_buffering off` in nginx. Never use `EventSource` (it can't set auth headers).
7. **API routes are prefixed `api/v1`** and mapped in `infra/nginx/nginx.conf`.

## Prohibited patterns

- `try { … } catch { throw new BusinessException(…) }` inside a controller.
- More than one service call per endpoint, or any logic between calls.
- Returning a raw Prisma model (leaks internal fields) — services map to DTOs.
- JWTs in URL query params (they leak to logs/history/Referer).

## Correct pattern

```ts
// apps/claw-chat-service/src/modules/chat/chat-message.controller.ts
@Post()
async create(@Body() dto: CreateMessageDto, @CurrentUser() user: AuthUser) {
  return this.chatMessageService.createMessage(user.id, dto);
}
```

## Enforcement

- **ESLint** (controller-file restrictions) — bans `try/catch`, `throw`, inline
  declarations, and enforces the ~3-line method ceiling.
- **Architecture test** — controllers do not import repositories/Prisma.
- **Knowledge check** — `.ai/manifests/{api-endpoints,nginx-routes}.json` must
  list any new route.

## Related skills

- [02-service-scaffold](../skills/02-service-scaffold.md)

## Related context

- Root `CLAUDE.md` — "Controller Rules", "Phase 4: SSE / Real-time Features".

## Definition of done

- [ ] Every method is extract → one service call → return.
- [ ] No `try/catch`/`throw`/logic/DB access in the controller.
- [ ] New routes added to nginx and the endpoint manifest.
- [ ] SSE routes follow the streaming contract.
