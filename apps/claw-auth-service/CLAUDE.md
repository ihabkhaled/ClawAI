# Claw Auth Service - Development Rules

## Service Overview

This is the Auth microservice for the Claw platform. It owns all authentication, user management, and session handling.

## Ownership

- **Users**: CRUD operations, role management, status management
- **Sessions**: Refresh token storage, session lifecycle
- **Authentication**: Login, logout, JWT token issuance, token refresh

## Tech Details

- **Port**: 4001
- **Database**: PostgreSQL (`claw_auth`)
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Events Published

- `user.created` — when a new user is created
- `user.login` — when a user successfully logs in
- `user.logout` — when a user logs out

## All Standard Backend Rules Apply

See the root CLAUDE.md for the full set of architecture rules, naming conventions, and code quality requirements. Key points:

- NEVER use `any` — use `unknown`, generics, or proper types
- NEVER disable ESLint rules
- NEVER use `console.log` — use NestJS Logger
- NEVER use `process.env` directly — use AppConfig (Zod-validated)
- Controllers are 3-line methods: extract params, call ONE service, return
- Service methods max 30 lines
- Repositories are pure data access only
- All Zod schemas must have `.max()` on every string and array field
- All errors use `BusinessException` with a `messageKey`
- Every function must have an explicit return type

## No Inline Declarations Rule

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in service, controller, repository, manager, adapter, utility, guard, filter, interceptor, pipe, or module files. Extract to dedicated files:

- Types/interfaces → `src/modules/<domain>/types/<name>.types.ts`
- Enums → `src/common/enums/<name>.enum.ts`
- Constants → `src/modules/<domain>/constants/<name>.constants.ts`
  Only exception: `private readonly logger = new Logger(...)` inside NestJS classes.

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly — they import the wrapper. Example: `src/common/utilities/hashing.utility.ts` wraps `argon2`, and services import `{ hashPassword, verifyPassword }` from the wrapper.

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
npm run migrate          # Run migrations (production)
npm run migrate:dev      # Create + run migration (dev)
npm run seed             # Seed admin user + system roles + plans (full seed)
npm run seed:permissions # Reconcile system-role permissions ONLY (no users/plans)
npm run prisma:generate  # Regenerate Prisma client
```

## Role-Permissions Auto-Sync (drift correction)

`PermissionsSeederService` (`src/modules/roles/services/permissions-seeder.service.ts`) runs on every auth-service boot via `OnModuleInit`. It diffs the canonical `SYSTEM_ROLE_SEED` in `src/common/constants/rbac.constants.ts` against the in-DB `role_permissions` rows for the two system roles (ADMIN, USER) and reconciles drift:

- **Adds** any permission present in the seed but missing from the DB (e.g., when a new permission is appended to `USER_DEFAULT_PERMISSIONS` after the initial deploy).
- **Removes** extras gated by `SEED_RECONCILE_PERMISSIONS` (default `false` = ADD-only, so admin-granted extras like `JUDGE_USE` on USER survive every `docker up`). Set to `true` to hard-reconcile both system roles back to the canonical seed (adds AND removes).
- Emits a structured warn log per role on drift: `roleSlug=… added=[…] removed=[…] finalGrantCount=…`
- Custom (non-system) roles are NEVER touched — admins manage those via the role→permission matrix UI.
- `onModuleInit` soft-fails: a transient DB error logs but does not crash auth-service startup.

Operators can run the reconciler standalone (no full deploy) via `npm run seed:permissions` (backed by `prisma/seed-permissions.js`). Useful for rolling a permission catalog change out to an existing install.

## Super-Administrator Authority (2026-08-27)

One account carries `User.isSuperAdmin`, guaranteed unique by a **raw-SQL partial
index** that `schema.prisma` cannot express — never accept a migration diff that
proposes dropping `users_single_super_admin_idx`.

Authority is two questions, deliberately answered in two places:

- **May this actor mutate this row, for this scope?** →
  `resolveSuperAdminMutability` (pure, in `modules/users/service.utilities/`).
  Never re-derive this from `user.isSuperAdmin` at a call site, and never write a
  second predicate.
- **Does this actor hold super-administrator authority?** →
  `UsersService.assertSuperAdminActor` (DB read). Do **not** add an
  `isSuperAdmin` JWT claim — already-issued tokens would lack it until expiry.

`SUPER_ADMIN_SELF_PERMITTED_SCOPES` = `PROFILE` only. Adding a scope is a product
decision with an unrecoverable failure mode, not a code-review call.

Administrator-class mutations (create/promote/demote/suspend/reactivate an
`ADMIN`, and editing a **system** role's permissions) require a super-admin actor.
Ordinary-user mutations must stay ungated.

Cross-module target reads use `PlansRepository.findUserMutabilityFacts` and
`RolesRepository.isSuperAdminActor` — **not** `UsersService`, because
`UsersModule` imports `RolesModule` and `PlansModule` and the reverse is a cycle.

System-driven writers (billing entitlement events, plan retirement) are exempt on
purpose and state it at the write site.

Full rule: `rules/35-super-administrator-and-privilege-boundaries.md` ·
ADR: `docs/13-adr/adr-073-super-administrator-authority.md`

## Docker Container Rebuild Procedure

When rebuilding this service (especially after shared package changes):

```bash
./scripts/claw.sh stop auth-service
./scripts/claw.sh rm -f auth-service
docker rmi claw-auth-service
./scripts/claw.sh up -d --build auth-service
```

**NEVER skip steps.** See root CLAUDE.md for full explanation.

## Workflow Phase Requirements

All work on this service MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): Define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): Follow backend architecture rules above
- **Phase 4** (SSE rules if applicable): Apply SSE-specific patterns from root CLAUDE.md
- **Phase 5** (Error handling): All async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): Verify all new endpoints with curl/Postman before claiming done
- **Phase 12** (QE Gates): All phases from docs/16-quality-engineering/ must pass

## Pre-Implementation Checklist (this service)

Before writing code for this service:

- [ ] Read root CLAUDE.md
- [ ] Read this service CLAUDE.md
- [ ] Read existing service code for the area being changed
- [ ] Read current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events published/consumed by this service
- [ ] Check if shared packages need updating

## Post-Implementation Checklist (this service)

After implementing any change to this service:

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
- [ ] All new messageKeys added to error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure

## Email Change (Batch 09)

The email-change API comprises authenticated `/api/v1/users/me/email-change` request, verify-current, resend, status, and cancel operations plus the public `/api/v1/auth/email-change/confirm` token endpoint. Authenticated handlers must derive ownership from the current principal; never accept a user ID for these routes. Keep mutation throttles at five requests per minute and preserve generic request/resend responses so account or delivery state cannot be enumerated.

Persist only OTP and confirmation-token hashes. Enforce expiry, resend cooldown, attempt ceilings, single-use transitions, and a transactional final email swap. Operational delivery requires applying the Prisma migration, regenerating the Prisma client, rebuilding the auth-service through the supported repository lifecycle command, and verifying service health plus the workflow against the rebuilt container.

**Batch deviation:** inline English SMTP templates intentionally follow the existing auth email adapter because this repository has no email-template or email-i18n layer. Do not invent a parallel template system as part of this batch.

## Required Output Format

After completing any implementation task on this service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output
