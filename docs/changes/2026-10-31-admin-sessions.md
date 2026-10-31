# 2026-10-31 Admin sessions: list, end, clear, and the two-step system-wide kill (ADR-204)

**What changed**

- auth-service: each login records IP, offline country, OS, browser, device kind and the raw user agent
  on its session family (refresh keeps them). Endpoints: `GET /users/:id/sessions` (state filter, paging,
  summary), `POST /users/:id/sessions/:familyId/terminate`, `POST /users/:id/sessions/terminate-all`,
  `DELETE /users/:id/sessions/:familyId/log`, `DELETE /users/:id/sessions/logs`, and the super-administrator
  system-wide `POST /auth/session-security/{challenge,terminate-all,clear-logs}`. Ending a session revokes
  the family and publishes the ids to Redis (ADR-112); the next refresh answers `SESSION_TERMINATED`.
- frontend: `/admin/users/[id]/sessions` (reached from the eye-icon detail dialog), `/admin/security/sessions`
  (sidebar "Session security", super administrator only), two-step password + typed-phrase dialogs, strings
  in 13 locales (`admin-sessions-translations.ts`).
- DB: migration `20261031150000_add_session_origin_and_termination` (9 nullable columns, 2 indexes, table
  `session_admin_audit`).

**Operators**

- No env var, no new dependency. Migration runs on deploy (`prisma migrate deploy`). Deploy auth-service and
  the frontend together. Dev containers: restart auth-service (it applies the migration) and
  `docker restart claw-frontend`; no `@claw/shared-*` change.
- Production check: sign in as the super administrator, open Admin > Users > eye icon > Sessions on a test
  account, sign that account in from a phone, end that one session and confirm the phone is signed out and
  the row shows who/when/why. Open Session security, enter a wrong password (refused), the right one, then
  type `CLEAR ALL LOGS` only if you mean it. Do not run "End all sessions" in production as a test.

**Personal data**: the session IP is admin-only; clear logs removes it.
