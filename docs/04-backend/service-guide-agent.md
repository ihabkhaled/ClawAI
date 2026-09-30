# Service Guide — `claw-agent-service`

> Port 4015. PostgreSQL DB `claw_agent`. Owns: `AgentSession`, `TerminalCommand`,
> `LocalRepo`, `FileWatchEvent`, `Device`, `RefreshToken`, `PairingRequest`,
> `DeviceCodeRequest`.

Post-Phase-A architecture (ADR-015).
Master plan: `C:\\Users\\Ihab\\.claude\\plans\\melodic-leaping-donut.md`.
Audit: `.claude/Integrations/04_desktop_agent__01_full_audit_and_power_expansion_report.md`.

## Scope

Backend surface for (a) the desktop CLI's pairing/auth/refresh flows and (b) the
webapp's device-management UI. Retains the legacy v1 terminal-command approval
queue and file-watch ingest behind a compatibility guard during Phase A → Phase B.

## Authentication modes

Three coexist:

1. **User JWT** (via `@claw/shared-auth`) — webapp-initiated calls:
   `/auth/pair/approve`, `/auth/device-code/approve`, `/devices/*`, plus
   existing `/sessions`, `/commands`, `/events`, `/repos` admin endpoints.
2. **Device access token (JWT)** — issued by `/auth/pair/poll` or
   `/auth/device-code/token`, 15-min TTL. Claims: `sub`, `deviceId`, `scopes`,
   `jti`, `orgId`. Verified by `DeviceAccessGuard`.
3. **Legacy `sessionKey`** — `CompatAgentGuard` on heartbeat /
   `/commands/pending` / `/commands/:id/complete` / `/events`. Responses carry
   `Deprecation: true` and `Sunset: 2026-07-01`.

Guard order on shared endpoints: `DeviceAccessGuard` → `AgentKeyGuard` fallback,
wrapped by `CompatAgentGuard`.

## Endpoints

| Verb  | Path                                           | Auth                                             |
| ----- | ---------------------------------------------- | ------------------------------------------------ |
| POST  | /api/v1/agent/auth/pair/init                   | public                                           |
| POST  | /api/v1/agent/auth/pair/approve                | User JWT                                         |
| POST  | /api/v1/agent/auth/pair/deny                   | User JWT                                         |
| POST  | /api/v1/agent/auth/pair/poll                   | public                                           |
| POST  | /api/v1/agent/auth/device-code/create          | public                                           |
| POST  | /api/v1/agent/auth/device-code/token           | public                                           |
| POST  | /api/v1/agent/auth/device-code/approve         | User JWT                                         |
| POST  | /api/v1/agent/auth/device-code/deny            | User JWT                                         |
| POST  | /api/v1/agent/auth/refresh                     | public                                           |
| GET   | /api/v1/agent/devices                          | User JWT                                         |
| GET   | /api/v1/agent/devices/:id                      | User JWT                                         |
| PATCH | /api/v1/agent/devices/:id                      | User JWT                                         |
| POST  | /api/v1/agent/devices/:id/revoke               | User JWT                                         |
| POST  | /api/v1/agent/sessions                         | User JWT                                         |
| GET   | /api/v1/agent/sessions                         | User JWT                                         |
| POST  | /api/v1/agent/sessions/:id/heartbeat           | CompatAgentGuard                                 |
| GET   | /api/v1/agent/commands/pending                 | CompatAgentGuard                                 |
| POST  | /api/v1/agent/commands/:id/complete            | CompatAgentGuard                                 |
| POST  | /api/v1/agent/events                           | CompatAgentGuard                                 |
| GET   | /api/v1/agent/organizations/policy/effective   | User JWT                                         |
| GET   | /api/v1/agent/organizations/:id/policy         | User JWT                                         |
| PUT   | /api/v1/agent/organizations/:id/policy         | User JWT (OWNER/ADMIN)                           |
| POST  | /api/v1/agent/organizations                    | User JWT (caller becomes OWNER)                  |
| GET   | /api/v1/agent/organizations                    | User JWT (own memberships)                       |
| GET   | /api/v1/agent/organizations/:id/members        | User JWT (member)                                |
| POST  | /api/v1/agent/organizations/:id/members        | User JWT (OWNER/ADMIN; OWNER role only by OWNER) |
| GET   | /api/v1/agent/organizations/:id/devices        | User JWT (OWNER/ADMIN)                           |
| POST  | /api/v1/agent/organizations/:slug/sso/metadata | User JWT (OWNER/ADMIN)                           |
| POST  | /api/v1/agent/organizations/:slug/sso/callback | public (IdP-signed)                              |

