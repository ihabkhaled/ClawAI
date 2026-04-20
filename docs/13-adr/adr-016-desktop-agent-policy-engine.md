# ADR-016 — Desktop Agent Policy Engine & Risk Scoring

Status: Accepted (Phase B shipped)
Date: 2026-04-21
Supersedes: nothing
Superseded by: nothing

## Context

Phase A (ADR-015) replaced copy-paste JWT auth with durable device tokens and
added basic scopes (`sessions:read`, `shell:exec`) to the consent screen.
Phase B extends that floor with actual enforcement and a safety layer so a
paired device cannot silently run destructive commands.

Two things were missing at end of Phase A:

1. **No scope enforcement at the runtime endpoints.** `heartbeat`,
   `commands/pending`, `commands/:id/complete`, and `events` only checked that
   a sessionKey/device token was present; they did not verify the token
   carried the required scope.
2. **No risk reasoning on commands.** Every proposed command went to the user
   for manual approval with no risk signal — no way to auto-approve trivial
   read-only commands, no hard block for known-dangerous patterns, no user-
   visible risk score.

## Decision

Phase B introduces an `AccessPolicy` engine plus a `CommandRiskService` and
wires scope enforcement on the runtime endpoints.

1. **`AccessPolicy` table.** Stores `{ name, kind, pattern, riskScore,
riskLabel, priority, isActive, orgId }`. `kind` is one of `ALLOW`, `DENY`,
   `AUTO_APPROVE`. `pattern` is a regex. Seeded at service startup with 13
   default policies covering the obvious dangers (`rm -rf /`, fork bombs,
   `dd of=/dev/…`, `curl … | sh`, `shutdown`, world-writable chmods), the
   obvious flag-for-review cases (`git push --force`, `DROP TABLE`, `sudo …`),
   and safe auto-approve cases (`git status`, `ls`, `pwd`, version probes).
2. **`CommandRiskService`.** Runs on every `createCommand` call:
   - Starts with a heuristic base score (shell-chain, privileged-path write,
     long command, negative flag).
   - Iterates active policies in `priority desc`; the first DENY wins and
     stops evaluation; otherwise keeps the highest-priority ALLOW/AUTO_APPROVE
     match.
   - Produces a `RiskAssessment`: `riskScore`, `riskLabel`, matched policy,
     `blockedByPolicy`, `autoApproved`, list of human-readable reasons.
3. **Three-way command creation outcome.**
   - DENY → command stored with `status=REJECTED`, `blockedByPolicy=true`,
     `rejectionReason`, and an `agent.policy_violated` event published.
   - AUTO_APPROVE → `status=APPROVED` with `approvedAt=now`, `autoApproved=true`,
     and an `agent.command_approved` event published (`autoApproved: true` in
     payload).
   - Otherwise → `status=PENDING_APPROVAL` (user must approve) with the risk
     score/label persisted so the UI can render a badge.
4. **Scope enforcement.** `ScopeGuard` reads `@RequireScopes(…)` metadata and
   compares it against `request.deviceContext.scopes`. Applied to
   `/commands/pending` and `/commands/:id/complete` (require `shell:exec`).
   `/sessions/attach` requires `sessions:read`. When the legacy sessionKey
   path is used (no deviceContext), the guard passes through — Phase A's
   compatibility-window promise.
5. **`POST /sessions/attach`.** New endpoint; accepts a device access token
   (not user JWT); creates an `AgentSession` bound to `deviceId`. The CLI
   uses this at the start of its runtime loop so heartbeat / pending / complete
   / events all work through device tokens.
6. **CompatAgentGuard bridge.** After a successful device-token auth, if the
   request carries a sessionId (query `?sessionId=`, body `sessionId`, or
   path `:id` on `/sessions/:id/…`), the guard synthesizes
   `request.agentSession = { sessionId, userId }` so the existing
   session-scoped controllers and the `@AgentSession()` decorator keep
   working unchanged.
7. **Frontend risk surface.** `/agent` pending-commands list renders a
   `RiskBadge` (LOW/MEDIUM/HIGH/CRITICAL with numeric score) and shows the
   `riskReasons` under each pending command.

## Alternatives considered

- **Ad-hoc deny-list hard-coded in code.** Faster to ship but impossible to
  tune per-org, no priority, no audit of which policy matched. Rejected.
- **Separate "Policy" microservice.** Overkill for Phase B; the engine is
  purely read-heavy regex matching against a small table. Co-locating in
  agent-service keeps latency low and avoids another network hop.
- **LLM-driven risk scoring.** Considered for later (Phase D+); the Phase B
  heuristic + regex approach is deterministic, fast, and auditable.
- **Session-bound runtime without `attach`.** Discussed making runtime
  endpoints directly accept device tokens without a session. Session
  semantics are still useful for the legacy path and for heartbeat bookkeeping
  — kept them but bridged via the guard.

## Security considerations

- **Regex from DB.** The policy engine compiles regex strings from the
  `access_policies` table at request time. ESLint's
  `security/detect-non-literal-regexp` flags this. The mitigation:
  - Only admins (user JWT with admin role) can write policies once the
    CRUD surface is exposed (Phase E admin UI).
  - Default seeds are code-controlled.
  - Compilation is wrapped in try/catch — an invalid regex is logged and
    skipped, never throws.
  - ReDoS risk is bounded by the agent-service throttler (100 req/min)
    and because the input to `.test()` is a user-bounded command string
    (≤ ~4 KB).
- **DENY bypass via legacy path.** ScopeGuard passes through when no
  deviceContext is present (legacy sessionKey flow). That means a legacy CLI
  is still bound by the original sessionKey check but not by scopes. This is
  acceptable during the compatibility window (Sunset 2026-07-01) because the
  legacy flow predates scopes entirely.
- **Auto-approve risk.** `AUTO_APPROVE` policies are priority-ordered below
  `DENY`; a DENY match always wins. Auto-approve patterns are anchored
  (`^…$`) and narrow (ls, pwd, git status, version probes only).

## Consequences

- Users get immediate hard-stop for `rm -rf /` (and 5 other critical patterns)
  without needing admin intervention.
- Trivial read-only commands flow without a click, materially reducing
  approval friction for everyday usage.
- High-risk commands stay pending-approval but carry a visible risk badge so
  the approver knows what they're blessing.
- The CLI can finally run its runtime loop entirely on device tokens —
  `login → start` now works end-to-end under Phase A auth + Phase B scopes.
- New events (`agent.policy_violated`) feed audit-service; every DENY is
  traceable.
- Admin-authored policies (future Phase E) must be written carefully — the
  ReDoS note above should be highlighted in the admin docs when that UI ships.

## References

- Master plan: `C:\\Users\\Ihab\\.claude\\plans\\melodic-leaping-donut.md`
- ADR-015 (auth replatform)
- QA script: `qa/test-agent-phase-b.sh`
- Default policies catalog:
  `apps/claw-agent-service/src/common/constants/policy.constants.ts`
