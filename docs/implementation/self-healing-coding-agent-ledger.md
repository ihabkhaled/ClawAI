# Requirement ledger: coding agent program

Companion to [self-healing-coding-agent-plan.md](self-healing-coding-agent-plan.md). One row per
requirement. Status is one of PLANNED, IN_PROGRESS, VERIFIED, PARTIAL, BLOCKED, DEFERRED. A row
is VERIFIED only with an evidence reference (commit, test id, QA record, CI run). Source codes:
**O** owner brief 2026-11-28, **P-nn** pack workstream nn
([wolverine-master-prompt/](wolverine-master-prompt/README.md)), **R** competitor research.

Updated: 2026-11-28 (all rows PLANNED except where noted).

## Pillar 0: knowledge layer (extension repository)

| ID   | Requirement                                                                                                                       | Source | Batch | Status  | Evidence |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------- | -------- |
| K-01 | Akinator vendored into the extension (`skills/akinator/`, license, read-only tools)                                               | O      | K1    | PLANNED |          |
| K-02 | Always on without a command: `CLAUDE.md`, `AGENTS.md`, `CODEX.md`, Cursor rules, project skill pointer, an extension rule and ADR | O      | K1    | PLANNED |          |
| K-03 | In-repo `wiki/` published to the GitHub wiki by a workflow                                                                        | O      | K2    | PLANNED |          |
| K-04 | GitHub wiki repository exists (first page created)                                                                                | O      | K2    | PLANNED |          |
| K-05 | One page per feature area: business why, product why, technical how, decisions, before and after with dates, tests and results    | O      | K3    | PLANNED |          |
| K-06 | Extension `context/` (module map, station map, task router) and `memory/` (lessons)                                               | O      | K3    | PLANNED |          |
| K-07 | README links the wiki and the knowledge layer                                                                                     | O      | K2    | PLANNED |          |
| K-08 | Repeated procedures become skills                                                                                                 | O      | every | PLANNED |          |
| K-09 | Shipped as one extension release                                                                                                  | O      | K3    | PLANNED |          |

## Pillar 1: harness, tools, recovery

| ID   | Requirement                                                                                                         | Source     | Batch | Status  | Evidence |
| ---- | ------------------------------------------------------------------------------------------------------------------- | ---------- | ----- | ------- | -------- |
| H-01 | Run state machine with legal transitions, durable ids, sequence, heartbeats, checkpoints                            | P-02       | B2    | PLANNED |          |
| H-02 | Reasoning or status text never ends a run                                                                           | O, P-02    | B2    | PLANNED |          |
| H-03 | Resume from last acknowledged sequence; uncertain side effects reconciled, never repeated                           | P-02       | B2    | PLANNED |          |
| H-04 | Bounded recovery ladder with strategy change, budgets, no-progress detection, circuit breakers                      | O, P-02    | B2    | PLANNED |          |
| H-05 | Tool registry fields: side-effect class, idempotency, timeout, quota, redaction, provenance, audit                  | P-02       | B2    | PLANNED |          |
| H-06 | Decision receipts issued outside the model, bound to action, scope, TTL, artifact hash                              | P-02, P-08 | B2    | PLANNED |          |
| H-07 | Context engine: instruction discovery that cannot loosen policy; symbol/dependency maps; incremental index          | P-02       | B3+   | PLANNED |          |
| T-01 | Browser device matrix (phones, tablets, both orientations, laptop/desktop sizes, zoom, DPR, touch, RTL, dark/light) | O, P-04    | B3    | PLANNED |          |
| T-02 | Browser engines: Chromium/Chrome/Edge, Firefox, WebKit                                                              | O, P-04    | B3    | PLANNED |          |
| T-03 | Browser SSRF policy on navigation, redirects, WebSocket, downloads, subresources                                    | P-04       | B3    | PLANNED |          |
| T-04 | GitHub: workflow runs, re-run, job logs by run, deployments, issues, releases                                       | O, P-03    | B3    | PLANNED |          |
| T-05 | CI watch-and-fix on a PR with bounded retries, exact-SHA verification                                               | O, P-03, R | B3    | PLANNED |          |
| T-06 | Event-triggered PR review with verified findings                                                                    | R          | B3    | PLANNED |          |
| T-07 | OpenAPI / Postman import and contract-test runner                                                                   | O, P-04    | B3    | PLANNED |          |
| T-08 | Hidden-content stripping for issue, PR, page and log text                                                           | R, P-08    | B3    | PLANNED |          |
| T-09 | Read-only SSH tool: host inventory, pinned host keys, no forwarding, approved mutations only                        | O, P-03    | B3    | PLANNED |          |
| T-10 | File-defined sub-agents (tools allowlist, model, isolation)                                                         | R          | B3    | PLANNED |          |
| T-11 | Optional classifier auto mode that fails closed                                                                     | R          | B3    | PLANNED |          |
| T-12 | Git/GitHub flow fixes hook, push and CI failures by root cause; never bypasses                                      | O, P-03    | B2-B3 | PLANNED |          |

