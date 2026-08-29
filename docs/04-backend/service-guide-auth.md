# Service Guide: claw-auth-service

## Overview

| Property    | Value                               |
| ----------- | ----------------------------------- |
| Port        | 4001                                |
| Database    | PostgreSQL (`claw_auth`)            |
| ORM         | Prisma 5.20                         |
| Env prefix  | `AUTH_`                             |
| Nginx route | `/api/v1/auth/*`, `/api/v1/users/*` |

The auth service handles user registration, login, JWT issuance, refresh token rotation, session management, and RBAC. It is the only service that stores user credentials.

## Database Schema

### User

| Column               | Type                     | Notes                           |
| -------------------- | ------------------------ | ------------------------------- |
| id                   | String (CUID)            | Primary key                     |
| email                | String                   | Unique, indexed                 |
| username             | String                   | Unique                          |
| passwordHash         | String                   | Argon2 hash                     |
| role                 | UserRole enum            | ADMIN, OPERATOR, VIEWER         |
| status               | UserStatus enum          | ACTIVE, SUSPENDED, PENDING      |
| mustChangePassword   | Boolean                  | Forces password change on login |
| languagePreference   | UserLanguagePreference   | EN, AR, FR, IT, DE, ES, RU, PT  |
| appearancePreference | UserAppearancePreference | SYSTEM, LIGHT, DARK             |
| createdAt            | DateTime                 | Auto-set                        |
| updatedAt            | DateTime                 | Auto-updated                    |

### Session

| Column       | Type     | Notes                        |
| ------------ | -------- | ---------------------------- |
| id           | String   | Primary key                  |
| userId       | String   | FK to User, cascading delete |
| refreshToken | String   | Unique, hashed               |
| expiresAt    | DateTime | Token expiration             |
| createdAt    | DateTime | Auto-set                     |

### SystemSetting

Key-value store for runtime configuration (e.g., maintenance mode, feature flags).

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Path         | Auth   | Description              |
| ------ | ------------ | ------ | ------------------------ |
| POST   | /register    | Public | Create a pending account |
| POST   | /login       | Public | Email + password login   |
| POST   | /refresh     | Public | Refresh token rotation   |
| POST   | /logout      | Bearer | Invalidate session       |
| GET    | /me          | Bearer | Current user profile     |
| PATCH  | /me          | Bearer | Update own profile/prefs |
| PATCH  | /me/password | Bearer | Change own password      |

`POST /api/v1/auth/register` requires `firstName`, `lastName`, `email`,
and `password`. Names are trimmed and limited to 64 characters. The optional
`phone` field must use E.164 format (for example, `+15551234567`). The
service derives the username from the email and always assigns the `USER`
role and `PENDING` status; client-supplied role or status fields are ignored.

### Users (`/api/v1/users`)

| Method | Path | Auth  | Description                |
| ------ | ---- | ----- | -------------------------- |
| GET    | /    | ADMIN | List users (paginated)     |
| GET    | /:id | ADMIN | Get user by ID             |
| POST   | /    | ADMIN | Create new user            |
| PATCH  | /:id | ADMIN | Update user (role, status) |
| DELETE | /:id | ADMIN | Deactivate user            |

### Plan retirement

`DELETE /api/v1/admin/plans/:id` requires the admin role and retires a plan
without deleting financial or entitlement history. The request may provide an
optional `replacementPlanId`; otherwise the service deterministically chooses
the nearest active plan with a higher display order. The default plan is
protected until another default is selected.

The retirement transaction hides the source plan, expires each active source
assignment, creates a provenance-preserving replacement assignment, updates
the user's active plan, and writes one idempotent migration row. Non-paid
assignments are applied immediately. Paid assignments remain
`BILLING_SCHEDULE_PENDING` until payment-service schedules the replacement
price at the current subscription period end.

Payment-service consumes the service-token-only internal endpoints below;
neither route is exposed through nginx:

- `GET /api/v1/internal/plans/retirement-migrations/pending?limit=50`
- `POST /api/v1/internal/plans/retirement-migrations/:id/outcome`

Outcome recording is a pending-only compare-and-set. Transient transport,
catalog, or database failures stay pending and retry during the next
owner-locked reconciliation run; deterministic user overrides are marked
superseded.

