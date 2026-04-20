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

| Verb  | Path                                   | Auth             |
| ----- | -------------------------------------- | ---------------- |
| POST  | /api/v1/agent/auth/pair/init           | public           |
| POST  | /api/v1/agent/auth/pair/approve        | User JWT         |
| POST  | /api/v1/agent/auth/pair/deny           | User JWT         |
| POST  | /api/v1/agent/auth/pair/poll           | public           |
| POST  | /api/v1/agent/auth/device-code/create  | public           |
| POST  | /api/v1/agent/auth/device-code/token   | public           |
| POST  | /api/v1/agent/auth/device-code/approve | User JWT         |
| POST  | /api/v1/agent/auth/device-code/deny    | User JWT         |
| POST  | /api/v1/agent/auth/refresh             | public           |
| GET   | /api/v1/agent/devices                  | User JWT         |
| GET   | /api/v1/agent/devices/:id              | User JWT         |
| PATCH | /api/v1/agent/devices/:id              | User JWT         |
| POST  | /api/v1/agent/devices/:id/revoke       | User JWT         |
| POST  | /api/v1/agent/sessions                 | User JWT         |
| GET   | /api/v1/agent/sessions                 | User JWT         |
| POST  | /api/v1/agent/sessions/:id/heartbeat   | CompatAgentGuard |
| GET   | /api/v1/agent/commands/pending         | CompatAgentGuard |
| POST  | /api/v1/agent/commands/:id/complete    | CompatAgentGuard |
| POST  | /api/v1/agent/events                   | CompatAgentGuard |

## Prisma models (Phase A additions)

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

## References

- `docs/13-adr/adr-015-desktop-agent-auth-model.md` (design)
- `.claude/Integrations/04_desktop_agent__A_auth_replatform__0[1-4]*.md`
- `qa/test-agent-phase-a.sh`
