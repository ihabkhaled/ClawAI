# Claw Backend - Development Rules

## Project Overview

Claw is a local-first AI orchestration platform. This is the NestJS backend that manages connectors, routing, chat, and admin functionality.

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode enabled)
- **Database**: PostgreSQL with Prisma ORM, pgvector extension for embeddings
- **Cache/Queues**: Redis (ioredis), BullMQ for background jobs
- **Validation**: Zod (NOT class-validator, NOT class-transformer)
- **Auth**: argon2 for password hashing, JWT (jsonwebtoken) for tokens
- **Logging**: nestjs-pino / pino structured logging

---

## Absolute Rules

These rules are non-negotiable. Every rule must be followed in every file, every commit, every review.

1. **NEVER use `any`** — use `unknown`, generics, or proper types. No exceptions.
2. **NEVER disable ESLint rules** — no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` comments anywhere.
3. **NEVER use `console.log`** — use the NestJS `Logger` service (`private readonly logger = new Logger(ClassName.name)`).
4. **NEVER use `!` non-null assertion** — handle nullability explicitly with guards, nullish coalescing, or optional chaining.
5. **NEVER use `==` or `!=`** — always use `===` and `!==` for comparisons.
6. **NEVER use `var`** — use `const` by default, `let` only when reassignment is necessary.
7. **NEVER use `eval()`, `new Function()`, or `setTimeout('code')`** — no dynamic code execution.
8. **NEVER use string concatenation with `+`** — use template literals for string building.
9. **NEVER use `Buffer()` constructor** — use `Buffer.alloc()`, `Buffer.from()`, or `Buffer.allocUnsafe()`.
10. **NEVER use `process.env` directly** — use `AppConfig` (Zod-validated) from `src/app/config/app.config.ts`.
11. **NEVER use string literal unions for domain values** — define enums in `common/enums/` and import them.
12. **NEVER compare domain values with raw strings** — use enum comparisons (e.g., `status === OrderStatus.ACTIVE`).
13. **NEVER define interfaces, types, enums, constants, or standalone functions inline** in controllers, services, repositories, modules, guards, interceptors, filters, or pipes — extract them to dedicated files.
14. **NEVER put business logic in controllers** — controllers call exactly ONE service method.
15. **NEVER put Prisma calls outside repositories** — repositories are the sole data-access layer.
16. **NEVER put business logic in repositories** — repositories are pure data access only.
17. **NEVER omit explicit return types** — every function and method must have an explicit return type annotation.
18. **NEVER expose secrets in API responses, logs, or audit records** — redact sensitive fields before output.
19. **NEVER use class-validator or class-transformer** — use Zod for all validation and transformation.
20. **NEVER use `@UsePipes()` at method level when `@Param()` is present** — apply pipe directly in decorator or at controller level.
21. **EVERY exception must use `BusinessException` with a `messageKey`** — no raw `throw new Error()` or NestJS built-in exceptions.
22. **EVERY function must have an explicit return type** — including private methods, arrow functions assigned to variables.
23. **Service methods max 30 lines** — extract complex logic to utility files in `service.utilities/` or `manager.utilities/`.
24. **Repository methods take properly typed params and return raw Prisma results** — no transformation, no business logic.
25. **Controllers are 3-line methods** — extract params, call ONE service, return result.
26. **No floating promises** — every promise must be `await`ed or explicitly `void`ed.
27. **No N+1 queries** — use Prisma `include`, `select`, or batch queries. Review every loop that touches the database.
28. **Every foreign key must be indexed, every WHERE column must be indexed** — add indexes in Prisma schema.
29. **Paginate all list endpoints** — no unbounded queries. Use cursor or offset pagination with configurable limits.
30. **All errors use messageKey pattern**: `errors.<module>.<action>` (e.g., `errors.auth.invalidCredentials`).
31. **No magic numbers or strings** — extract to constants files.
32. **No circular dependencies** — modules must have a clear dependency direction.
33. **No default exports** — use named exports exclusively.
34. **No mutable module-level state** — use providers and DI for shared state.
35. **All Zod schemas must have `.max()` on every string and array field** — prevent unbounded input.

---

## Architecture Layers

```
Controller -> Service -> Manager -> Repository
```

### Controller (`controllers/`)
- HTTP transport layer only
- Route decorators, DTO binding, auth guards
- Calls exactly ONE service method
- No try/catch, no throw, no business logic
- 3-line method bodies: extract params -> call service -> return

### Service (`services/`)
- Thin orchestrators
- Transaction coordination (Prisma `$transaction`)
- Calls managers and/or repositories
- No direct Prisma access outside transactions
- Max 30 lines per method

### Manager (`managers/`)
- Domain and process logic
- Routing decisions, prompt assembly, fallback strategies
- Complex business rules live here
- May call repositories directly
- Extract complex utilities to `manager.utilities/`

### Repository (`repositories/`)
- Pure Prisma data access
- No business logic, no throwing business exceptions
- Take properly typed parameters
- Return raw Prisma results (no transformation)
- Every method maps to a single Prisma operation (or a small batch)

---

## Extraction Table

| What | Where |
|------|-------|
| DTOs (request/response) | `dto/<name>.dto.ts` |
| Types (module-specific) | `types/<name>.types.ts` |
| Types (shared) | `common/types/` |
| Enums | `common/enums/` |
| Constants (module-specific) | `constants/<name>.constants.ts` |
| Constants (shared) | `common/constants/` |
| Helpers/Utilities (service) | `service.utilities/<name>.utility.ts` |
| Helpers/Utilities (manager) | `manager.utilities/<name>.utility.ts` |
| Errors | `common/errors/` |
| Guards | `app/guards/` or module `guards/` |
| Interceptors | `app/interceptors/` |
| Filters | `app/filters/` |
| Pipes | `app/pipes/` |
| Decorators | `app/decorators/` |

---

## Naming Conventions

- **Files**: kebab-case with suffix (`auth.guard.ts`, `create-user.dto.ts`, `user.repository.ts`)
- **Classes**: PascalCase (`AuthGuard`, `CreateUserDto`, `UserRepository`)
- **Enum names**: PascalCase (`UserRole`, `ConnectorStatus`)
- **Enum values**: UPPER_SNAKE_CASE (`ACTIVE`, `PENDING_REVIEW`)
- **Database columns**: snake_case (via Prisma `@map`)
- **API routes**: kebab-case, prefixed `/api/v1/` (e.g., `/api/v1/auth/login`, `/api/v1/connector-configs`)
- **Boolean variables**: `is`/`has`/`can`/`should` prefix (`isActive`, `hasPermission`, `canDelete`)
- **Interfaces**: PascalCase, NO `I` prefix (`AuthPayload` not `IAuthPayload`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`)

