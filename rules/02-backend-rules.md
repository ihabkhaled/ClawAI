# ClawAI — Backend Architecture Rules

> Applies to all 17 NestJS services. Read alongside the service-specific CLAUDE.md.

## Layer Boundaries

```
HTTP Request
  → Controller        (extract params, call ONE service, return result)
    → Service         (business logic, ownership checks, event publishing)
      → Repository    (pure data access — Prisma/Mongoose only)
      → Manager       (complex orchestration — external APIs, retries, parallel ops)
```

**No layer may skip another layer.**

- Controllers NEVER call repositories directly
- Services NEVER call Prisma/Mongoose directly
- Managers NEVER handle HTTP
- Repositories NEVER throw — they return data or null

## Controller Rules

```
1. 3-line methods ONLY:
   const params = this.extractParams(dto);
   const result = await this.service.doThing(params);
   return result;

2. NO try/catch — GlobalExceptionFilter handles all errors
3. NO business logic — delegate everything to service
4. NO direct database access
5. ONE service call per endpoint
6. NO throwing — no BusinessException in controllers
```

## Service Rules

```
1. Max 30 lines per method — if longer, split or delegate to Manager
2. Each public method does ONE thing
3. Validate ownership/permissions here (not in controller, not in repo)
4. Publish RabbitMQ events here (not in controller)
5. Methods > 30 lines → extract to private helper or create Manager
6. Handle nullability explicitly (no ! operator)
7. Use BusinessException for all domain errors
8. Use EntityNotFoundException for not-found errors
```

## Manager Rules

```
1. Max 80 lines per method, cyclomatic complexity ≤ 15
2. Handles complex orchestration: parallel LLM calls, retry loops, external APIs
3. If method > 80 lines → break into smaller private methods (each < 30 lines)
4. Name clearly: buildPromptString(), fetchConnectorConfig(), parseResponse()
5. All background (fire-and-forget) paths:
   → emitError() (SSE) first
   → storeErrorMessage() (DB) second
   → Both wrapped in nested try-catch
```

## Repository Rules

```
1. Pure data access ONLY — no business logic
2. NO throw statements — return data or null, let service decide
3. ONE database operation per method
4. Use Prisma/Mongoose query builders only — no raw SQL
5. Never call external APIs from repositories
6. Return types must be explicit (not inferred)
```

## DTO / Validation Rules

```
1. ALL input validated with Zod schemas
2. Every z.string() MUST have .max() (prevents oversized payloads)
3. Every z.array() MUST have .max() (prevents payload flooding)
4. Zod schemas in: src/modules/<domain>/dto/<name>.dto.ts
5. Export BOTH the schema (z.object) AND the inferred type
6. Never use class-validator — use Zod exclusively
```

## No Inline Declaration Rule

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inside:

- `*.service.ts`
- `*.manager.ts`
- `*.controller.ts`
- `*.repository.ts`
- `*.adapter.ts`
- `*.utility.ts`
- `*.guard.ts`
- `*.filter.ts`
- `*.interceptor.ts`
- `*.pipe.ts`
- `*.module.ts`

Extract to:

| What             | Where                                                |
| ---------------- | ---------------------------------------------------- |
| Types/interfaces | `src/modules/<domain>/types/<name>.types.ts`         |
| Enums            | `src/common/enums/<name>.enum.ts`                    |
| Constants        | `src/modules/<domain>/constants/<name>.constants.ts` |
| Utilities        | `src/common/utilities/<name>.utility.ts`             |
| DTOs             | `src/modules/<domain>/dto/<name>.dto.ts`             |

Only exception: `private readonly logger = new Logger(ClassName.name)` inside class body.

## Library Wrapping Rule

Every third-party npm package MUST be wrapped:

```
src/common/utilities/<library-name>.utility.ts
```

Services/controllers NEVER import from `node_modules` directly. They import from the wrapper. If the library changes, only the wrapper needs updating.

**Already wrapped (do not re-wrap):**

- `jsonwebtoken` → `jwt.utility.ts`
- `bcrypt` / `argon2` → `password.utility.ts`
- `ioredis` → `redis.utility.ts`
- `amqplib` → `rabbitmq.utility.ts` (via shared-rabbitmq)
- HTTP fetch → `http.utility.ts`

## Error Handling Rules

```
1. All domain errors → BusinessException(message, HttpStatus, code)
2. Entity not found → EntityNotFoundException(entityName, id)
3. NEVER swallow errors silently
4. ALWAYS log before rethrowing
5. Background task failures:
   → emitError() via SSE subject
   → storeErrorMessage() as ASSISTANT record with metadata: { error: true }
   → Both in a nested try-catch
```

## Event Publishing Rules

