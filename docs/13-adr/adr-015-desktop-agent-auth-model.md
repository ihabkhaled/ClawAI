# ADR-015 — Desktop Agent Authentication Model

Status: Accepted (Phase A shipped)
Date: 2026-04-21
Supersedes: nothing (greenfield)
Superseded by: nothing

## Context

The legacy desktop-agent flow required the user to copy a short-lived webapp JWT into
`claw-agent register --key <jwt>`. The returned `sessionKey` was stored plaintext at
`~/.claw-agent/config.json`, had no expiry, no revocation, no refresh path. Any 120 s
heartbeat gap (laptop sleep, VPN hiccup) marked the `AgentSession` `EXPIRED` and forced
a fresh copy-paste. There was no "Connect CLI" UX in the webapp, no device model, no
per-device audit, and no scope system.

See the master audit at
`.claude/Integrations/04_desktop_agent__01_full_audit_and_power_expansion_report.md`
and the GOD-mode prompt pack at
`plan-prompts/agent_god_mode_prompt_pack/` for the full background.

## Decision

Phase A of the desktop-agent replatform introduces a durable, OAuth-inspired authentication
model for the agent surface.

1. **Primary flow — Magic-link device pairing.** The CLI opens a browser-based consent
   screen on the webapp. The user approves the device once. The server issues an
   access-token + refresh-token pair. The CLI stores the refresh token in an
   OS-isolated encrypted file (keychain adapter lands in Phase B).
2. **Fallback flow — RFC 8628 device code.** For SSH sessions, CI jobs, VMs, and
   locked-down VDIs without a browser. The CLI prints a short `user_code` (e.g.,
   `AB12-CD34`), the user approves on any device, the CLI polls for tokens.
3. **Durability — Rotating refresh with reuse detection.** Every refresh issues a new
   refresh token and marks the old one `USED`. If a `USED` token is replayed, the
   device is revoked atomically (refresh tokens marked `REVOKED`, device `REVOKED`,
   `agent.token.reuse_detected` audit event). The legitimate grace window is 15 s.
4. **Scopes.** Phase A ships `sessions:read` and `shell:exec`. The enum is designed
   for future growth (Phase B: `fs:read/write`, `scripts:execute`, `schedule:write`,
   `repos:write`, `clipboard:*`; Phase F: `browser:control`).
5. **Revocation cache.** Redis key `agent:revocation:device:<id>` makes revocation
   effective within the access-token TTL (15 min) — hitting any endpoint short-circuits
   before the JWT verify.
6. **Compatibility window.** Legacy `sessionKey` authentication continues to work via
   `CompatAgentGuard`. Every legacy response carries `Deprecation: true` and
   `Sunset: 2026-07-01` headers. The explicit `drop_session_key` migration ships at
   the start of Phase B, gated on 14 consecutive days of zero legacy traffic.

## Alternatives considered

- **Loopback PKCE (RFC 8252).** Fast but requires a port bind and fails on SSH. We
  keep the loopback-listener pattern inside the magic-link flow (post-approval redirect
  to `127.0.0.1:<random-port>` in the CLI's listener) but do not require the full PKCE
  dance — the pairing code + state nonce provide sufficient CSRF defence for this scope.
- **Custom URL scheme (`claw-agent://`).** Requires per-OS registration, brittle on
  corporate-managed fleets. Skipped.
- **QR-pairing.** Overkill for a CLI tool; considered for the future mobile companion.
- **Persistent API key.** Zero refresh, zero rotation; exactly the legacy pain we're
  eliminating.

## Consequences

- **Users** never copy tokens again; laptop sleep is survivable; revocation is a click
  on `/settings/devices`.
- **Operators** get a tamper-evident trail: `agent.device.paired`, `agent.device.revoked`,
  `agent.token.rotated`, `agent.token.reuse_detected`.
- **Security** gains: refresh tokens stored only as `sha256(token + JWT_SECRET)`, access
  tokens never hit disk, revocation cache blocks compromised tokens within seconds.
- **Costs:** Phase A introduces 4 new Prisma tables, 4 new RabbitMQ event patterns,
  6 new endpoints under `/api/v1/agent/auth/*`, 4 under `/api/v1/agent/devices/*`,
  5 new env vars, and 2 new frontend surfaces (`/agent/connect`, `/settings/devices`).
  Support load on the new flow is expected to be less than on the legacy one —
  instrumented via the `time-to-first-heartbeat` KPI (target <60 s p95).
- **Open items** (resolved in Phase B / later): OS keychain primary (vs encrypted-file
  fallback) via `@napi-rs/keyring`; runtime endpoints (heartbeat / commands /pending /
  events) migrated off `AgentSession.sessionKey` onto device access tokens; full scope
  enforcement and policy engine; streaming terminal with SSE; org-scoped device fleet
  admin.

## References

- Master plan: `C:\\Users\\Ihab\\.claude\\plans\\melodic-leaping-donut.md`
- Integrations series: `.claude/Integrations/04_desktop_agent__A_auth_replatform__0[1-4]*.md`
- QA script: `qa/test-agent-phase-a.sh`
- RFC 8628 (Device Authorization Grant)
- Auth0 Refresh-Token Rotation guidance