---

## Module Structure

```
modules/<module>/
  controllers/
    <module>.controller.ts
  services/
    <module>.service.ts
  managers/
    <module>.manager.ts
  repositories/
    <module>.repository.ts
  dto/
    create-<entity>.dto.ts
    update-<entity>.dto.ts
    <entity>-query.dto.ts
  constants/
    <module>.constants.ts
  enums/
    (prefer common/enums/ unless truly module-private)
  types/
    <module>.types.ts
  interfaces/
    <module>.interfaces.ts
  service.utilities/
    <name>.utility.ts
  manager.utilities/
    <name>.utility.ts
  <module>.module.ts
  index.ts
```

---

## Security Rules

- **Secrets at rest**: AES-256-GCM encryption for connector secrets via `crypto.utility.ts`
- **Passwords**: argon2 only (NEVER bcrypt, NEVER SHA, NEVER plaintext)
- **JWT**: Must include `jti` (unique token ID) and `tokenType` (`access` | `refresh`) claims
- **Rate limiting**: Applied on auth endpoints, AI inference endpoints, and all mutation endpoints
- **Input validation**: Zod `.max()` on every string and array field in every DTO
- **Error sanitization**: No internal file paths, stack traces, or database errors in API responses
- **CORS**: Configured per environment, restrictive in production
- **Helmet**: Enabled globally for HTTP security headers
- **Body size limits**: Express body parser limited (default 1MB)
- **SQL injection**: Prisma parameterized queries only, no raw SQL unless reviewed
- **Audit logging**: Sensitive operations logged with actor, action, target (secrets redacted)

---

## Commands

```bash
# Development
npm run dev              # Start NestJS with --watch (hot reload)
npm run build            # Production build via nest build
npm run start            # Run compiled dist/main.js
npm run start:prod       # Same as start (production)

# Code Quality
npm run lint             # ESLint check on src/
npm run lint:strict      # ESLint with --max-warnings 0
npm run lint:fix         # ESLint with auto-fix
npm run format           # Prettier format src/
npm run format:check     # Prettier check (CI)
npm run typecheck        # TypeScript type check (no emit)
npm run validate         # Full validation: typecheck + lint:strict + format:check

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Run tests with coverage report
npm run test:e2e         # Run end-to-end tests

# Database
npm run migrate          # Run Prisma migrations (production)
npm run migrate:dev      # Create and run migration (development)
npm run seed             # Seed initial data
npm run db:reset         # Reset database (destructive!)
npm run prisma:generate  # Regenerate Prisma client after schema changes
```

---

## Auth Flow

1. `POST /api/v1/auth/login` - Email + password login, returns JWT access + refresh token pair
2. `POST /api/v1/auth/refresh` - Rotate refresh token, returns new token pair
3. `POST /api/v1/auth/logout` - Invalidate all sessions for the user
4. `GET /api/v1/auth/me` - Get current user profile (requires valid access token)
5. Routes decorated with `@Public()` skip authentication. All other routes require a valid Bearer token.
6. `@Roles(UserRole.ADMIN)` restricts endpoint access by user role.
7. Refresh tokens are stored hashed (argon2) in the database with a `jti` for revocation.
8. Access tokens are short-lived (15 min default), refresh tokens longer (7 days default).

---

## Environment Variables

All environment variables are validated at startup via Zod in `src/app/config/app.config.ts`. The application will fail fast if required variables are missing or malformed. See `.env.example` for the full list.

Key variables:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | Server port (default 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `ENCRYPTION_KEY` | AES-256-GCM key for encrypting secrets at rest |

---

## Code Quality Checklist

Before every commit, verify:

- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint:strict` passes with zero warnings
- [ ] `npm run format:check` passes
- [ ] All new functions have explicit return types
- [ ] All new DTOs use Zod with `.max()` on strings/arrays
- [ ] No `any`, `@ts-ignore`, `console.log`, or `!` assertions
- [ ] No raw string comparisons for domain values
- [ ] No inline types/interfaces/enums/constants in logic files
- [ ] Controllers are thin (3 lines per method)
- [ ] Service methods are under 30 lines
- [ ] Repository methods are pure data access
- [ ] All new FK columns are indexed
- [ ] List endpoints are paginated
- [ ] Error messages use `errors.<module>.<action>` pattern
- [ ] No secrets in logs or responses
- [ ] Tests cover the happy path and at least one error path