### Effective entitlements and usage truth

`GET /api/v1/auth/me/entitlements` returns effective access, not a raw plan
assignment. An administrator always receives the virtual `admin` entitlement:
all feature gates enabled, `ALLOW_ALL` model access, and `null` daily, weekly,
monthly, and chat limits. A commercial plan assignment never narrows admin
access or makes the My Plan page present a paid tier as the effective limit.

`GET /api/v1/auth/me/usage` reads finalized raw model-token totals from the
durable `TokenUsageLedger` over inclusive UTC day, ISO-week, and month date
ranges. Redis remains the atomic reservation/enforcement store; it is not the
reporting source of truth because in-flight estimates are not consumed tokens.

Search, fetch, and extract remain explicit operation counters in
`FeatureUsageRecord`. Admin and no-plan executions are recorded in an
unlimited lifetime observation bucket without reserving or enforcing a feature
allowance. They are never converted into invented token equivalents.

## JWT Flow

1. User POSTs email + password to `/auth/login`
2. Service verifies credentials with argon2
3. Issues access token (short-lived, configured via `JWT_ACCESS_EXPIRY`) and refresh token (long-lived, `JWT_REFRESH_EXPIRY`)
4. Refresh token is stored as a Session record in the database
5. On `/auth/refresh`, the old session is deleted and a new one created (rotation)
6. On `/auth/logout`, the session record is deleted, invalidating the refresh token

## JWT Payload

```typescript
type JwtPayload = {
  sub: string; // User ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};
```

## Events Published

| Event             | Trigger            | Consumers |
| ----------------- | ------------------ | --------- |
| user.login        | Successful login   | audit     |
| user.logout       | Logout             | audit     |
| user.created      | Admin creates user | audit     |
| user.role_changed | Admin changes role | audit     |
| user.deactivated  | Admin deactivates  | audit     |

## Key Dependencies

- `argon2` -- password hashing
- `@nestjs/jwt` -- JWT signing and verification
- `ioredis` -- session cache (optional, for token blacklisting)
- `jsonwebtoken` -- low-level JWT operations

## Security Considerations

- Passwords are never logged (pino redaction configured for `password`, `passwordHash`, `refreshToken`)
- Refresh tokens are rotated on every use to prevent replay attacks
- Failed login attempts should be rate-limited via `@nestjs/throttler` (100 req/min default)
- The admin seed user is created on first startup via `prisma/seed.ts`

## The Super Administrator

One account carries `User.isSuperAdmin`. A **partial unique index** —
`users_single_super_admin_idx ... WHERE is_super_admin = true`, created in raw SQL
by `migrations/20260812230000_super_admin_email_verification` — guarantees at most
one. No HTTP path grants or clears the flag: `UpdateUserData` has no such field
and `createUserSchema` has no such field, so the only writers are the seed
(`prisma/seed.js`, `prisma/seed-super-admin.js`) and migration SQL.

**Known debt.** Prisma cannot express a partial unique index, so
`schema.prisma`'s `User` block does not declare it and a future
`prisma migrate dev` diff can propose dropping it. It is the only structural
guarantee that exactly one super administrator exists. If a migration ever
proposes that drop, reject it.

### Authority is two questions, answered in two places

| Question                                                       | Answered by                                    | Where                                                               |
| -------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| May this actor mutate **this row**, for **this scope**?        | `resolveSuperAdminMutability` (pure)           | `modules/users/service.utilities/super-admin-mutability.utility.ts` |
| Does this actor hold super-administrator **authority** at all? | `UsersService.assertSuperAdminActor` (DB read) | `modules/users/services/users.service.ts`                           |

They are separate because they fail differently, and they ship together because a
self-exemption on the first without a gate on the second is an escalation.

`SUPER_ADMIN_SELF_PERMITTED_SCOPES` holds `PROFILE` only. The super administrator
may rename themselves through the admin surface; role, status, plan, delete and
administrator-issued password rotation stay refused even for them, because the
partial unique index makes self-lockout unrecoverable through the product. Their
own password still changes through `/users/me/password`.

### Administrator-class mutations

