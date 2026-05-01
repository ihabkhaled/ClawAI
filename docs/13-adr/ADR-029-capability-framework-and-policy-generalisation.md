# ADR-029: Capability Framework + Policy Engine Generalisation

- **Status**: Accepted
- **Date**: 2026-04-26
- **Supersedes**: ADR-016 (extends; does not replace)
- **Author**: Desktop Agent Flagship working group

## Context

Phases A–D of the desktop agent ship a single capability — terminal commands — wired through `TerminalCommand` + `CommandRiskService` + `AccessPolicy` (13 default policies) + `RiskLabel` enum. The flagship initiative (`plan-prompts/clawai_desktop_agent_flagship/`) pushes the agent into 9 additional capability classes (filesystem, process, browser, screen, clipboard, notification, application, audio, system) plus recipe steps.

Without a unified abstraction we would end up with N parallel approval flows, N policy tables, N audit shapes, and N different UI cards. Customers would never understand which knobs control what; engineers would constantly reinvent.

## Decision

Introduce a single **Capability** abstraction that every later stream plugs into:

1. **New table `CapabilityInvocation`** records every approval-gated agent action across all capability classes. 12-state lifecycle: `PENDING_APPROVAL → AUTO_APPROVED → APPROVED → EXECUTING → EXECUTED | FAILED | REJECTED | EXPIRED | CANCELLED | ROLLED_BACK | ROLLBACK_FAILED | DENIED`.
2. **5 new enums**: `CapabilityClass` (11 values), `CapabilityOperation` (~70 values), `CapabilityBlastRadius` (NONE/SINGLE_RESOURCE/MANY_RESOURCES/USER_SCOPE/SYSTEM_SCOPE/EXTERNAL), `CapabilityReversibility` (REVERSIBLE/COMPENSATABLE/IRREVERSIBLE), `CapabilityInvocationStatus`.
3. **AccessPolicy extended additively** — `capabilityClass`, `capabilityOperation`, `targetMatcherJson`, `autoApproveMaxRiskScore`, `requireReason`, `isSystemDefault`. `null capabilityClass` = legacy terminal-command policy. No destructive migration.
4. **`CapabilityRiskService` supersedes `CommandRiskService`** — the existing service delegates to the generalised path internally during the dual-write window; existing terminal-command tests still pass unchanged.
5. **Dual-write window** controlled by env `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE` (default true). Every new TerminalCommand also writes a CapabilityInvocation row whose `metadata.legacyTerminalCommandId` references it. Flag flips to false after a soak period (≥ 4 weeks per stream-10 run book).
6. **`undoPlan` recorded at execute time** for COMPENSATABLE invocations so rollback can replay inverse steps; IRREVERSIBLE invocations record `metadata.noUndoReason` text.
7. **12 new RabbitMQ events** prefixed `agent.capability.*`. Audit-service auto-subscribes.

## Consequences

**Positive**
- One queue, one card UX, one audit shape, one risk service across all capability classes.
- Adding a new capability class = appending a CapabilityProvider on the CLI side + a few default policies; no schema change per class.
- Existing terminal-command pipeline keeps working unchanged for back-compat.
- Rollback / lineage / cancel / expiry sweep work uniformly for every class.

**Negative**
- Larger initial schema footprint; one mega-enum (`CapabilityOperation`) with ~70 values that must stay in sync with the prisma enum, the TS enum, and CLI provider operation files.
- Dual-write doubles row-count on terminal commands during the deprecation window (mitigated by partition-by-status indexing).

**Neutral**
- Migration path for existing terminal-command UI: extend the same approval card to display the new badges (class icon, blast-radius chip, reversibility chip) — done in Stream 32 preview-extensions stream.

## Alternatives Considered

- **Per-class tables (CapabilityInvocationFs, CapabilityInvocationProcess, …)** — rejected: leads to per-class controllers, services, audit shapes; UX fragmentation.
- **Reuse TerminalCommand directly with a generic `kind` column** — rejected: TerminalCommand schema baked in shell-specific fields (stdout/stderr/exitCode). Adding all-class fields would clutter and break existing queries.
- **Replace TerminalCommand and migrate** — rejected: destructive migration on a live table; high regression risk; existing CLI runtime depends on TerminalCommand wire shape.

## References

- Stream prompt: `plan-prompts/clawai_desktop_agent_flagship/10-stream-foundation-capability-framework-and-policy-engine.md`
- Schema: `apps/claw-agent-service/prisma/schema.prisma` (CapabilityInvocation model + enum block)
- Default policies: `apps/claw-agent-service/src/common/constants/capability-policy.constants.ts`
- TS enums: `apps/claw-agent-service/src/common/enums/capability-*.enum.ts`
- Shared events: `packages/shared-types/src/events/capability-events.types.ts`
- Pre-existing pattern: `apps/claw-agent-service/src/modules/agent/services/command-risk.service.ts`, `src/common/constants/policy.constants.ts`
- Predecessor ADR: ADR-016 (terminal-command policy engine, Phase B)
