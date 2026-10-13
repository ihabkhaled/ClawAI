# Backend service baseline

The rules every NestJS backend service follows. Each `apps/claw-<service>/CLAUDE.md`
links here instead of carrying its own copy, and adds only what is specific to that
service. Where a service's own `CLAUDE.md` says something stricter, the service file
wins for that service.

Canonical rule bodies: [`rules/00-non-negotiable-rules.md`](../../rules/00-non-negotiable-rules.md) ·
[`rules/02-backend-rules.md`](../../rules/02-backend-rules.md) ·
[`rules/12-types-enums-constants-and-declaration-ownership.md`](../../rules/12-types-enums-constants-and-declaration-ownership.md) ·
[`rules/13-external-library-wrappers-and-adapters.md`](../../rules/13-external-library-wrappers-and-adapters.md).

## Commands

Run from the service folder (`apps/claw-<service>`):

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
```

## Absolute rules

1. **NEVER use `any`** — use `unknown`, generics, or proper types.
2. **NEVER disable ESLint rules** — no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
3. **NEVER use `console.log`** — use the NestJS `Logger`.
4. **NEVER use a `!` non-null assertion** — handle nullability explicitly.
5. **NEVER use `process.env` directly** — use `AppConfig` (Zod-validated, `src/app/config/app.config.ts`).
6. **NEVER put business logic in controllers** — a controller method extracts params, calls ONE service method, and returns.
7. **NEVER put Prisma or Mongoose calls outside repositories** — repositories are pure data access.
8. **Every function has an explicit return type.**
9. **Service methods are at most 30 lines.**
10. **Every Zod schema has `.max()` on every string and array field.**
11. **All errors use `BusinessException` with a `messageKey`.**
12. **No default exports** — named exports only.

## No inline declarations

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in service,
controller, repository, manager, adapter, utility, guard, filter, interceptor, pipe, or
module files. Extract to dedicated files:

- Types/interfaces → `src/modules/<domain>/types/<name>.types.ts`
- Enums → `src/common/enums/<name>.enum.ts`
- Constants → `src/modules/<domain>/constants/<name>.constants.ts`

Only exception: `private readonly logger = new Logger(...)` inside NestJS classes.

## Library wrapping

Every third-party library is wrapped in a utility file under `src/common/utilities/`.
Services and controllers NEVER import third-party packages directly — they import the
wrapper. Example: a `jwt.utility.ts` wraps `jsonwebtoken`, and services import
`{ signToken, verifyToken }` from the wrapper.

## Docker container rebuild procedure

When rebuilding a service (especially after a shared-package change), never skip a step:

```bash
./scripts/claw.sh stop <service>
./scripts/claw.sh rm -f <service>
docker rmi claw-<service>
./scripts/claw.sh up -d --build <service>
```

Full procedure: [`docs/08-runtime-devops/docker-guide.md`](../08-runtime-devops/docker-guide.md).

## Workflow phases

All backend work follows the phases in [`rules/01-planning-rules.md`](../../rules/01-planning-rules.md):

- **Phase 0** (Planning Gate): document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): follow the backend architecture rules above
- **Phase 4** (SSE rules if applicable): apply the SSE-specific patterns
- **Phase 5** (Error handling): all async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): verify every new endpoint with curl before claiming done
- **Phase 12** (QE Gates): all phases from [`docs/16-quality-engineering/`](../16-quality-engineering/) must pass

## Pre-implementation checklist

- [ ] Read the root `CLAUDE.md`
- [ ] Read the service's own `CLAUDE.md`
- [ ] Read the existing service code for the area being changed
- [ ] Read the current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events the service publishes/consumes
- [ ] Check whether shared packages need updating

## Post-implementation checklist

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new Zod DTOs have: max() on strings, max() on arrays, required fields explicit
- [ ] All new service methods are ≤ 30 lines
- [ ] All new manager methods are ≤ 80 lines
- [ ] All new controllers are 3-line methods
- [ ] No try/catch in controllers
- [ ] No Prisma calls outside repositories
- [ ] All new events published using RabbitMQService
- [ ] All new messageKeys added to the error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure
- [ ] QA evidence record written — [`QA-WORKFLOW.md`](../../QA-WORKFLOW.md)

## Required output format

After completing any implementation task on a service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output
