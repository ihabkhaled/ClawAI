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

| Column                    | Type                     | Nullable | Default   | Constraints | Description                                         |
| ------------------------- | ------------------------ | -------- | --------- | ----------- | --------------------------------------------------- |
| id                        | String (CUID)            | NO       | `cuid()`  | PK          | Unique user identifier                              |
| email                     | String                   | NO       | -         | UNIQUE      | User email address                                  |
| username                  | String                   | NO       | -         | UNIQUE      | Display username                                    |
| password_hash             | String                   | NO       | -         | -           | Argon2 hashed password                              |
| role                      | UserRole enum            | NO       | `VIEWER`  | -           | ADMIN, OPERATOR, VIEWER                             |
| status                    | UserStatus enum          | NO       | `PENDING` | -           | ACTIVE, SUSPENDED, PENDING                          |
| must_change_password      | Boolean                  | NO       | `false`   | -           | Force password change on login                      |
| language_preference       | UserLanguagePreference   | NO       | `EN`      | -           | EN, AR, FR, IT, DE, ES, RU, PT                      |
| appearance_preference     | UserAppearancePreference | NO       | `SYSTEM`  | -           | SYSTEM, LIGHT, DARK                                 |
| registration_ip           | VarChar(45)              | YES      | -         | -           | Sign-up IP, admin-only personal data (ADR-200)      |
| registration_country_code | VarChar(2)               | YES      | -         | -           | Offline country of that IP                          |
| last_seen_at              | DateTime                 | YES      | -         | idx         | Presence, written at most once a minute             |
| banned_at                 | DateTime                 | YES      | -         | -           | Set while banned; with banned_until NULL = lifetime |
| banned_until              | DateTime                 | YES      | -         | idx         | End of a timed ban                                  |
| ban_reason                | VarChar(500)             | YES      | -         | -           | Admin note, never sent to the user                  |
| banned_by_user_id         | String                   | YES      | -         | -           | Acting administrator                                |
| created_at                | DateTime                 | NO       | `now()`   | -           | Account creation timestamp                          |
| updated_at                | DateTime                 | NO       | auto      | -           | Last update timestamp                               |

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

### plans (plugins, plugins-and-mcp-design.md section 5)

| Column                     | Type    | Notes                                                                                                                                                          |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allow_plugins`            | boolean | `NOT NULL DEFAULT true`: on for every plan, Free included.                                                                                                     |
| `max_installed_plugins`    | integer | Installs. `NULL` = unlimited, `0` = disabled, default 5.                                                                                                       |
| `max_user_mcp_servers`     | integer | Own MCP servers. `NULL` = unlimited, `0` = disabled, default 0.                                                                                                |
| `max_plugin_calls_per_day` | integer | Plugin tool calls per UTC day. `NULL` = unlimited, `0` = disabled, default 20. The `plan_feature_rules` row for `PLUGIN_CALLS` (window `DAY`) derives from it. |

Migrations `20261013100000_add_plugins_plan_gate`, `20261013120000_add_plugin_calls_feature` (the `PlanFeatureKey` value) and
`20261013120100_plugin_calls_plan_limits`.

### credit_free_allowance_usage

> Amended 2026-10-02: `provider` is always `'*'` (one total per user per month across all credit connectors). Migration `20261002120000_free_allowance_single_total` folds old per-provider rows into it.

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

### user_notifications

One notification for one user (ADR-164). `user_id` (FK users, cascade), `kind`, `link` (portal path, max 300), `params` (JSON of short strings), `dedupe_key` (max 200), `read_at`, `created_at`. Unique `(user_id, dedupe_key)` is the idempotency ledger; indexes on `(user_id, created_at desc)` and `(user_id, read_at)`.

### user_notification_preferences

One row per user, created on first change: `in_app_enabled` (default true), `email_enabled` (default true), `push_enabled` (default false), `updated_at`. No row means those defaults.

### push_subscriptions

One row per browser that agreed to Web Push (ADR-166). `endpoint` unique (varchar 1000, treated as a credential), `p256dh` and `auth` are the browser's public keys, `last_used_at` set on a successful send. FK `user_id` to `users`, cascade delete. Max 10 per user, enforced in the service.

### sessions: origin and termination columns (ADR-204)

All nullable, no backfill (old rows read as unknown). A login is a `family_id`; every row of a family carries the
**login's** origin, copied on each rotation.

| Column                  | Type         | Meaning                                                                                                                                                      |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ip_address`            | VarChar(45)  | Client address of the login (trusted-proxy rule). Personal data, admin-only                                                                                  |
| `country_code`          | VarChar(2)   | Offline GeoIP country of that address                                                                                                                        |
| `user_agent`            | VarChar(512) | Raw agent, control characters removed                                                                                                                        |
| `os`, `browser`         | VarChar(64)  | Parsed labels, e.g. `Windows`, `Chrome 130`                                                                                                                  |
| `device_kind`           | VarChar(16)  | DESKTOP, MOBILE, TABLET, TOOL, UNKNOWN                                                                                                                       |
| `terminated_at`         | DateTime     | Set with `revoked_at` when closed on purpose                                                                                                                 |
| `terminated_by_user_id` | String       | The administrator, null for self-service or automatic closes                                                                                                 |
| `termination_reason`    | VarChar(32)  | USER_LOGOUT, ADMIN_TERMINATED, ADMIN_TERMINATED_ALL, GLOBAL_TERMINATION, TOKEN_REUSE, ACCOUNT_BANNED, PASSWORD_CHANGED, ACCOUNT_DEACTIVATED, ACCOUNT_CHANGED |

Indexes added: `(user_id, family_id, created_at DESC)`, `(revoked_at, expires_at)`. State shown to admins is derived:
revoked => TERMINATED, past `expires_at` => EXPIRED, else ACTIVE.

### session_admin_audit

One row per admin session action: `actor_user_id`, `action` (SESSION_TERMINATE_ONE, SESSION_TERMINATE_ALL_FOR_USER,
SESSION_CLEAR_ONE_LOG, SESSION_CLEAR_USER_LOGS, SESSION_GLOBAL_TERMINATE_ALL, SESSION_GLOBAL_CLEAR_LOGS,
SESSION_GLOBAL_PASSWORD_FAILED), `target_user_id` (null for system-wide), `family_count`, `row_count`, `created_at`.
Counts only: never a token, hash, password or address.
