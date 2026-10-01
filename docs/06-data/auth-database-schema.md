# Auth Database Schema (claw_auth)

PostgreSQL database for the auth service (port 5441). Manages users, sessions, and system settings.

---

## Connection

```
Database: claw_auth
Port: 5441 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-auth:5432/claw_auth?schema=public
Prisma schema: apps/claw-auth-service/prisma/schema.prisma
```

---

## Tables

### users

Stores all user accounts.

| Column                | Type                     | Nullable | Default   | Constraints | Description                    |
| --------------------- | ------------------------ | -------- | --------- | ----------- | ------------------------------ |
| id                    | String (CUID)            | NO       | `cuid()`  | PK          | Unique user identifier         |
| email                 | String                   | NO       | -         | UNIQUE      | User email address             |
| username              | String                   | NO       | -         | UNIQUE      | Display username               |
| password_hash         | String                   | NO       | -         | -           | Argon2 hashed password         |
| role                  | UserRole enum            | NO       | `VIEWER`  | -           | ADMIN, OPERATOR, VIEWER        |
| status                | UserStatus enum          | NO       | `PENDING` | -           | ACTIVE, SUSPENDED, PENDING     |
| must_change_password  | Boolean                  | NO       | `false`   | -           | Force password change on login |
| language_preference   | UserLanguagePreference   | NO       | `EN`      | -           | EN, AR, FR, IT, DE, ES, RU, PT |
| appearance_preference | UserAppearancePreference | NO       | `SYSTEM`  | -           | SYSTEM, LIGHT, DARK            |
| created_at            | DateTime                 | NO       | `now()`   | -           | Account creation timestamp     |
| updated_at            | DateTime                 | NO       | auto      | -           | Last update timestamp          |

**Indexes**:

- `email` — fast lookup by email (login)
- `status` — filter users by status

**Relations**:

- `sessions` — one-to-many with Session (cascade delete)

### sessions

Stores active refresh tokens for JWT rotation.

| Column        | Type          | Nullable | Default  | Constraints    | Description                |
| ------------- | ------------- | -------- | -------- | -------------- | -------------------------- |
| id            | String (CUID) | NO       | `cuid()` | PK             | Session identifier         |
| user_id       | String        | NO       | -        | FK -> users.id | Owning user                |
| refresh_token | String        | NO       | -        | UNIQUE         | Hashed refresh token       |
| expires_at    | DateTime      | NO       | -        | -              | Token expiration time      |
| created_at    | DateTime      | NO       | `now()`  | -              | Session creation timestamp |

**Indexes**:

- `user_id` — find sessions by user (logout/cleanup)
- `expires_at` — find expired sessions for cleanup

**Cascade**: Deleting a User deletes all their Sessions.

### system_settings

Key-value store for global system configuration.

| Column     | Type          | Nullable | Default  | Constraints | Description                 |
| ---------- | ------------- | -------- | -------- | ----------- | --------------------------- |
| id         | String (CUID) | NO       | `cuid()` | PK          | Setting identifier          |
| key        | String        | NO       | -        | UNIQUE      | Setting key name            |
| value      | String        | NO       | -        | -           | Setting value (JSON string) |
| updated_at | DateTime      | NO       | auto     | -           | Last update timestamp       |

**Indexes**:

- `key` — fast lookup by setting name

---

### plans (trial columns)

| Column                | Type    | Notes                                                                                                                                                    |
| --------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_trial`            | boolean | Once-per-account timed access (the Free plan).                                                                                                           |
| `trial_duration_days` | integer | Trial length, set per plan. CHECK `plans_trial_duration_check`: 1 to 3650 when `is_trial`, `NULL` otherwise. Seeded as 30; never overwritten on re-seed. |

`plan_trial_redemptions` is one row per user for life (`user_id` unique). An admin
Free-for-N-days grant updates it to point at the new assignment instead of adding a row.
See `docs/13-adr/adr-140-dynamic-trial-length.md`.

### plans (free credit-connector allowance, ADR-142)

| Column                                     | Type    | Notes                                                                                                                                                                                 |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `credit_connector_free_requests_per_month` | integer | Free requests per credit connector per UTC month. `NULL` = unlimited, `0` = none (default). CHECK `>= 0` when set. Seeded Free = 2, every other plan 0; never overwritten on re-seed. |

### credit_free_allowance_usage

One row per `(user_id, provider, period_key)` (unique): `used_count` is how many free
requests that user spent on that provider (upper-cased) in that UTC month (`YYYY-MM`).
Incremented only by one guarded upsert (`... WHERE used_count < limit`), decremented
(floor 0) when a call is released. `weighted_usage_records.is_free_allowance` flags the
reservation row, and the `CreditLedgerKind` enum gains `FREE_ALLOWANCE` (zero-amount rows).
See `docs/13-adr/adr-142-free-allowance-on-credit-connectors.md`.

## Enums

### UserRole

```
ADMIN     — Full access to all features and admin panel
OPERATOR  — Can manage connectors, view logs, moderate
VIEWER    — Basic chat access, view own data only
```

### UserStatus

```
ACTIVE    — Normal active account
SUSPENDED — Deactivated by admin (cannot login)
PENDING   — Awaiting activation
```

### UserLanguagePreference

```
EN, AR, FR, IT, DE, ES, RU, PT
```

### UserAppearancePreference

```
SYSTEM — Follow OS dark/light mode
LIGHT  — Always light mode
DARK   — Always dark mode
```

---

## Seed Data

The auth service seeds a default admin user on first startup:

```
email: ${ADMIN_EMAIL}        (default: admin@claw.local)
username: ${ADMIN_USERNAME}  (default: claw-admin)
password: ${ADMIN_PASSWORD}  (default: ClawAdmin123!)
role: ADMIN
status: ACTIVE
```

---

## Security Notes

- Passwords hashed with Argon2 (not bcrypt)
- Refresh tokens stored as unique strings (rotation on each refresh)
- Expired sessions should be cleaned up periodically
- Password hash is never exposed in API responses (SafeUser type omits it)
