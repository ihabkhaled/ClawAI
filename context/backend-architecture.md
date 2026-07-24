# Backend Architecture

Every backend service is a **NestJS 11.1** app compiled with **tsgo +
tsc-alias**. Full rules: `rules/02-backend-rules.md`.

## Layering

```
Controller → Service → Repository            (data access only)
                    ↘ Manager                (complex orchestration)
                          ↘ Adapter          (wraps a vendor SDK/API)
```

| Layer                              | Responsibility                                                    | Hard limits                                             |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| **Controller** (`*.controller.ts`) | 3-line methods: extract params, call ONE service method, return   | NO try/catch, NO throw, NO business logic, NO DB access |
| **Service** (`*.service.ts`)       | business logic, ownership/permission validation, event publishing | **≤30 lines/method**, complexity ≤10                    |
| **Manager** (`*.manager.ts`)       | orchestration: multi-call, retries, external APIs                 | **≤80 lines/method**, complexity ≤15                    |
| **Repository** (`*.repository.ts`) | pure data access, one op per method                               | **NEVER throws** — returns data or null                 |
| **Adapter** (`*.adapter.ts`)       | the ONLY place a third-party SDK is imported                      | wrapped per-library                                     |

File ceiling: **500 lines** for production files (constants/locale/generated
excluded). A method over its ceiling MUST be split.

## Module shape

```
src/modules/<domain>/
  controllers/*.controller.ts
  <domain>.service.ts
  <domain>.repository.ts
  managers/*.manager.ts
  adapters/*.adapter.ts
  dto/*.dto.ts          # Zod schema + inferred type
  types/*.types.ts
  constants/*.constants.ts
  <domain>.module.ts    # registers providers/controllers
  __tests__/*.spec.ts   # jest
src/common/{enums,constants,utilities,errors,types}/
src/app/{guards,filters,interceptors,pipes,decorators}/
```

## Validation & DTOs

- **All input validated with Zod** schemas in `dto/*.dto.ts`; export both the
  schema and the inferred type.
- Every `z.string()` needs `.max()`; every `z.array()` needs `.max()`.

## Error model

- All errors use `BusinessException` with a machine-readable `code`.
- Entity-not-found → `EntityNotFoundException`; forbidden → `BusinessException`
  with `HttpStatus.FORBIDDEN`.
- Never swallow errors silently — log and rethrow or handle explicitly.
- `GlobalExceptionFilter` centralizes error responses (it must check
  `response.headersSent` before writing, for SSE safety).

## No inline declarations

In every logic file (`*.service.ts`, `*.manager.ts`, `*.controller.ts`,
`*.repository.ts`, `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`,
`*.pipe.ts`, `*.module.ts`, `*.interceptor.ts`): **no inline
type/interface/enum/module-level const/standalone function/string-literal
union.** Extract per [declaration-ownership-map.md](declaration-ownership-map.md).
The only exception: `private readonly logger = new Logger(MyClass.name)`.

## Logging (required per public method)

Every public method in a service/manager/adapter/utility/repository emits at
least: `logger.debug` on entry (non-PII), `logger.error` in every catch (before
rethrow/fallback), `logger.info` for side effects (DB write, HTTP call, publish),
`logger.warn` for retries/fallbacks. Use NestJS `Logger` — never `console.log`.
Never log secrets/tokens/passwords (Pino redaction is configured; extend it).
Logs ship to MongoDB via Pino → `log.server` → server-logs-service (TTL 30d).

## Cross-service boundaries

- Never cross a DB boundary — HTTP (`/internal/*`, service-token) or RabbitMQ
  only.
- Events: add the pattern to `@claw/shared-types` first, publish in the service
  (not the controller), consume with non-swallowing handlers.
- Shared logic → `@claw/shared-utilities`; never re-implement a per-service copy.

## Security surface

- JWT + refresh rotation (argon2), RBAC via `@claw/shared-auth`
  (AuthGuard/RolesGuard/`RequirePermissions`), `@nestjs/throttler`, Helmet, Zod,
  AES-256-GCM for connector keys, `X-Request-ID` correlation. See
  `rules/08-security-rules.md` and [permission-map.md](permission-map.md).

## Validation lane

```bash
cd apps/claw-<service>
npm run typecheck   # tsgo --noEmit
npm run lint
npm test            # jest
npm run build       # tsgo + tsc-alias
```

Coverage bar: **≥92%** on all four jest metrics (`coverageThreshold` in each
`jest.config.ts`); ratcheted, never lowered. See [testing-map.md](testing-map.md).