### Organization policy

`policy/effective` is what a coding-agent client asks for. It is deliberately
not under `:id`: a client does not know which organizations its user belongs to
and should not have to ask. The response is the **intersection** of every
organization the caller is a member of, so belonging to a permissive
organization cannot loosen a stricter one, and it never names the organization
that imposed a constraint — a member of two must not learn one's policy from the
other's.

Every field narrows and none widens. That is what makes it safe to deliver over
an authenticated HTTPS request rather than as a signed document: a forged policy
could only refuse work, never grant it. Entitlements, which gate money, already
arrive the same way. A signed distribution would additionally survive a
compromised backend and is left for the day that threat is in scope.

Two asymmetries are deliberate. Reading an organization's own policy needs only
membership, because a member is entitled to know the rules they are held to;
writing needs OWNER or ADMIN. And a non-member reading gets `404`, not `403`,
because telling them the organization exists is itself a disclosure.

The intersection rules live in
`src/modules/fleet/utilities/policy-intersection.utility.ts`. The one that
surprises people: an **empty allowlist means "everything"**, so combining `[]`
with `['a']` yields `['a']`, not `[]`.

### Organization access (REQ-SEC-001 / SEC-005)

Every organization check goes through `OrganizationAccessService`
(`src/modules/fleet/services/organization-access.service.ts`), called from the
service layer with the caller's own id — never a guard that trusts `:id`.

- **Reads** (members, own policy) need membership. **Mutations** (add member,
  policy, SSO metadata) and the device matrix need OWNER or ADMIN of THAT
  organization.
- A stranger, a missing id and an unknown slug all get the same `404
Organization not found`. A member without the role gets `403`.
- **Only an OWNER may grant OWNER.** An ADMIN cannot mint a rank above their own.
- **Adding an existing member is `409`**, never a role change. That is what
  closes "re-add myself as OWNER".
- **Platform roles do not reach in.** A platform `ADMIN` who is not a member is
  an outsider. No permission in the catalog grants cross-organization access.
- There is no remove-member, change-role or delete-organization endpoint yet.
  Whoever adds one must refuse removing or demoting the **last OWNER**.

- `Device(id, userId, orgId?, name, hostname, os, platform, agentVersion,
scopesCsv, status[ACTIVE|REVOKED], lastSeenAt, lastIp, revokedAt, revokeReason,
metadata, createdAt, updatedAt)`
- `RefreshToken(id, deviceId, tokenHash, jti, status[ACTIVE|USED|REVOKED],
expiresAt, usedAt, replacedById, createdAt, lastUsedIp)`
- `PairingRequest(id, codeHash, stateNonce, deviceHint, loopbackPort,
status[PENDING|APPROVED|DENIED|EXPIRED|CONSUMED], ...)`
- `DeviceCodeRequest(id, userCode, deviceCodeHash, deviceHint, intervalSeconds,
slowDownUntil, offenceCount, status, ...)`
- `AgentSession` gained optional FK `deviceId?` and `deprecatedKey` boolean.
- `OrganizationPolicy(id, organizationId unique, allowedTools[], allowedModels[],
maximumRisk, deniedEffects[], requireApproval[], maximumRetentionDays,
minimumPermissionMode?, createdAt, updatedAt)` — one row per organization,
  created on first write. Every default is the widest possible value, so the
  migration changes nothing until an administrator narrows a field; a migration
  that tightened on arrival would lock out every member of every organization the
  moment it ran.

