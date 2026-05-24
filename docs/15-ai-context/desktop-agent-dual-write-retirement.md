# Desktop Agent — Terminal-Command Dual-Write Retirement Plan

> Owner: Desktop Agent V2 Stream 01 (Foundation Closeout)
> Status: Soak window — `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE=true` by default
> Added: 2026-05-24 (V2 Stream 01 closeout)

## Background

The desktop agent ships two parallel risk-assessment paths for shell
commands:

- **Legacy** — `CommandRiskService` (in `claw-agent-service`) scores the
  raw command string through heuristics + `AccessPolicy` regex matches.
  Returns `RiskAssessment`. Consumed by `AgentCommandService` to decide
  whether to mark a `TerminalCommand` row as `PENDING_APPROVAL`,
  `APPROVED` (auto), or `REJECTED` (DENY policy).
- **Capability** — `CapabilityRiskService` (Stream 10) scores a typed
  capability invocation through class-aware policies. Returns a
  `RiskAssessment` whose `status` field maps to a
  `CapabilityInvocationStatus`. Consumed by `CapabilityApprovalManager`
  for every non-terminal capability class today; it will also become
  the only authoritative path for `TERMINAL` once the retirement gate
  is met.

Both paths feed the same approval-queue UX. The legacy `TerminalCommand`
path is the source of truth for shell execution today; the capability
path runs in parallel for every shell command since Stream 10
end-to-end wiring (Round 3, 2026-05-01). The discrepancy between
the two outputs is what we are watching during the soak window.

## What "retirement" means

Retirement = flip `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE` to
`false` on every replica and delete the legacy `TerminalCommand` schema
in the same release. After retirement:

- `AgentCommandService` is removed; shell commands flow exclusively
  through `CapabilityApprovalManager.propose(...)` with
  `capabilityClass=TERMINAL, capabilityOperation=SPAWN`.
- The `agent.commands.*` REST endpoints are removed (legacy CLI clients
  must upgrade to a release that supports the capability flow).
- The `TerminalCommand`, `CommandChunk`, and related Prisma tables are
  dropped via migration after one full release cycle of `flag=false`
  in production.

## The retirement gate

Operators MUST observe ALL of these BEFORE flipping the flag:

1. **`retirementReady=true`** on every running replica, returned by
   `GET /api/v1/agent/capability/dual-write-status`. The flag becomes
   true only when:
   - the soak flag is currently on (so we are actually comparing), AND
   - total decisions observed since process start ≥ **500**, AND
   - divergent decisions = **0** since process start.
2. **Seven consecutive days** of `retirementReady=true` on every replica.
   Restarts reset the counter; that is intentional — a deploy is a fresh
   window, and any policy change that re-introduces divergence will
   show up immediately after the restart.
3. **Zero `[dual-write]` WARN log lines** in the
   `claw-server-logs-service` Mongo collection for the last 7 days. Run:
   ```js
   db.server_logs.countDocuments({
     serviceName: 'claw-agent-service',
     message: { $regex: /\[dual-write\]/ },
     level: 'warn',
     timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
   })
   ```
4. **Two of every shell-related QA script** pass in a fresh stack-rebuild
   environment:
   - `qa/test-agent-service.sh`
   - `qa/test-foundation-closeout.sh` (V2 Stream 01)
   - `qa/test-stream-10-capability-framework.sh`

## How to flip the flag

Once the gate is met:

1. Update `.env` (production + staging) → `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE=false`.
2. Restart `claw-agent-service` only (do not rebuild). On boot it logs:
   ```
   [deprecation] CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE=false — legacy dual-write retired; capability framework is authoritative.
   ```
3. Verify the legacy `/agent/commands/*` endpoints still respond for one
   release (we are NOT deleting them yet — we are only retiring the
   dual-write side effect). The legacy path remains the shell-execution
   source of truth until the next major-version release.

## Rollback procedure

If after flipping to `false` you observe:

- spike in `agent.policy_violated` events that were not present before,
- end-user reports of "auto-approved commands suddenly require approval"
  (or vice versa),
- internal CLI consumers failing on the capability shape,

then:

1. Set the env back: `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE=true`.
2. Restart `claw-agent-service` (no rebuild).
3. Watch the new divergence stream — the rollback restored the prior
   sampling, so within minutes you should see why the post-flip state
   diverged.
4. File a follow-up ticket against the offending policy or risk-weight
   constant. Do NOT re-attempt the flip until the root cause is fixed
   and another 7-day soak window passes clean.

## Long-term: removing the legacy code

Track in `docs/14-risk-debt/technical-debt.md` under "Desktop Agent
foundation". The schedule is roughly:

| Stage             | When                                                               | What                                                                                                              |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Soak              | now → retirement gate                                              | flag default-on, divergence-watched                                                                               |
| Retirement        | gate met + 7 days clean                                            | flip to false, log deprecation, keep legacy code paths intact                                                     |
| Soft-removal      | next minor release after retirement                                | `AgentCommandService.createCommand` returns 410 Gone if `flag=false` AND `CAPABILITY_ENFORCE_RETIREMENT=true`     |
| Hard-removal      | following major release                                            | delete `TerminalCommand` Prisma model + migration, delete `AgentCommandController`, delete `command-stream`, etc. |
| CLI client update | both before retirement (notice) and after hard-removal (fail-fast) | `claw-agent` CLI uses capability-runner exclusively from v0.10                                                    |

## See also

- `apps/claw-agent-service/src/modules/agent/services/capability-dual-write-metrics.service.ts` — the metrics counter
- `apps/claw-agent-service/src/modules/agent/services/command-risk.service.ts` — the dual-write call site
- `apps/claw-agent-service/src/common/constants/capability.constants.ts` — `DUAL_WRITE_MIN_DECISIONS_BEFORE_RETIREMENT` (500) and ring size (50)
- `docs/15-ai-context/desktop-agent-flagship-implementation-progress.md` — overall flagship status
- `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/01_foundation_closeout_and_dual_write_retirement.md` — the V2 stream prompt
