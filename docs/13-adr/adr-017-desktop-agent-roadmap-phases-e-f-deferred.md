# ADR-017 — Desktop Agent Roadmap: Phases E + F Deferred

Status: Accepted (roadmap)
Date: 2026-04-21
Relates to: ADR-015 (auth), ADR-016 (policy engine)

## Context

The desktop-agent replatform was scoped across 6 phases in the master plan:
A (auth), B (trust & safety), C (streaming), D (power features), E (enterprise),
F (exploratory). Phases A–D are shipped. Phases E and F intentionally ship as
deferred scope.

This ADR locks what ships now, what ships later, and what changes to the
working code base are already in place to make future delivery additive.

## Decision

### Phase E — Enterprise polish: deferred

Scope that remains deferred:

- **Team / org-scoped device fleet page.** The `Device` model already has an
  `orgId` column (nullable) added in Phase A so the migration path is purely
  additive. An admin page at `/admin/devices` with filtering, bulk-revoke,
  and org-wide audit export is the delivery.
- **Admin-on-behalf approval.** Admins approving a teammate's pending command
  with dual-actor audit trail (`actorUserId` + `approvedOnBehalfOfUserId`).
- **Forced agent version floor.** Server rejects heartbeats from agents older
  than a configurable minimum. Needs an `AdminSetting` table or a new config
  column on the existing settings surface.
- **Debug bundle collection.** `claw-agent doctor --bundle` produces a
  redacted ZIP (logs, versions, keychain presence) that support can request
  from a user without exposing secrets. The `doctor` command is already
  there; the bundle writer is the missing piece.
- **Org-wide policy inheritance.** `AccessPolicy.orgId` is already nullable
  so admin-authored policies can be stored there, inherited by all devices
  in the org; UI for this lands in Phase E.

### Phase F — Exploratory: deferred and gated on security review

Scope that remains deferred:

- **Browser automation (`browser:control` scope).** A Playwright sidecar
  running under the CLI with a narrow API (`open`, `screenshot`, `fill`,
  `click-by-selector`). Scope is in the enum (Phase D) but no endpoint yet.
- **Reverse tunnel for dev servers.** Expose a local `localhost:3000` to
  the webapp through a secure WebSocket. High security bar; needs a
  threat model and rate limits before any design doc.
- **Repo indexer.** A new `file-index-service` that ingests metadata
  from tracked local repos so research/chat can search by file/symbol
  without uploading contents. Out-of-scope for agent-service.
- **Clipboard bridge (`clipboard:read`, `clipboard:write`).** Scope is in
  the enum but no CLI or endpoint yet.

### Work already done that unblocks E + F

- `orgId` column on `Device` and `AccessPolicy` — team routing ready.
- Expanded `DeviceScope` enum with `fs:read`, `fs:write`, `shell:exec-in-repo`,
  `scripts:execute`, `schedule:write`, `repos:write`, `clipboard:read`,
  `clipboard:write`, `browser:control` — endpoints can be added without
  another migration.
- `ScopeGuard` + `@RequireScopes()` — every new endpoint is gate-ready.
- `ScheduledCommand` model + `SchedulerManager` — automation foundation
  shipped in Phase D.
- `CommandStreamService` + SSE endpoint — streaming surface usable by any
  future command kind, not just shell.

## Consequences

- Phases A–D deliver a functional, secure, streaming, policy-gated desktop
  agent that a senior-engineer persona can use productively today
  (pair → approve → run commands with auto-approve / DENY / risk score;
  CLI streams output live; user can cancel running commands;
  scheduled commands fire on cron-like intervals).
- Phase E / F scope is locked: every item has a home in the existing
  schema, enum, or module. No future breaking migrations for those
  capabilities.
- A single future ADR per Phase E / F feature will document the endpoint,
  UI, and security review at the time of delivery.

## References

- Master plan: `C:\\Users\\Ihab\\.claude\\plans\\melodic-leaping-donut.md`
- ADR-015 (auth replatform)
- ADR-016 (policy engine)
