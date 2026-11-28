# 11 — Execution controls, audit and final delivery

For every phase maintain requirement-to-evidence ledger, with columns: ID, requirement, source, risk, owner, repository, baseline status, implementation path, test IDs, evidence reference, result, residual risk, next action. Use exact source paths, line ranges, commit SHA, command (redacted), environment, timestamp, exit code and artifact path; avoid sensitive data. Record assumptions as assumptions, not facts. Track old tasks separately; no lost or silently closed backlog. Review all requirements at every milestone, not every minor step. Independent reviewer challenges root cause, overengineering, missing cases, scope and authorization; resolve critical findings with evidence and keep dissent. Plans must be implementable with named dependencies, migration strategy and rollback. Prefer existing architecture if suitable; justify new infrastructure, cost and maintenance burden. Do not create dozens of parallel abandoned subsystems or duplicate tools.

## Mandatory checkpoints

M0: both repos confirmed, local/remote baseline and open work reconciled; current test failures captured. M1: threat model and policy boundary reviewed; abuse/security unit/contract tests pass, no release authority in telemetry path. M2: harness/stream/tool/recovery acceptance proven, cross-platform limitations documented. M3: single/dual/triple-mode compatibility and quality/cost data; opt-in and budgets tested. M4: shadow telemetry with privacy, ingestion auth, redaction, dedup, flood and failure tests; no direct execution from untrusted input. M5: sandbox reproduction/repair/draft PR and independent review tested end-to-end. M6: staging and signed prerelease with approval, health and rollback verified. M7: release only if policy, security, CI, performance, documentation and operator readiness are verified. Every milestone uses measurable gates, not arbitrary confidence percentages. Report inability to perform real deployment or tests as BLOCKED, not complete.

## Output format after each work session

1. Completed work and repository/branch/commit references. 2. Evidence: actual tests, scans, benchmark deltas, screenshots/traces, CI status, remaining failures. 3. Security and privacy changes plus residual risks. 4. Decisions/assumptions, unresolved competitor gaps, limitations and independent approvals needed. 5. Next resumable task with precise prerequisites. Keep progress succinct during execution; final report must cover all requirements. If hard-blocked on external auth or approval, continue independent local work and preserve checkpoint. Never execute unauthorized push, deploy or release to satisfy a task status. Stop when verified gates met and scope delivered; do not run unnecessary repeated audits.

## Completion checklist

- Existing tasks resolved or individually tracked with blockers; no destructive overwrite.
- Evidence-backed parity matrix and real benchmark; no fictional reverse engineering.
- Durable agent lifecycle, full registry, context and rules/skills/memory, safe shell/Git/SSH/browser/API, bounded recovery and no early stream termination.
- Optional primary + two advisers across analysis, architecture, implementation, testing, review, with consent, budget and deterministic adjudication.
- Secure diagnostic channel with minimal data, proof-of-possession where supported, server-auth correlation, abuse controls, no direct execution, independent policy.
- Wolverine isolated worker with incident grouping, reproduction, root cause, patch, tests, draft PR, controlled release, update notifications, monitoring and rollback.
- Security tests, performance/soak, real local UI and API validation, authorized staging tests, exact CI results, known gaps documented.
- User and operator docs, migration, feature flags, kill switches, release signing/provenance and independent human approval for high-risk changes.