```
1. Publish from service layer (not controller, not manager)
2. Use RabbitMQService from shared-rabbitmq
3. Event pattern defined in packages/shared-types
4. Include correlation ID in event payload
5. DLQ + 3 retries configured in RabbitMQModule
```

## ESLint Rules Summary

```
no-explicit-any           → ERROR
no-non-null-assertion     → ERROR
no-floating-promises      → ERROR
no-misused-promises       → ERROR
eqeqeq                    → ERROR (always ===)
no-var                    → ERROR
prefer-const              → ERROR
no-console (log)          → ERROR (only warn/error allowed)
explicit-function-return-type → WARN
consistent-type-imports   → WARN (prefer import type)
no-shadow                 → WARN
```

## Service Health Endpoint

Every new service MUST expose:

```
GET /health → { status: 'ok', service: '<name>', version: '...' }
```

Registered in `apps/claw-health-service` at startup.

## Common Mistakes to Avoid

1. Putting `try/catch` in a controller — GlobalExceptionFilter handles it
2. Calling `repository.findById()` from a controller directly
3. Returning Prisma model objects directly (they leak internal fields) — map to DTO first
4. Using `console.log` — always `this.logger.log()`
5. Defining an enum inline in a service — extract to `common/enums/`
6. Forgetting `.max()` on Zod string fields
7. Using `process.env.FOO` directly — always go through `AppConfig`
8. Publishing events from a controller — publish from service after persistence
9. Catching and swallowing errors in managers without storing an error record
10. Storing localhost URLs for Docker services — use service name (`http://ollama:11434`)

## Logging-Coverage Rule (added 2026-04-26)

Every public method in `*.service.ts`, `*.manager.ts`, `*.adapter.ts`, `*.utility.ts`, `*.repository.ts` MUST emit:

- `this.logger.debug(...)` on entry, with non-PII inputs
- `this.logger.info(...)` for any side-effecting operation (DB write, HTTP call, RabbitMQ publish, file write)
- `this.logger.warn(...)` for any retry, fallback, or recoverable degraded path
- `this.logger.error(...)` in every `catch` block, BEFORE rethrow or fallback

Reference template:

```ts
async doX(input: Input): Promise<Output> {
  this.logger.debug(`doX: input=${safeStringify(input)}`);
  try {
    const result = await this.somethingThatMightFail(input);
    this.logger.info(`doX: completed thingId=${result.id}`);
    return result;
  } catch (error) {
    this.logger.error(`doX: failed — ${(error as Error).message}`);
    throw error;
  }
}
```

NEVER log: secrets, tokens, passwords, refresh tokens, API keys, full request/response bodies. All logs auto-ship to MongoDB (`claw_server_logs`, TTL 30 days) via existing pipeline. See `rules/09-refactor-rules.md` (R4) for full standard.

## Method-Size Discipline (added 2026-04-26)

Hard ceilings (ESLint enforced as warning today, hard error in Phase U):

| Layer                    |        Max lines        | Max complexity |
| ------------------------ | :---------------------: | :------------: |
| `*.service.ts` method    |           50            |       10       |
| `*.manager.ts` method    |           80            |       15       |
| `*.controller.ts` method | 3 (extract+call+return) |      n/a       |
| `*.repository.ts` method |           30            |       10       |
| `*.utility.ts` function  |           30            |       10       |

Hard file ceilings:

- Service / repository / utility files: 300 lines
- Manager / adapter files: 500 lines
- Constants / locale / generated files: unlimited

A method or file exceeding its ceiling MUST be split. See `rules/09-refactor-rules.md` (R2, R3) for extraction targets.

## Banned Patterns (added 2026-04-26)

Banned in every backend logic file (ESLint `no-restricted-syntax`):

- `as unknown as X` (use real types or refactor)
- `console.log` / `console.debug` / `console.info` / `console.trace` (use NestJS `Logger`)
- `let` at module scope (use `const` or move state into a class)
- inline `interface` / `type` / `enum` / `function` (extract per `rules/09-refactor-rules.md` R1)
- string-literal-union types (use enum from `src/common/enums/`)

## Cross-Service Utility Rule (added 2026-04-26)

Before writing a utility in `apps/<service>/src/common/utilities/`, check `packages/shared-utilities/`.

If the utility lives identically in 2+ services, it MUST be in `packages/shared-utilities/`. Per-service copies are a delivery blocker.

Cross-service ownership table:

| Shared kind   | Package                      |
| ------------- | ---------------------------- |
| Functions     | `packages/shared-utilities/` |
| Types         | `packages/shared-types/`     |
| Constants     | `packages/shared-constants/` |
| RabbitMQ glue | `packages/shared-rabbitmq/`  |
| Auth glue     | `packages/shared-auth/`      |