These require a super-administrator actor: creating an `ADMIN`, promoting to
`ADMIN`, demoting an `ADMIN`, suspending or reactivating an `ADMIN`, and editing a
**system** role's permission set. Mutations aimed at ordinary users are
deliberately not gated.

`RolesController` requires `ADMIN_PERMISSIONS_MANAGE` on every route. Before
2026-08-27 it required nothing beyond the `ADMIN` role enum, which let one
administrator strip grants from the `ADMIN` system role and thereby degrade every
administrator — an attack on the super administrator that never touched the super
administrator's row.

### System-driven writes are exempt

`EntitlementApplierService` (RabbitMQ billing events) and the plan-retirement
transaction write `activePlanId` on any row, super administrator included, on
purpose. A legitimate event that cannot be applied does not protect anybody — it
poisons a consumer retry loop.

### Refusal codes

`SUPER_ADMIN_IMMUTABLE` (wrong actor for this target), `SUPER_ADMIN_SELF_LOCKED`
(right actor, wrong scope), `SUPER_ADMIN_REQUIRED` (actor lacks authority). All
`403`; an unknown target id is `404`. Each is logged as a structured `WARN`,
because repeated attempts are a security signal.

Full rule: [`rules/35-super-administrator-and-privilege-boundaries.md`](../../rules/35-super-administrator-and-privilege-boundaries.md) ·
Decision: [ADR-073](../13-adr/adr-073-super-administrator-authority.md)

## Activating a pending account

A self-registration lands in `UserStatus.PENDING` with `emailVerifiedAt = null`,
and login hard-blocks anything that is not `ACTIVE`. `PATCH /users/:id/activate`
is the administrator's way through that wall.

It is deliberately **not** `reactivate`. Reactivating lifts a suspension on an
account that has already verified its address; activating asserts that an
administrator vouched for an address the product never confirmed. So activation
is one transaction over three writes that must not be separable:

1. `status` → `ACTIVE`
2. `emailVerifiedAt` → now
3. every outstanding `EmailVerificationToken` marked **consumed**

Consumed rather than deleted, so the verify-email page can tell "already used"
from "never existed" and say which. Activating a non-`PENDING` account is refused
with `USER_NOT_PENDING` rather than silently doing the right-looking thing.

The action publishes `EventPattern.USER_ACTIVATED` and audit-service records it at
`HIGH` severity beside the temporary-password action, because vouching for an
unverified address is where an investigation would start.

Before 2026-08-27 the only ways to flip the status were `PATCH /users/:id` and
`PATCH /users/:id/reactivate`. Neither set `emailVerifiedAt`, so the account came
out `ACTIVE` but unverified; neither touched the token, so the emailed link stayed
live; and both published `USER_CREATED` with a payload satisfying no payload type
and consumed by nothing. `USER_UPDATED` and `USER_REACTIVATED` now exist so those
three events say three different things.

## Plan flags: signup versus popular

`Plan` carries two independent flags.

| Flag        | Meaning                                                                                        | Written by                          |
| ----------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| `isDefault` | The plan a new signup is granted. Read by `AuthManager.register` and by `UsersService.create`. | `POST /admin/plans/:id/set-default` |
| `isPopular` | The plan the public pricing page badges "Most popular". A marketing claim.                     | `POST /admin/plans/:id/set-popular` |

They were one flag until 2026-08-27, so the badge always followed the signup
plan — which meant the pricing page advertised the free tier as the most popular
one.

`Plan.popularKey` is a nullable `@unique` column emulating a partial index, the
same trick `PlanPriceVersion.activeKey` uses: it carries the literal `'popular'`
while a plan holds the badge and `NULL` otherwise, so Postgres rejects a second
badged plan rather than an application-level "unset the others" racing between
two administrators.

**Neither flag is writable through the plan DTOs**, and the migration that added
`isPopular` deliberately does not write `isDefault` on any row — moving the signup
plan is an operator decision per install, never a migration. See
[ADR-074](../13-adr/adr-074-plan-signup-flag-and-popular-badge.md).

## Module Structure

```
src/
  modules/
    auth/
      controllers/auth.controller.ts
      services/auth.service.ts
      auth.module.ts
    users/
      controllers/users.controller.ts
      services/users.service.ts
      users.module.ts
    health/
      controllers/health.controller.ts
      services/health.service.ts
      health.module.ts
```