## Pillar 2: model team

| ID   | Requirement                                                                                       | Source  | Batch | Status  | Evidence |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----- | ------- | -------- |
| M-01 | Primary plus 0-2 advisers from the runtime catalog, off by default                                | O, P-05 | B6    | PLANNED |          |
| M-02 | Cost shown before enabling; hard ceiling; atomic reserve and reconcile; per-adviser receipt lines | O, P-05 | B6    | PLANNED |          |
| M-03 | Advisers read-only by default; patches only in separate worktrees; primary integrates             | P-05    | B6    | PLANNED |          |
| M-04 | Structured findings schema; primary accepts/rejects/defers with reason; decision ledger           | O, P-05 | B6    | PLANNED |          |
| M-05 | Capped rounds, time and tokens; no open-ended debate                                              | P-05    | B6    | PLANNED |          |
| M-06 | Orchestrator controls what crosses providers; secrets stripped; per-provider consent              | P-05    | B6    | PLANNED |          |
| M-07 | Evaluation: primary vs +1 vs +2 on identical tasks; ship per task class on measured benefit       | P-05    | B6    | PLANNED |          |

## Pillar 3: Wolverine

| ID   | Requirement                                                                                                                     | Source        | Batch | Status  | Evidence |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----- | ------- | -------- |
| W-01 | Capture failures, stalls, exhausted ladders, schema-invalid tool calls, gate-disproved "done" claims; successes as denominators | O, P-06       | B5    | PLANNED |          |
| W-02 | Opt-in consent in 12 locales; user can view and delete what was sent                                                            | O, P-06       | B5    | PLANNED |          |
| W-03 | Local redaction plus server-side redaction with structured allowlists                                                           | O, P-06       | B4-B5 | PLANNED |          |
| W-04 | Versioned event contract (plan §7); untrusted fields never treated as authority                                                 | P-06          | B4    | PLANNED |          |
| W-05 | Durable queue with DLQ, TTL, lag monitor; request handler never starts work                                                     | P-06          | B4    | PLANNED |          |
| W-06 | Fingerprint dedup and grouping; cross-tenant grouping only after sanitisation                                                   | P-06          | B4    | PLANNED |          |
| W-07 | Retention schedule with purge of derived stores                                                                                 | P-06          | B4    | PLANNED |          |
| W-08 | Healer on a separate VM with leases, budgets, kill switch, restart reconciliation                                               | O, P-07       | B7    | PLANNED |          |
| W-09 | Incident state machine with evidence-backed guards (plan §8)                                                                    | P-07          | B7    | PLANNED |          |
| W-10 | Reproduction generated from code and typed fields, never from log text; minimal failing test first                              | P-07          | B8    | PLANNED |          |
| W-11 | Disposable worktree and container per job; no secrets, no socket, minimal egress                                                | P-07          | B8    | PLANNED |          |
| W-12 | Draft PRs via a broker; healer cannot approve or merge; cannot edit policy, CI, hooks or its own admission                      | O, P-07       | B8    | PLANNED |          |
| W-13 | Pilot stages A-E with gates (plan §10); stage E only on owner approval of named change classes                                  | O, P-07, P-10 | B7-B9 | PLANNED |          |
| W-14 | Generic update notice to affected users after the release is verified                                                           | O, P-10       | B9    | PLANNED |          |
| W-15 | Healer's own telemetry never starts another healer job                                                                          | P-07          | B7    | PLANNED |          |

## Security

