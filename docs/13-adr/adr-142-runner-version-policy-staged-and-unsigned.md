# ADR-142: The runner version policy is staged, fail-open and unsigned

- Status: Accepted (staged; enforcement is opt-in, attestation is not built)
- Date: 2026-10-01

## Context

F100 step 1 let a self-hosted runner report `{ agentVersion, platform }` at heartbeat and
recorded it. The owner then decided (2026-10-01): yes to an organization policy for allowed
runner versions, but only staged. The signing-key decision (what would make a report
trustworthy) is still open, so nothing may depend on a trust anchor, and a policy that can lock
a fleet out must be off until an administrator turns it on.

## Decision

Three additive pieces, all inert by default.

- **Policy fields** on `organization_policies`: `minRunnerVersion` (semver, a leading `v` is fine),
  `allowedRunnerPlatforms` (normalized names such as `linux`, `windows`, `darwin`; an empty list
  is refused on write, `null` means no opinion), `runnerPolicyMode` (`off` default | `report` |
  `enforce`), `requireVersionReport` (boolean, default false). Written through the existing
  `PUT agent/organizations/:id/policy` (owner/admin only, like every policy edit) and read by
  any member at `GET agent/organizations/:id/runner-policy`. They are NOT part of
  `policy/effective`: the extension parses that payload with a strict schema, so an extra key
  would break every member's client.
- **A verdict** per runner report: `compliant`, `noncompliant`, `unknown`, or none. It is stored on
  the session (`runnerCompliance`, `runnerComplianceReason`, comma-separated codes
  `version_below_minimum`, `version_unreadable`, `version_missing`, `platform_not_allowed`,
  `platform_missing`) and shown as `compliance` on `GET agent/runners` (owner-scoped).
- **Behaviour per mode**:
  - `off`: nothing is evaluated, flagged, audited or refused. A flag from an earlier mode is cleared.
  - `report`: the heartbeat is recorded, flagged, audited and NEVER rejected.
  - `enforce`: `POST agent/runners/heartbeat` and `POST agent/runners` (registration) answer
    403 `RUNNER_POLICY_VIOLATION` only when the policy sets at least one constraint AND the
    report definitely violates it. A runner that reports nothing (or a version that cannot be
    parsed) is `unknown` and is let through, unless `requireVersionReport` is set. A refused
    heartbeat records the report and the reason but does not move the heartbeat or revive the
    runner, so it goes stale and claims nothing. A refused registration creates no session.

Judging: each organization the owner belongs to is judged on its own terms and the worst verdict
wins, so a permissive `off` organization never softens a strict `enforce` one. This is the same
"never weaker than the strictest" outcome as the intersection used for the other policy fields,
reached per organization because the mode belongs to the organization that set the constraint.

**Fail open on purpose.** A malformed field is dropped (it constrains nothing), an unknown mode
reads as `off`, and any error reading policies lets the runner through and leaves its stored
verdict alone. The other guardrails fail closed (a policy that cannot be read refuses every
effect); this one does not, because the cost of a wrong answer here is a fleet that cannot
connect, and the signal is self-reported anyway.

**Audit entry.** This service has no audit table, so the entry is a structured warn log line
`runner.policy.verdict` (runner id, owner id, status, reason codes, refused, reported version and
platform), written once per change of verdict rather than once per heartbeat. A durable audit
table is a separate decision.

## What this is not

The report is self-reported and unsigned. It detects stale or misconfigured runners; it does not
prove identity, and a hostile runner can claim any version. Do not describe `enforce` as a
security control. Attestation (a signed version and platform claim verified against a trust
anchor, an update channel that publishes the signed manifest) waits for the signing-key
decision and is deliberately not implemented. When that decision lands, the signed claim
replaces the self-reported inputs to the same evaluator; the modes, fields and verdict stay.

## Consequences

- Migration `20261001120000_add_runner_policy` is additive and idempotent (`IF NOT EXISTS`); every
  existing organization and runner is unaffected (`off`, `NULL`).
- A `PUT` replaces the whole policy, so a client that does not send the runner fields resets
  them to inert. That fails toward "no lock-out".
- Across organizations with disjoint platform lists the verdict can be unsatisfiable. That is the
  honest result of two organizations disagreeing and is only refused under `enforce`.
- Rollback: set `runnerPolicyMode` to `off`; no data change needed.
