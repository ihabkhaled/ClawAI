# 2026-10-31 Admin users: ban, set password, registration IP and country, phone, presence (ADR-200)

**What changed**

- auth-service: ban/unban (`POST /users/:id/ban`, `/unban`), admin password set/generate
  (`POST /users/:id/password`), presence (`POST /users/me/heartbeat`,
  `GET /users/presence-summary`, `?presence=ONLINE|ACTIVE_24H`, `?banned=true`), registration IP and
  offline country, admin phone edit. `ACCOUNT_BANNED` blocks login, refresh and every sign-in path;
  sessions are revoked and published (ADR-112).
- frontend: presence counters and filters, presence dot, registration IP/country column, eye-icon
  detail dialog, ban and set-password dialogs (generated password shown once with a copy button),
  phone field in the edit dialog, "banned until" sign-in message in 13 locales.
- DB: migration `20261031130000_add_user_ban_ip_presence` (7 nullable columns, 2 indexes).
- Dependency: `geoip-country` in `apps/claw-auth-service`.

**Operators**

- No env var. Migration runs on deploy (`prisma migrate deploy`).
- Dev containers: rebuild the auth-service image once (`service:rebuild auth-service`) for the new
  package; no shared `@claw/shared-*` symbol was added.
- Production check: sign in, open Admin > Users, confirm counters; ban a test account for 1 minute
  and confirm login says "banned until", then unban; generate a password for a test account and
  sign in with it.

**Personal data**: registration IP is admin-only, kept until the account is deleted.