## Email Change

The authenticated email-change flow keeps ownership scoped to the current access-token subject:

| Method   | Route                                          | Purpose                                                                           |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/users/me/email-change`                | Request a change and send an OTP to the current email.                            |
| `POST`   | `/api/v1/users/me/email-change/verify-current` | Verify the current-email OTP and send a confirmation link to the requested email. |
| `POST`   | `/api/v1/users/me/email-change/resend`         | Resend the active step without revealing account or delivery state.               |
| `GET`    | `/api/v1/users/me/email-change`                | Return the caller's pending request status.                                       |
| `DELETE` | `/api/v1/users/me/email-change`                | Cancel the caller's pending request.                                              |
| `POST`   | `/api/v1/auth/email-change/confirm`            | Publicly consume the one-time confirmation token and complete the swap.           |

The five `/users/me` operations require authentication, derive the user ID from the current principal, and never accept a caller-supplied user ID. Mutating operations are throttled to five requests per minute. Request and resend responses stay generic to resist account and email enumeration.

The manager stores only hashes of OTPs and confirmation tokens. OTP expiry, confirmation expiry, resend cooldowns, maximum attempts, and single-use state transitions are enforced before completion. The final email swap and request completion run transactionally so a partial update cannot leave identity state split.

### Operations

Apply the Prisma migration and regenerate the client before deploying the service. Rebuild through the supported repository service lifecycle command, then verify the auth-service health endpoint and the email-change flow against the rebuilt container.

**Documented deviation:** the new SMTP messages use inline English templates in the existing auth email adapter. The repository currently has no email-template or email-i18n layer; introducing one is outside Batch 09.

---

## PAYG connector credit (ADR-078)

This service owns the wallet. `modules/credit/` holds `UserCreditWallet`,
`CreditLedgerEntry`, `CreditPackage(+Version)`, the reservation manager, the
grant renewal, the reservation sweeper and the PAYG classification;
`modules/system-settings/` holds the kill switch.

| Method     | Route                                                   | Purpose                                                                        |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `POST`     | `/api/v1/internal/credit/reserve`                       | Place a hold. Returns the `maxOutputTokens` the caller MUST send the provider. |
| `POST`     | `/api/v1/internal/credit/finalize`                      | Settle a hold against measured usage.                                          |
| `POST`     | `/api/v1/internal/credit/release`                       | Give a hold back. Idempotent.                                                  |
| `GET`      | `/api/v1/internal/credit/wallet/:userId`                | Wallet snapshot for another service.                                           |
| `GET`      | `/api/v1/internal/credit/packages[/:id/active-version]` | Server-side pricing for a top-up.                                              |
| `GET`      | `/api/v1/credit/me`, `/me/ledger`, `/packages`          | The user's own balance, activity and buyable packages.                         |
| `GET/POST` | `/api/v1/admin/credit/*`                                | Wallet inspection, manual adjustment, package catalog. `ADMIN_CREDIT_MANAGE`.  |

Every internal route requires `buildInterServiceAuthHeader` and Zod-bounded
input; they move dollars and deliberately do not inherit `internal/quota`'s
`@Public()` shape.

`Plan.monthlyProviderCostCeilingMicroUsd` is now the **user-visible** monthly
allowance, not a hidden margin control — a reversal of
`docs/06-data/plan-and-quota-specification.md`, recorded in ADR-078. It stays
identical to `monthlyTokenQuota` by construction, and `plan-catalog.spec.ts`
fails if they drift.

`RESERVE_QUOTA_LUA` has **nine** windows. See
`apps/claw-auth-service/CLAUDE.md` for the four things that are easy to break,
and `docs/03-architecture/payg-credit.md` for the mechanism end to end.

### Operations

Apply the migration and regenerate the client before deploying. This service
needs a **full container cycle** (stop → rm → rmi → build), not a rebuild:
`@nestjs/schedule` is a new dependency and a layer cache will serve the old
dependency set with no build error. **auth-service must be healthy before
payment-service starts** — see `docs/11-runbooks/runbook-payg-credit.md`. Both
docker entrypoints swallow a seed failure, so verify the allowances by reading
the table, never by reading the log.
