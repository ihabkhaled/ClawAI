# ADR-204: Administrators can see, end and clear sessions, and the system-wide kill needs two steps

**Status**: Accepted
**Date**: 2026-10-31
**Builds on**: ADR-106 (session families), ADR-112 (a revoked session stops at the guard), ADR-200 (admin users: IP, country, ban)

## Context

An administrator could ban or re-key an account, but could not see where an account was signed in,
end one device, or answer a security incident ("sign everyone out") without touching the database.
Refresh rotation (ADR-106) made the data awkward: one login is a _family_ of rows, and every refresh
adds a row.

## Decision

1. **A login is a family; its origin belongs to the family.** `sessions` gains `ip_address`
   (VarChar 45), `country_code`, `user_agent` (VarChar 512), `os`, `browser`, `device_kind`. They are
   written when the login is created and **copied from the previous row** on every rotation and
   sibling, never taken from the refresh request, so a refresh from a new network cannot overwrite where
   the login happened. Address and country use the platform's one trusted-proxy rule and the offline
   `geoip-country` lookup already used at registration (ADR-200). Login and the VS Code exchange record
   an origin; the device-code flow has no request to read and records nulls ("unknown"). Old rows are
   not backfilled.
2. **User-agent parsing is an in-repo reader**
   (`common/utilities/user-agent.utility.ts`, ~100 lines, no dependency). `ua-parser-js` v2 is AGPL and
   was refused; a library for a label an administrator reads once was not worth the install size. Input is
   clipped to 512 characters, control characters are removed, patterns are anchored; a spoofed string only
   changes a label.
3. **State is decided from the newest row of the family and the clock**: revoked => TERMINATED, past
   expiry => EXPIRED, else ACTIVE. EXPIRED is never stored.
4. **Termination is recorded.** `terminated_at`, `terminated_by_user_id` and `termination_reason`
   (constrained string: USER_LOGOUT, ADMIN_TERMINATED, ADMIN_TERMINATED_ALL, GLOBAL_TERMINATION,
   TOKEN_REUSE, ACCOUNT_BANNED, PASSWORD_CHANGED, ACCOUNT_DEACTIVATED, ACCOUNT_CHANGED) are written
   with `revoked_at` by every closer (`buildTerminationData`). A legacy revoked row reads as "reason not
   recorded". A refresh of a login that was ended on purpose now answers the coded `SESSION_TERMINATED`
   (401) so the client runs its ordinary signed-out flow; the reason is never on the wire.
5. **Ending a login cuts the user off everywhere**: one atomic `UPDATE ... RETURNING id`, then the ids are
   published to Redis (`auth:revoked-session:<id>`, ADR-112) so every service's guard refuses the old access
   token now. Ending your **own** current login (one or all) needs `confirmCurrent: true`, else
   `409 CURRENT_SESSION_CONFIRM_REQUIRED`; the UI marks it "this is your current session".
6. **Authority**: per-user endpoints need ADMIN + `ADMIN_USERS_MANAGE`. Acting on another administrator
   needs the super administrator, and nobody but the super administrator can touch the super
   administrator's sessions (new scope `SuperAdminMutationScope.SESSIONS`, self-permitted).
7. **Clear logs** hard-deletes **inactive** logins only. The inactive test (newest row revoked or past
   expiry) is inside the `DELETE` statement itself, so a login that became active between a read and the
   delete is never removed. Clearing one log that is active answers `409 SESSION_ACTIVE_CANNOT_CLEAR`.
8. **The system-wide actions** ("end every session of every user", "clear every finished log") are
   **super administrator only**: they end other administrators' sessions, which is an administrator
   mutation. Two steps, both server-enforced:
   - Step 1 `POST /auth/session-security/challenge {action, password}`: verifies the caller's **own**
     password with argon2 (an unknown account burns the same work), counts failures per administrator
     (5 per 15 minutes, then `429 GLOBAL_PASSWORD_LOCKED` even for the right password), logs and audits each
     failure with the administrator id only, and returns a random one-time token. Only the SHA-256 of the
     token is stored in Redis (`auth:session-global-token:<hash>`, 60 s), bound to the administrator and
     the action.
   - Step 2 `POST /auth/session-security/terminate-all` or `/clear-logs` with the token and the typed
     phrase (`TERMINATE ALL`, `CLEAR ALL LOGS`). The phrase is compared exactly **before** the token is
     spent (a typo costs nothing); the token is consumed with an atomic `GETDEL` (single use) and must
     match administrator and action. Every refusal is `403 GLOBAL_TOKEN_INVALID`.
   - Behaviour chosen: the **acting administrator's current login is kept** by default
     (`keepCurrentSession: true`; the dialog says so), so the person answering an incident stays in the
     console. Only logins that existed when the call started are closed, in batches of 1,000 (`FOR UPDATE
SKIP LOCKED`, each batch published to Redis in one pipeline, memory bounded, hard cap 10,000 batches);
     a login made during the incident survives, which is what guarantees the loop ends. Re-running closes
     those; it is idempotent.
   - Rate limits: 10/min on the challenge, 5/min on each action, plus the password lock above.
9. **Audit**: the repo has an audit service but no generic admin-action event, so auth-service keeps its
   own table `session_admin_audit` (actor, action, target, family count, row count). Never a token, hash,
   password or address. Failed global password attempts are recorded too.
10. **Routes** stay on the existing nginx prefixes: `/users/:id/sessions...` and `/auth/session-security/...`.

## Consequences

- One additive, idempotent migration `20261031150000_add_session_origin_and_termination`: 9 nullable
  `sessions` columns, 2 indexes, table `session_admin_audit`. No env var, no new dependency, no new
  `@claw/shared-*` symbol.
- **The session IP is personal data**, admin-only, kept until the session rows are cleared or the account
  is deleted (cascade). Clearing logs is the retention tool.
- Password-reset still hard-deletes a user's sessions without publishing to Redis (pre-existing); those
  logs are lost rather than marked. Deactivation revokes in the database only (pre-existing).
- `last used` is the newest row's creation time, i.e. the last refresh, not every request.
- Not done: email notice to the user when a session is ended; viewing the audit table in the admin UI.