## Events (`claw.events`, topic)

- v1 retained: `agent.session_connected`, `agent.session_disconnected`,
  `agent.command_requested|approved|rejected|completed`.
- **New:** `agent.device_paired`, `agent.device_revoked`, `agent.token_rotated`,
  `agent.token_reuse_detected`.

Consumer: audit-service.

## Redis keys

- `agent:revocation:device:<id>` — access-token short-circuit.
- `agent:revocation:jti:<jti>` — token-level revocation.

TTL matches `AGENT_ACCESS_TTL_SECONDS`.

## Environment

New: `AGENT_ACCESS_TTL_SECONDS` (900), `AGENT_REFRESH_TTL_DAYS` (30),
`AGENT_PAIRING_TTL_SECONDS` (120), `AGENT_DEVICE_CODE_TTL_SECONDS` (900),
`AGENT_REFRESH_GRACE_SECONDS` (15).
Retained: `AGENT_DATABASE_URL`, `AGENT_PORT`, `REDIS_URL`, `RABBITMQ_URL`,
`JWT_SECRET`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`.

## Managers (scheduler)

- `AgentSessionManager` — stale-session sweeper (60 s).
- `AgentCommandManager` — existing.
- `PairingCleanupManager` — new; 30 s sweep of pending pairing/device-code.
- `RefreshCleanupManager` — new; hourly purge of old refresh rows.

## Testing

- `npm run test --workspace apps/claw-agent-service` (unit).
- `bash qa/test-agent-phase-a.sh` (integration + DB + logs).
- Manual UI: `/agent/connect?pairingCode=…`, `/settings/devices`,
  `/settings/devices/:id`.

## Observability

Pino log redaction covers: `authorization`, `password`, `refreshToken`,
`accessToken`, `pairingCode`, `userCode`, `deviceCode`, and the same fields in
response bodies. Every pair/approve, rotation, reuse-detect, and revoke emits
a RabbitMQ event consumed by audit-service.

## Cron for prompt routines (F099, 2026-10-01)

`POST agent/scheduled-commands` with `kind: "PROMPT"` takes `cron` (five fields,
read in **UTC**, at most every 5 minutes, same grammar as the client) instead of
`intervalMinutes`; exactly one of the two. The normalised expression is stored in
`scheduled_commands.cron` (migration `20261001100000_add_prompt_routine_cron`, NULL
for every existing row) and decides `nextRunAt` at creation and after each fire;
`intervalMinutes` holds the 5-minute floor as an unused placeholder. A stored
expression that no longer yields a date falls back to the interval. Time zones,
repository-event triggers and secrets isolation are open: see
`docs/14-risk-debt/coding-agent-backend-decisions-2026-10.md`.

## Remote triggers, channels and runners (2026-09-29)

- **Remote trigger:** `POST /agent/scheduled-commands/:id/trigger` fires an owned
  scheduled command now. `idempotencyKey` is kept in Redis for 24h, so a retry
  returns the same command instead of running twice. 404 when not owned, 409
  when the device is offline or the same key is still running.
- **Channels** (`src/modules/channels/`): an HMAC-verified public webhook (raw
  body + 5-minute timestamp window, 16 KB cap) drops alerts into a per-user
  Redis inbox (newest 100, 7-day TTL); the owner reads and acknowledges it. The
  per-user secret is derived from the encryption key, not stored, so rotating
  one user's secret means rotating the master key.
- **Runners** (`agent-runner.controller.ts`): register, list, dispatch to a
  runner or by label, claim one job at a time; every user endpoint is scoped to
  the caller's own runners and jobs still pass the command policy check.
- **Runner identity (F100, 2026-09-30):** registration returns a `runnerToken`
  (`clwr_` + 256 random bits) shown once; only its SHA-256 lives in
  `runner_credentials`. The session key is minted but never returned for a
  runner. `POST agent/runners/heartbeat`, `/claim` and
  `/jobs/:commandId/complete` accept ONLY that token (`RunnerTokenGuard`); a
  user JWT, device token or session key is 401. Owners rotate
  (`POST :id/credential/rotate`, old token dies immediately) and revoke
  (`DELETE :id`, token revoked + session DISCONNECTED); another user's runner
  is 404. Heartbeat expiry: a runner whose last heartbeat is older than
  `RUNNER_HEARTBEAT_TTL_SECONDS` (120 s) is not listed, gets no job and
  claims nothing; its next heartbeat revives it. Completing a job not
  addressed to the calling runner is 403.
- **Prompt routines (F099, 2026-09-30):** `POST agent/scheduled-commands` with
  `kind: PROMPT` (`prompt`, optional `model` as `PROVIDER/model`, optional
  `repoRef` = workspace folder name, `runnerLabels`) needs no device
  (`deviceId` is nullable). When due, `SchedulerManager` hands it to
  `RunnerService.dispatchPrompt`, which queues an APPROVED `TerminalCommand`
  with `kind: PROMPT` on the owner's live runner carrying every label; none
  live = deferred to the next tick. The portal does not approve prompts: the
  runner runs it through the headless SDK and approves each tool call under
  the `approvalPolicy` it registered with (`ASK`, or
  `AUTO_APPROVE_READ_ONLY` = reads only; writes/commands always ask).
  Omitting `kind` keeps the old COMMAND behaviour. Migration
  `20260930130000_add_prompt_routines_and_runner_credentials`.
- **Device-to-session bridge fixed (IDOR):** `CompatAgentGuard` used to bind any
  `sessionId` from the request to the device's user. It now loads the session
  and answers 403 unless the device's user owns it; a missing session gets the
  same 403, so ids cannot be probed.

## References

- `docs/13-adr/adr-015-desktop-agent-auth-model.md` (design)
- `.claude/Integrations/04_desktop_agent__A_auth_replatform__0[1-4]*.md`
- `qa/test-agent-phase-a.sh`

## Organization guardrails, prompt routines, runner tokens (2026-09-30)

- **Policy guardrails:** `OrganizationPolicy` stores `rules`, `trust` and
  `mcpServers` as JSON (migration `20260930120000_add_organization_policy_guardrails`).
  OWNER/ADMIN write through `PUT :id/policy`; members read, and non-members get 404.
  Effective policy merges across organizations: rules concatenated, trust
  grouped per org, MCP denies unioned, and allows intersected. A malformed
  block denies all.
- **F081 plugin marketplaces (2026-10-01):** `OrganizationPolicy.allowedPluginMarketplaces`
  (nullable JSON, migration `20261001090000_add_org_policy_plugin_marketplaces`) is
  served in `policy/effective`. NULL means no opinion and the field is omitted;
  `[]` means none is allowed (the client's reading); an unreadable value reads as
  `[]`. Across organizations only sources every listing organization names
  survive (exact strings; the client normalises). `PUT :id/policy` takes it as
  `allowedPluginMarketplaces` (null or absent clears it).
- **Prompt routines:** a scheduled command can be `PROMPT` (prompt, optional
  `PROVIDER/model`, repo, runner labels). It is dispatched to the owner's
  online runner with matching labels, and waits a tick if none is online.
- **Runner tokens:** registration issues a `clwr_` token, shown once, stored as
  SHA-256, rotatable and revocable. Heartbeat, claim and complete require it. A
  runner only reports its own jobs, and gets no jobs 120 s after its last
  heartbeat (migration `20260930130000_add_prompt_routines_and_runner_credentials`).
- **Internal usage scope:** `GET /api/v1/internal/agent/organizations/:id/usage-scope`
  (service token) returns member ids to auth-service after an owner/admin
  check. `INTER_SERVICE_AUTH_TOKEN` unset refuses every call.
- **Process KILL policy:** `deny-process-kill-other-uid` denies a kill only when
  the target's `uidMatchesCurrentUser` is explicitly `false`, or is missing with
  no ownership evidence. A target with `managedByAgent: true` or a `jobId`
  (shell-launched jobs) is owned by the caller and is not denied by that rule.
  Matcher: `common/utilities/policy-target-matcher.utility.ts`.
