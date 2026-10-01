# ADR-144 — A narrower `mobile` device token class (F097)

**Status:** Accepted (backend built and gated 2026-10-01; no native mobile client exists).
**Owner decision:** 2026-10-01, the recommended default of
[`coding-agent-backend-decisions-2026-10.md`](../14-risk-debt/coding-agent-backend-decisions-2026-10.md) section F097, option (a).

## Context

A phone should be able to watch a coding-agent run and answer its approval prompts: read runs, approve or
deny a pending one, cancel one. It must not be able to run a shell, edit policy, or manage devices and
runners. Reusing the desktop device token (option b) would hand a phone every scope the desktop agent holds.

## Where it lives (a deviation from the brief)

The brief said auth-service. Device tokens are **not** issued there: pairing, device-code, refresh and the
`Device` table are agent-service (`/api/v1/agent/auth/*`, `agent/devices`). auth-service owns user sessions and
ops tokens. The class is therefore built where the credential already is. auth-service is not touched.

## Decision

| Piece       | Choice                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Class       | `DeviceTokenClass.MOBILE` (`@claw/shared-types`), stored as `devices.tokenClass` (`'device'` default, so every existing row is unchanged). Fixed at pairing, never widened.                                                                                                                                                                                                                         |
| Scopes      | `MobileDeviceScope`: `runs:read`, `runs:approve`, `runs:cancel`. Nothing else can be granted to a mobile device. The list is repeated as strings in `@claw/shared-constants` (`MOBILE_DEVICE_SCOPE_VALUES`) and a test keeps the two identical.                                                                                                                                                     |
| Issuance    | The existing pairing flow: `pair/init` (public) then the owner's `pair/approve` with `tokenClass: "mobile"` and run scopes; the phone polls `pair/poll`. The DTO and `PairingService` both refuse a scope list that does not fit the class. At most 5 active mobile devices per user.                                                                                                               |
| Lifetime    | Access token 600 s, refresh token 7 days (each rotation), device must re-pair 30 days after first pairing. All are ceilings (`min` with the desktop config), constants in `@claw/shared-constants`, no new env var.                                                                                                                                                                                 |
| Revocation  | Per device, by the owner, with the existing `POST /agent/devices/:id/revoke` (DB row, refresh tokens and the Redis revocation cache). Refresh-token reuse revokes the device, as for desktops.                                                                                                                                                                                                      |
| Signing key | A mobile access token is signed with a key **derived** from `JWT_SECRET` (HMAC, context `claw:agent-mobile-access-token:v1`) under its own audience `claw-agent-mobile` (rule 16 section 10). See "Finding" below for why this is required.                                                                                                                                                         |
| Allow-list  | One controller, `AgentMobileController` (`/agent/mobile/...`), 10 routes. `@MobileRoute()` marks a route as reachable by a phone **and by nothing else of the device family**. `DeviceAccessGuard` is the single choke point: a mobile token is refused (403) on every route without the mark, a desktop token is refused on every route with it, and a marked route that names no scope is closed. |
| Ownership   | Every call runs as `device.userId` from the verified token, through the same command and capability services the web UI uses. Another user's command is a 404 (rule 16 section 6), not 403.                                                                                                                                                                                                         |
| Audit       | `agent.mobile_action` (new) is one audit row per approve, reject or cancel, success or refused (refused is HIGH). `agent.device_paired` and `agent.device_revoked` now carry `tokenClass`. Consumed by audit-service.                                                                                                                                                                               |

"Runs" are terminal commands (`agent/commands`); "approvals" are capability invocations (`agent/capabilities`).

## Finding that shaped the design

Twelve services verify a bearer with `JWT_SECRET` and check **only the signature and algorithm** (their
`AuthGuard` calls `verifyAccessToken`, not `verifyUserAccessToken`). A desktop device token is signed with the
same `JWT_SECRET`, so today it is accepted by chat-service, connector-service and others as the user
(`email` and `role` undefined). A mobile token signed the same way would inherit that reach and the
"narrow" class would be a fiction. The derived key makes a mobile token unreadable to every other service. The
existing desktop device token is **not** changed here (rotating its key would sign every paired desktop out);
it remains an open item below.

## Default deny, and the proof

`src/app/__tests__/mobile-token-route-inventory.spec.ts` enumerates every controller registered under
`AppModule`, classifies each route by the credential it asks for, and drives a real mobile token through the
real guard for that credential: the global `AuthGuard` (user routes), `DeviceAccessGuard` and
`CompatAgentGuard` (device routes), `RunnerTokenGuard`, `ServiceTokenGuard`. The allow-list is the explicit
ten-route list in that test; a new route is closed to a phone until it is added there, and a new guard type
fails the test until classified. Removing the check in `DeviceAccessGuard` fails two of its eleven tests
(verified by mutation).

## Consequences

- A migration (`20261001120000_add_device_token_class`, idempotent) adds one column and one index.
- The device `os` hint now also accepts `ios` and `android`.
- Adding a mobile route is a deliberate, reviewed act: `@MobileRoute()`, `@RequireScopes(<mobile scope>)`, a
  line in the inventory test.

## Open (not decided by this ADR)

1. **A native mobile client does not exist.** Nothing consumes these routes yet. The web `/agent/connect`
   approval screen has no class selector; today the class is chosen by calling `pair/approve` directly.
2. **Risk cap.** A phone may approve a command of any risk label. Capping it (for example, no CRITICAL from a
   phone) is a product call.
3. **Desktop device tokens are accepted by services that do not check audience** (above). Fix is to move those
   guards to `verifyUserAccessToken` or to derive the desktop key too; either has a rollout cost.
4. **`POST /internal/agent/terminal/seed-command` is `@Public()` with no service-token guard** and relies on
   nginx blocking `/api/v1/internal/*`. Unrelated to mobile; found while enumerating routes.
5. Refused-route attempts are logged (device id, class, no token) but not audited as events; a probing stolen
   token is visible in logs, not in the audit trail.
