# ADR-200: Administrators can ban an account, set a password, and see where users came from and who is online

**Status**: Accepted
**Date**: 2026-10-31

## Context

The admin Users page could deactivate (SUSPENDED) or rotate to an emailed temporary password, but
it could not ban for a chosen time, set a password by hand, show where an account registered from,
or say who is online. The owner asked for all four, plus phone editing and a per-row detail view.

## Decision

1. **Ban is its own state, not a status.** Columns on `users`: `banned_at`, `banned_until`
   (`NULL` with `banned_at` set = lifetime), `ban_reason`, `banned_by_user_id`. `SUSPENDED` and
   `PENDING` are untouched. A timed ban lifts itself: every reader decides from the clock
   (`resolveBanState`). `AccountBanGateService` clears the stale columns lazily at the next
   login/refresh; the admin list reports the _effective_ state (an expired ban reads as lifted).
2. **A ban cuts the account off everywhere.** Ban revokes every open session and publishes the ids to
   Redis (`SessionRevocationCacheService`, ADR-112), so each service's `SessionRevocationGuard`
   refuses the still-unexpired access token. `TokenSessionManager.issue` (password, VS Code and
   device sign-in) and `rotate` call the gate, so no path mints or renews a token for a banned
   account. Login still verifies the password first (ADR-096): `ACCOUNT_BANNED` (403, with
   `bannedUntil` / `banPermanent`) is only said to someone who proved the password. The admin's
   reason is never sent to the banned user.
3. **Admin password set** (`POST /users/:id/password`, `MANUAL` or `GENERATE`). Policy is
   `validatePasswordStrength`; generation is 20 chars from `crypto.randomInt` with all four
   classes. The generated password is in that one response (`Cache-Control: no-store`) and nowhere
   else: hashed with argon2, never logged, never in an event. It sets `mustChangePassword`, revokes
   and publishes the sessions. Refused on your own account (use `/users/me/password`).
4. **Registration origin.** `registration_ip` (VarChar 45) and `registration_country_code`
   (VarChar 2) are written at sign-up. The address comes from the platform's one trusted-proxy
   rule (`resolveClientAddress`: nginx's overwritten `X-Real-IP` when the peer is the proxy; never
   `X-Forwarded-For`). Country is resolved **offline** with `geoip-country`, only for public
   addresses; no address leaves the process. `geoip-country` (8 MB, pure JavaScript, no install
   script) was chosen over `geoip-lite` (115 MB). No edge country header is used: nginx
   terminates TLS directly, so a header would be client-typed.
5. **Presence.** `last_seen_at`, written at most once per 60 s per user by `UserPresenceService`
   (Redis `SET NX EX 60`, with an SQL-guarded raw `UPDATE` as fallback that does not bump
   `updated_at`). Fed by login, refresh and `POST /users/me/heartbeat`, which the portal pings every
   60 s while the tab is visible. Online = seen within 5 minutes; "active 24 h" = within 24 hours.
   The heartbeat is an auth-service route (not plan usage) and is a routine route (no log line).
6. **Admin-only data.** `toAdminUser` (IP, country, presence, ban fields) is used by the admin
   endpoints only; `toSafeUser` and `/auth/me` never carry them. Ban and password actions need
   `ADMIN` + `ADMIN_USERS_MANAGE`, refuse yourself, refuse the super administrator
   (`SuperAdminMutationScope.BAN`), and need the super administrator to act on another admin.
   Admin edits of the phone use the registration rule (E.164-ish, empty clears).

## Consequences

- One additive, idempotent migration: `20261031130000_add_user_ban_ip_presence` (indexes on
  `last_seen_at` and `banned_until`).
- New dependency `geoip-country` in auth-service (its data carries MaxMind GeoLite2 attribution).
- **Registration IP is personal data.** Retention: kept for the life of the account; deleting the
  account deletes the row (and so the IP); it is shown to administrators only. No new env var.
- Deploy auth-service and the frontend together; the guards in other services need no change.
- Not done: a ban notice to the user by email; the admin's per-row action cell is crowded.