| ID   | Requirement                                                                                                 | Source        | Batch  | Status  | Evidence                                                                                                                                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------- | ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-01 | Threat model (STRIDE, OWASP LLM/agentic/API, data-flow diagram) reviewed before intake code                 | O, P-08       | B1     | PARTIAL | Drafted 2026-11-28: `docs/03-architecture/agent-incident-threat-model.md` (97 threats), ADR-229, `docs/16-quality-engineering/wolverine-adversarial-suite-catalog.md` (243 cases); owner review of invariants pending |
| S-02 | Per-installation key, proof-of-possession signatures, nonce replay cache, skew window, rotation, revocation | O, P-06       | B4     | PLANNED |                                                                                                                                                                                                                       |
| S-03 | Rate limits per IP/account/tenant/installation/key/global, fail closed; byte, batch, depth caps             | O, P-06       | B4     | PLANNED |                                                                                                                                                                                                                       |
| S-04 | Strict schemas; `$`-keys refused; parameterised access only; payloads never evaluated                       | O, P-06, P-08 | B4     | PLANNED |                                                                                                                                                                                                                       |
| S-05 | Report text only inside the untrusted fence; action-requesting reports quarantined                          | O, P-08       | B7     | PLANNED |                                                                                                                                                                                                                       |
| S-06 | Adversarial suite (plan §6.3) on every change to intake, healer or release code                             | O, P-08       | B1+    | PLANNED |                                                                                                                                                                                                                       |
| S-07 | Kill switches for uploads, ingest, triage, jobs, PRs, release, model team; OFF states tested                | P-06, P-10    | B1+    | PLANNED |                                                                                                                                                                                                                       |
| S-08 | High-risk change classes always need the owner (plan §6.2 item 7)                                           | O, P-10       | B8-B9  | PLANNED |                                                                                                                                                                                                                       |
| S-09 | No universal secret in the VSIX; no model reaches signing or Marketplace credentials                        | P-06, P-10    | B4, B9 | PLANNED |                                                                                                                                                                                                                       |

## Release and quality

| ID   | Requirement                                                                              | Source     | Batch | Status  | Evidence |
| ---- | ---------------------------------------------------------------------------------------- | ---------- | ----- | ------- | -------- |
| R-01 | Release controller checks (plan §10) before any publication                              | P-10       | B9    | PLANNED |          |
| R-02 | Artifact provenance and hash; actions pinned to SHAs; SBOM                               | P-10       | B9    | PLANNED |          |
| R-03 | Rollback rehearsed before stage E; regression spike pauses automation                    | O, P-10    | B9    | PLANNED |          |
| Q-01 | Baseline single-model benchmark before any quality claim                                 | P-01, P-09 | B0    | PLANNED |          |
| Q-02 | 6-hour session scenario with faults, reload and resume                                   | P-09       | B2    | PLANNED |          |
| Q-03 | Full Wolverine loop on a seeded benign defect, with replay, flood and injection variants | P-09       | B8    | PLANNED |          |
| Q-04 | Telemetry adds ≤ 5 % p95 latency to core APIs (target to calibrate)                      | P-09       | B4    | PLANNED |          |
| Q-05 | Distinct cases and repeated runs counted separately; no claimed run without a record     | O, P-09    | every | PLANNED |          |

## Security incident 2026-11-28 (fake key flagged)

| ID   | Requirement                                                      | Source | Batch | Status   | Evidence                                                                                                                                              |
| ---- | ---------------------------------------------------------------- | ------ | ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-01 | No secret-shaped text in code, tests or history of the extension | O      | —     | VERIFIED | Extension 1.115.0 and 1.116.0 build fakes at run time; history rewritten and force-pushed 2026-11-28; gitleaks over all branches and tags: 0 findings |
| X-02 | gitleaks on every push and pull request, weekly full history     | O      | —     | VERIFIED | Extension `.github/workflows/secret-scan.yml`, green on 1.115.0 and 1.116.0                                                                           |
| X-03 | Main and release tags protected from force-push and deletion     | O      | —     | VERIFIED | Branch protection and tag ruleset set 2026-11-28                                                                                                      |
| X-04 | GitHub pull-request refs and cached views of old commits purged  | O      | —     | BLOCKED  | Only GitHub Support can remove `refs/pull/*`; request needs the owner's account                                                                       |

## Leftovers (B0)

| ID   | Requirement                                                       | Source  | Batch | Status   | Evidence                                                                                                                                               |
| ---- | ----------------------------------------------------------------- | ------- | ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L-01 | Smart App Control runbook: Linux spec recipe proved and corrected | session | B0    | VERIFIED | 2026-11-28: tracked-files copy (224 MB), `npm ci` 0, auth-service `hashing.utility.spec.ts` 5/5 passed in `node:24-bookworm`; runbook step 2 rewritten |
| L-02 | Anthropic invoice cache lines checked                             | session | —     | BLOCKED  | needs the owner's billing console                                                                                                                      |
| L-03 | PR tool tested on a throwaway GitHub repository                   | session | —     | BLOCKED  | needs the owner's go to create a repository                                                                                                            |
| L-04 | Production usage metering decision                                | session | —     | BLOCKED  | owner decision                                                                                                                                         |
