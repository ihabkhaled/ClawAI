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
