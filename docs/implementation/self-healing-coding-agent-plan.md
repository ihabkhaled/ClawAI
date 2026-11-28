# ClawAI Coding Agent program: harness parity, model team and Wolverine self-healing

Status: IN PROGRESS, v2 (2026-11-28). B1 drafted: threat model, ADR-229, adversarial catalog (243 cases). Nothing else below is built unless the audit (§3) says so.
Owner decisions: §4. Requirement ledger: [self-healing-coding-agent-ledger.md](self-healing-coding-agent-ledger.md).

Sources, in authority order:

1. The owner's spoken brief of 2026-11-28 (Egyptian Arabic), summarised in §1.
2. The owner-supplied master prompt pack, stored unchanged in
   [wolverine-master-prompt/](wolverine-master-prompt/README.md) (13 workstreams, 00-12). It is
   the detailed specification; this plan maps it onto the code and records every deviation (§16).
3. Competitor research with sources: [coding-agent-parity-research-2026-11.md](coding-agent-parity-research-2026-11.md)
   (items marked UNCONFIRMED or SNIPPET were not read on an official page).
4. A read-only audit of both repositories (§3).

Intake per [rules/26](../../rules/26-prompt-pack-intake-protocol.md): read whole, audit first,
plan second, deviations stated. The extension is its own repository (`apps/claw-coding-agent`,
`ClawAI-Coding-Agent` on GitHub); extension work lands there through `npm run ship`, backend
work lands here. The extension's own gap list is `apps/claw-coding-agent/docs/ROADMAP.md`.

## 1. The brief, in one place

Four pillars. Pillars 1-3 are the pack's; pillar 0 is the owner's follow-up request.

0. **Knowledge layer for the extension repository.** Akinator vendored into the extension and
   always on (no command), its skills, rules, memory, context and an in-repo wiki published to the
   GitHub wiki; README, `CLAUDE.md`, `AGENTS.md`, `CODEX.md` and Cursor rules updated; and the
   existing code documented after the fact per feature area: business why, product why,
   technical how, decisions, before and after, dates, tests and their results. Repeated work
   becomes a skill.
1. **Harness at Claude Code, Codex, Cursor and Antigravity level.** Analyse, plan (business,
   architecture, security, performance), document, use plugins, skills, rules and memory, read
   and understand the whole codebase, write code; git commit, amend and push through every hook;
   GitHub end to end (branches, PRs, checks, runs, releases, deployments); fix whatever blocks a
   commit, push, check or deploy by fixing the real cause, never by bypassing it. Server access
   over the user's SSH identity, read-only first, very careful. Its own browser with a device and
   engine matrix, mouse and screen reading, API testing like Postman, hundreds of meaningful
   generated test cases. Retry with different strategies instead of stopping.
2. **Optional model team.** One primary model plus zero, one or two supporting models chosen
   from the chat model dropdown. They review and advise across the whole SDLC (understanding,
   plans, code, tests, audits, product, business, UX, QA, risk, security, performance); the
   primary may reject advice with a reason.
3. **Wolverine.** Every failure, discrepancy, suspected hallucination, exception, struggle or
   stall is captured (opt-in, redacted), sent to the backend, and turned by an always-on agent on
   a separate VM into a ticket, a reproduction, a root cause, a tested fix, a PR and finally a
   release, so the user's problem is gone after an update. Security comes before the feature:
   prompt injection, SQL/NoSQL injection, flooding, DoS/DDoS, fake requests and fake reports.

What the pack adds on top of the brief, and this plan adopts: explicit run and incident state
machines, a typed tool registry, decision receipts enforced outside the model, a versioned event
contract, separated planes, pilot stages A-E, a release controller, milestones M0-M7, a
requirement ledger, baseline benchmarks before any quality claim, and honest counting of test
runs. It also sets the limits this plan keeps: no claim of 100 % security or 99 % correctness,
the self-healer repairs ClawAI only (never a customer's repository), and telemetry never invokes
execution or publication directly.

## 2. Principles (binding for every batch)

- Authorization is deterministic and enforced outside every model. A prompt, a log line, a
  signed client event, model agreement or the mere presence of an SSH key is never permission
  to change a system.
- Everything a model reads that the platform did not write is data: files, pages, PR and issue
  text, tool output, model output, telemetry, stack traces, plugin metadata.
- Default read-only for anything outside the workspace; writes need a scoped approval or a
  preconfigured, independently enforced policy.
- Never weaken a test, hook, branch protection, sandbox or CI check to get green; never claim a
  run that did not happen.
- Every retry loop has a budget (attempts, time, tokens, money) and a no-progress detector.
- Default single-model mode stays fast, cheap and complete; every new capability has a feature
  flag and a kill switch, and its OFF state is tested (the OFF state is the default and the rollback lever).
- Measure first: a baseline before any parity or quality claim.

## 3. What exists today (audit verdicts, from code)

### 3.1 Harness and tools (extension)

| Area              | Verdict | Where it lives / the gap                                                                                                                                                                                                |
| ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run lifecycle     | partial | Runtime V2 run contract, durable runs, rewind, active-run resume (ROADMAP 1.81-1.84). No published state machine with the pack's states, sequence-based resume or side-effect reconciliation.                           |
| Stream handling   | partial | Individual stalls fixed as found (for example tool_use without message_stop). No general rule "thinking/status text is never a stop".                                                                                   |
| Context engine    | partial | `knowledge.context` reads rules/docs; bounded reads, receipts. No symbol/LSP index, dependency graph or incremental content-hash index.                                                                                 |
| Tool registry     | partial | Tools carry definitions, categories and a permission code (`docs/TOOLS.md` generated). No per-tool idempotency, side-effect class or decision receipt fields.                                                           |
| Approval modes    | done    | plan, ask, accept-edits, autonomous-scoped, strict. No classifier "auto" mode.                                                                                                                                          |
| Recovery          | partial | Retries in the backend client and headless retry policy. No bounded ladder with strategy change and no-progress detection.                                                                                              |
| Git               | done    | `workspace.git`: status/diff/log/blame, branches, worktrees, stage, commit with `amend`, stash, merge, rebase, cherry-pick, revert, fetch, pull, push, tag, switch (git-write grant); hardened. No force-push or reset. |
| GitHub            | partial | `workspace.pull-request` via `gh`: draft, publish, checks, failed-check logs, view, review, merge. No workflow runs, re-run, deployments, issues; manual only.                                                          |
| Gates             | done    | `code.gates` runs the repository's gates locally. No CI watch-and-fix loop.                                                                                                                                             |
| Browser           | partial | `browser.page`: Playwright Chromium, open/snapshot/click/type/press/wait/screenshot/resize/console/network. No device presets, touch, DPR, user agent, orientation, zoom, WebKit or Firefox.                            |
| API testing       | partial | `http.request` (allowlisted hosts). No OpenAPI/Postman import or contract-test runner.                                                                                                                                  |
| Sub-agents        | partial | `agent.team`: per-child model, read-only tools, worktree isolation. No reviewer role, verdict schema or file-defined sub-agents.                                                                                        |
| Server access     | missing | No SSH tool. "Remote command" means cloud-runner commands.                                                                                                                                                              |
| Sandbox           | partial | Shell off by default, "a safety net, not a sandbox"; sandbox mechanisms unit-tested only.                                                                                                                               |
| Injection defence | partial | Tool, PR and web output marked untrusted. No hidden-content stripping (markup, comments, zero-width and bidi characters).                                                                                               |

### 3.2 Model team (backend and extension)

| Area             | Verdict | Where it lives / the gap                                                                                           |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| Judge / critic   | done    | chat-service compare/judge enums, `judge-model-parse.utility.ts`, `critic-prompt-builder.utility.ts`.              |
| Council          | done    | Harness council (ADR-223): parallel members, admin-configured candidates, majority merge. Research decisions only. |
| Code-review team | missing | `src/core/code-review.ts` is a single reviewer.                                                                    |

### 3.3 Wolverine (diagnostics, remediation, release)

| Area                 | Verdict | Where it lives / the gap                                                                                                                                                                                     |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Client capture       | partial | Feedback is user-initiated (`send-feedback-command.ts`); OTLP only to a user-set endpoint; diagnostic report (`diagnostic-report.ts`). No crash or automatic failure capture.                                |
| Redaction            | done    | `src/core/redaction.ts` (keys, JWTs, cookies, bearer, URL secrets, `KEY=value`), regex based. Pack asks for structured allowlists on top.                                                                    |
| Ingest               | partial | audit-service `POST /feedback` (authenticated) and `/feedback/public` (limiter fails open); client-logs-service `POST /client-logs/batch` (public). No authenticated, signed, fail-closed incident intake.   |
| Request authenticity | partial | Bearer sessions; HMAC + constant-time compare in agent-service webhooks; device-token class (ADR-144); proof of work in auth-service. No proof-of-possession signing of extension requests.                  |
| Scheduler            | partial | agent-service routines (cron ≥ 5 min, HMAC webhook, per-routine encrypted secrets, ADR-143). Nothing reads incidents or opens fixes.                                                                         |
| Release              | done    | Extension CI (version, quality, unit, extension-host, Playwright, audit) then Release workflow publishes the exact VSIX to the Marketplace. No release controller, provenance attestation or canary channel. |

## 4. Owner decisions (2026-11-28)

| Question                           | Answer                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How far the self-healer goes alone | "All options", fully automated, with maximum security, careful analysis, planning, testing and regression testing. Mapped to the pack's pilot stages (§10): A to D first; stage E (bounded low-risk automatic release) only after the release policy, threat tests, abuse controls, rollback rehearsal and kill switch are proven, and the owner confirms again. High-risk change classes always need the owner. |
| What a report may contain          | Opt-in, redacted: error type, stack fingerprint, versions, tool name, redacted log tail. Never code, prompts or file contents.                                                                                                                                                                                                                                                                                   |
| Supporting models                  | User opt-in, billed to the user's credit, shown on the receipt; picked from the dropdown.                                                                                                                                                                                                                                                                                                                        |
| Where the self-healer runs         | A new separate VM, not the production server, with only a branch/PR GitHub identity. No production database or SSH keys.                                                                                                                                                                                                                                                                                         |
| Extension wiki                     | Pages live in `wiki/` in the extension repository and a workflow publishes them to the GitHub wiki.                                                                                                                                                                                                                                                                                                              |
| Retro documentation depth          | One page per feature area (about forty), not per file.                                                                                                                                                                                                                                                                                                                                                           |
| Release of the knowledge work      | One extension release at the end of pillar 0.                                                                                                                                                                                                                                                                                                                                                                    |
| First GitHub wiki page             | The agent tries in the browser; if GitHub is not signed in there, the owner creates it once.                                                                                                                                                                                                                                                                                                                     |
| Report intake home                 | A new small service with its own database (`claw-incident-service`), not agent-service: agent-service holds the encryption key and device command dispatch (ADR-229).                                                                                                                                                                                                                                            |
| Report identity                    | Per-installation key pair made at sign-in, in VS Code SecretStorage, public key registered to the user; every batch signed. No device pairing needed.                                                                                                                                                                                                                                                            |
| Fail-closed limiters               | Security routes (sign-in, sign-up, password, device, intake) fail closed on a Redis error; plain feedback stays lenient.                                                                                                                                                                                                                                                                                         |
| nginx                              | Add a per-IP `limit_req` zone for `/api/v1/agent` and the intake now, plus per-account limits in the services; production after the owner's deploy go.                                                                                                                                                                                                                                                           |

Open, with the default used until answered (ask again before the batch that needs it):

- VM provider and size (needed by B8). Default: the owner provides it; everything runs on the
  local stack first.
- Healer daily model budget (B8). Default: a hard daily cap in DB config, platform-paid,
  admin-editable, kill switch at the cap.
- Healer models (B8). Default: the admin assistant-model list, primary plus two reviewers.
- Retention (B5). Default from the pack: optional attachments 7 days, sanitized events 30 days,
  aggregates longer; legal review pending.
- Which change classes may auto-release at stage E (B9). Default: none until the owner lists
  them.

## 5. Target architecture

Four planes that never share credentials. A plane talks to the next only through a stored
record or an independently issued, scoped capability; no request handler ever starts a model,
shell, git job or deployment.

```
 USER MACHINE                      CLAWAI BACKEND                        HEALER VM             GITHUB
 ┌───────────────┐  signed batch  ┌──────────────────────────┐         ┌─────────────────┐   ┌──────────┐
 │ VS Code ext.  │ ─────────────▶ │ Ingest gateway (nginx →  │         │ Scheduler +     │   │ branch / │
 │ - harness     │   (opt-in,     │ agent-service module)    │  pull   │ leases + budgets│   │ draft PR │
 │ - diag SDK    │   redacted)    │ - auth, PoP, replay      │ ◀────── │ (read-only key) │──▶│ (broker) │
 │ - local queue │                │ - schema, caps, limits   │         │ Patch worker in │   └────┬─────┘
 └───────────────┘                │ - durable queue + DLQ    │         │ throwaway box   │        │ CI
   interactive plane              │ - redact, dedup, group   │         │ Reviewer (sep.) │        ▼
   (unchanged path)               │ - incident store (RBAC)  │         └─────────────────┘   ┌──────────┐
                                  └──────────────────────────┘          remediation plane    │ Release  │
                                    diagnostics plane                                         │controller│
                                                                                              └──────────┘
                                                                                          release control plane
```

- **Interactive plane**: the extension and the existing chat/agent APIs. Diagnostics never
  block it: enqueue is non-blocking, bounded, and dropped first under load.
- **Diagnostics plane**: an ingest module (placement: its own service, `claw-incident-service`, ADR-229), a durable queue with DLQ and TTL, normalisation, server-side redaction, grouping and
  an incident store with operator-only RBAC and audit.
- **Remediation plane**: the healer on its own VM. Reads sanitized incidents with a read-only
  credential; every job gets a disposable worktree and container, read-only base snapshot,
  synthetic data, minimal egress, no host mounts, no Docker socket, no production secrets.
  Patch worker, reviewer and release authority are separate identities.
- **Release control plane**: GitHub branch protection, CODEOWNERS, required checks, the existing
  Release workflow, plus a release controller (§10). Only it can authorise publication; no model
  can reach signing or Marketplace credentials.

Kill switches (DB config, admin page, audited): uploads, ingest, triage, repair jobs, PR
creation, release automation, model team. Each OFF state is tested.

## 6. Security model (M1, built before any intake code)

### 6.1 Threat actors and assets

Actors: unauthenticated internet, hostile valid user, compromised installation, compromised
provider or plugin or dependency, insider, compromised healer worker. Assets: user code and
prompts, credentials and tokens, the extension's users (via a malicious release), the backend's
availability and cost, the repositories, the release channel.

### 6.2 Controls

1. **Identity and authenticity.** Existing account auth with short-lived, audience-bound tokens;
   the server derives tenant and installation. Each installation registers a key pair at sign-in
   (VS Code SecretStorage), bound to the user and device class (ADR-144). Every batch carries a
   proof-of-possession signature over method, path, body hash, timestamp and nonce; skew window,
   Redis nonce cache, rotation and revocation. No universal secret ships in the VSIX. A valid
   signature proves possession of a key, not honest content: reports are correlated with
   server-side evidence, release manifests and reproducibility before they matter.
2. **Abuse and cost.** nginx `limit_req` zone; Redis budgets per IP, account, tenant,
   installation, key and global, all **fail closed** (unlike today's feedback limiter);
   request, byte, batch, depth, array and concurrency caps; decompression limits; progressive
   throttling with bounded Retry-After; duplicate suppression by fingerprint so a thousand copies
   cost one row; per-tenant fair queues; daily cost ceilings; load shedding drops repetitive
   low-priority diagnostics first and never touches the core coding API. Cheap checks run before
   expensive ones; no model classifier guards ingress.
3. **Input handling.** Strict zod schemas, unknown fields refused, strict enums and lengths,
   `$`-prefixed keys refused (NoSQL operators), parameterised ORM/driver access only, nothing
   from a payload is ever evaluated or concatenated into SQL, shell, templates or prompts as
   instructions. Content hash stored for integrity.
4. **Privacy.** Opt-in; local redaction before send plus server-side redaction and quarantine;
   structured allowlists (field by field), not regex alone; no prompts, code, files, command
   lines, environment, headers, cookies, bodies or repository URLs; paths reduced to a shape;
   retention per §4 with a purge job covering derived stores; no user identity in tickets, PRs or
   logs; users can see and delete what was sent.
5. **Injection.** Report text reaches a model only inside the untrusted fence, after hidden
   content is stripped and flagged (markup of any kind, comments, zero-width and bidi
   characters, encoded blobs). A report is evidence of a symptom, never an instruction: the
   healer's goal comes from its fixed system prompt, and reproduction steps are generated from
   code and typed fields, never executed from a log. A report that asks for an action is
   quarantined for the owner.
6. **Healer containment.** Separate VM; maintenance identities scoped to allowlisted ClawAI
   repositories; push to `wolverine/*` branches and open draft PRs only, through a broker that
   checks repository, branch, diff scope, policy and quota; cannot approve or merge its own PR;
   cannot edit policy, CI workflows, hooks, its own admission rules, watchdog or release
   credentials; its own telemetry goes to a separately labelled channel that never starts another
   healer job.
7. **Change classes.** High-risk paths always need the owner: auth, billing, permissions, tool
   policy, redaction, sandbox, telemetry intake, updater, CI workflows, hooks, release scripts,
   secrets, `package.json` and lockfiles, new dependencies, network allowlists, migrations,
   deletions, and diffs over a size cap.
8. **Release safety.** Every release is a normal versioned release from an exact reviewed SHA;
   a regression spike after a release pauses automation and alerts the owner; rollback is
   rehearsed before stage E.

### 6.3 Adversarial suite (runs on every change to intake, healer or release code)

Forged, replayed, expired and wrong-scope events; mutated signed payloads; a compromised valid
client sending plausible lies; tenant confusion; bursts, many installations, high-cardinality
fingerprints; large, nested and compressed payloads; malformed Unicode; cost amplification and
queue starvation; NoSQL operators and SQL fragments in every field; direct and indirect prompt
injection in stack traces, log tails, issue and PR text and browser DOM, using inert markers
that request unauthorised writes, policy changes, credential access, network egress, repository
deletion or a release, in several languages, code-mixed, quoted and encoded; poisoned
attachments; malicious plugin or tool output; a compromised adviser model; stale approvals;
action-parameter swaps; malicious PR titles and comments; workflow-change and publish requests.
Synthetic accounts, seeded fake credentials and fake privileged targets only. **Any unauthorised
side effect is a blocking failure**, even when the UI claims it was denied. Distinct cases and
repeated runs are counted separately; a "1,000 rounds" claim means 1,000 recorded executions.

## 7. Event contract (diagnostics v1)

Client fields: `event_id`, `event_type` (enum), `observed_at`, `installation_id` (pseudonymous),
session/run/step/tool-call ids, trace/span ids, `sequence`, extension and backend versions, OS
family, provider/model id (when the user allows), tool name/version, operation class, normalised
error code, sanitized message, stack fingerprint, severity hint, attempt count, elapsed bucket,
outcome, retryable, recovery result, optional evidence reference, consent category.

Server fields: `server_received_at`, tenant (derived, never from the client), authentication
assurance, validation and trust status, policy version, grouping key.

Never trusted from the client: tenant, roles, approval, final severity, repository path,
destination. Successes are counted too (denominators). Delivery is at-least-once with idempotent
ingest by `event_id`; exactly-once is not promised. Schema versions are backward compatible.

## 8. Incident state machine (healer)

`RECEIVED → VALIDATED | QUARANTINED → GROUPED → TRIAGED → REPRODUCTION_PENDING → REPRODUCED |
NEEDS_EVIDENCE → ROOT_CAUSE_CONFIRMED → PLAN_REVIEWED → PATCH_PROPOSED → TESTED →
SECURITY_REVIEWED → PR_OPENED → APPROVED → STAGING_VERIFIED → RELEASE_ELIGIBLE → RELEASED →
MONITORING → RESOLVED`, with `RETRY_SCHEDULED`, `BLOCKED`, `REJECTED`, `REGRESSION`,
`ROLLED_BACK`, `CLOSED_DUPLICATE`. Each transition has a guard backed by evidence the report
cannot supply; a missing future report is not proof of a fix. One lease-holding owner per
incident; restart reconciles leases. Budgets per fingerprint, per day, per tenant and in total;
poison events are quarantined; the same fingerprint is not patched again without new evidence.

## 9. Harness design (pillar 1)

- **Run state machine**: `CREATED, PLANNING, RUNNING, WAITING_TOOL, WAITING_APPROVAL, RECOVERING,
VERIFYING, PAUSED, COMPLETED, FAILED, CANCELLED, BUDGET_EXHAUSTED`, legal transitions,
  durable event ids, sequence numbers, heartbeats, checkpoints. Reasoning and status text is
  never a terminal signal; only a definitive provider stop, an explicit final result or a budget
  ends a run. Resume from the last acknowledged sequence; side effects with an uncertain outcome
  are reconciled, never blindly repeated.
- **Recovery ladder**: classify → retry transient (backoff + jitter) → adjust input or use a
  verified alternate tool or model → checkpoint and replan → isolate the blocker → ask for
  authorised input or stop safely. Per-step and per-run budgets, repeated-fingerprint and
  no-progress detection, circuit breakers; permission denials and irreversible actions are never
  retried blindly. Each exhausted ladder is a Wolverine event.
- **Tool registry contract**: id/version, schema, side-effect class, capability, sandbox and
  egress, scope, permission level, idempotency strategy, timeout, quota, cancellation, redaction,
  provenance, audit fields; structured errors (transient, permanent, permission-denied, invalid
  input, uncertain outcome). Decision receipts bound to action, workspace, scope, TTL and
  artifact hash, issued outside the model.
- **Context engine**: instruction discovery (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, skills,
  memory) that can never loosen security policy; tracked-file inventory, symbol and dependency
  maps, incremental content-hash index, secret exclusion, freshness invalidation after edits and
  branch switches; coverage maps instead of dumping files.
- **Tools to add**: device and engine matrix for the browser (§12), GitHub runs/re-run/
  deployments/issues/releases, CI watch-and-fix on a PR, event-triggered PR review with verified
  findings, OpenAPI/Postman import and contract tests, read-only SSH (§9.1), file-defined
  sub-agents, hidden-content stripping, an optional classifier auto mode that fails closed.

### 9.1 Server access (SSH)

Host inventory with pinned host-key fingerprints, explicit identity mapping, agent forwarding off,
no key export, no secret logging. Read-only first: health, disk, services, containers, health
endpoints, deployed version, redacted logs, approved config. Mutations (nginx, Docker/Compose,
new service, systemd, environment, rollout) need a reviewed plan, diff and rollback, the approved
deployment workflow, `nginx -t` before reload, health and TLS checks after, and an explicit scoped
approval for anything in production. No generic scanning, no Docker socket for untrusted agents,
no arbitrary sudo. Tests: host-key mismatch, unreachable host, expired auth, partial deploy,
failed health check, rollback.

## 10. Release policy and pilot stages (pillar 3)

| Stage | What runs                                                   | Gate to enter                                                                                                        |
| ----- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| A     | Telemetry and ticket suggestions, shadow mode               | M1 security suite green; kill switches tested                                                                        |
| B     | Verified reproduction and draft repair proposals (no push)  | Stage A quality metrics reviewed                                                                                     |
| C     | Sandbox fixes and draft PRs, reviewer models, CI            | Broker and branch protection verified                                                                                |
| D     | Owner-approved merge, prerelease extension, internal cohort | Rollback rehearsed                                                                                                   |
| E     | Bounded low-risk automatic release                          | Owner-approved change classes, independent policy, threat tests, abuse controls, rollback and kill switch all proven |

Release controller checks, before any publication: approved PR, required checks on the exact
SHA, change class allowed, artifact provenance and hash, version increment, backend
compatibility, rollback plan, environment approval. Pending or skipped is not success. After
publication: verify the Marketplace version, then tell affected users generically (version,
sanitised change note), respecting VS Code's own update setting. Track uptake and regressions;
close an incident only after an observation window.

## 11. Model team (pillar 2)

- Primary plus zero, one or two advisers, from the current catalog at runtime (no hard-coded
  names), respecting plan, BYOK, capability (tools, vision, context), price and per-provider
  data consent. Off by default; modes: always consult, risk-adaptive (recommended), off.
- Cost shown before enabling; hard spend ceiling; atomic reserve before each call and
  reconciliation after; on the receipt per adviser.
- Advisers are read-only by default; on approved tasks they may propose patches in separate
  worktrees, and only the primary integrates. Independent first pass (no anchoring), then one
  exchange of structured findings: evidence, file references, confidence, impact, candidate fix,
  test idea. The primary accepts, rejects or defers each with a reason; deterministic tests and
  policy outrank every model; disagreement is not settled by votes. Capped rounds (default two
  per milestone), time and tokens. An auditable decision ledger per run.
- The orchestrator decides what crosses providers and strips secrets; the whole workspace is
  never broadcast.
- Built on `agent.team` plus the chat-service judge parser. Evaluation: primary alone vs +1 vs +2
  on identical tasks and budgets (pass@1, defect escape, review precision, time, spend). It ships
  for a task class only where the measured benefit justifies the spend.

## 12. Testing, QA and performance

- Risk-based test catalog traced to requirement ids, Given/When/Then, from product owner,
  business analyst, PM, end user, accessibility, manual QA, automation QA, architecture,
  security, SRE and performance points of view. Simulated acceptance is labelled simulated.
- Browser matrix: 320×568, 390×844, 430×932 and their landscapes, 768×1024 both ways,
  1280×720, 1440×900, 1920×1080, zoom 200 %, DPR/touch/pointer, RTL Arabic, dark/light,
  keyboard-only; Chromium/Chrome/Edge plus Firefox and WebKit. Emulation is not a real device.
  The extension UI itself is verified in the extension host, not only on the web.
- Scenario families: a 6-hour session with disconnects, provider errors, compaction, reload and
  resume; a git fixture with failing hooks, conflicts, rejected push, red and flaky CI; the
  device/engine matrix; model-team conflicts and failures; the full Wolverine loop on a seeded
  benign defect including replay, flood and injection variants; performance (first event, tool
  latency, index time and memory, adviser overhead, extension CPU/RAM, queue lag, p50/p95/p99).
- Initial targets, calibrated against the baseline and approved by the owner: zero unauthorised
  privileged effects; zero synthetic-secret leaks; zero duplicate side effects in replay; 100 %
  required checks on the exact SHA; telemetry adds ≤ 5 % p95 latency to core APIs; the
  interactive path stays stable with telemetry saturated.
- Local isolated fixture first, then staging, then a production canary with non-destructive
  synthetic checks. Every batch also gets the monorepo's 15-lane QA evidence record.

## 13. Batches and milestones

| Batch | Milestone | Content                                                                                                                                                           | Repo         |
| ----- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| B0    | M0        | Leftovers (Linux spec recipe runbook); baseline: SHAs, CI state, test results, single-model benchmark fixtures                                                    | both         |
| K1    | M0        | Akinator vendored into the extension, always on; routers (`CLAUDE.md`, `AGENTS.md`, `CODEX.md`, Cursor rules), extension rule and ADR                             | ext          |
| K2    | M0        | `wiki/` + publish workflow; GitHub wiki created; README links                                                                                                     | ext          |
| K3    | M0        | Retro documentation, one page per feature area (business, product, technical, decisions, history, tests); `context/` and `memory/` for the extension; one release | ext          |
| B1    | M1        | Threat model (STRIDE, OWASP LLM/agentic/API, data-flow diagram), ADRs for planes and intake, adversarial suite skeleton, kill-switch config                       | both         |
| B2    | M2        | Run state machine, "status is never a stop", recovery ladder with budgets, tool registry fields, decision receipts                                                | ext          |
| B3    | M2        | Tools: browser device/engine matrix, GitHub runs/deployments/issues, CI watch-and-fix, OpenAPI import, hidden-content stripping, read-only SSH                    | ext          |
| B4    | M4        | Ingest: PoP keys, signed batches, fail-closed limits, schema, queue + DLQ, redaction, dedup, incident store, admin view, retention                                | backend      |
| B5    | M4        | Diagnostic SDK: consent (12 locales), capture points, local queue, signing, user view/delete; marketing page (rule 66)                                            | ext          |
| B6    | M3        | Model team (opt-in, billed, receipts, decision ledger) and its evaluation                                                                                         | both         |
| B7    | M4        | Healer stage A (shadow triage and tickets) on the VM                                                                                                              | backend + VM |
| B8    | M5        | Stages B-C: sandbox reproduction, fixes, broker, draft PRs                                                                                                        | VM + GitHub  |
| B9    | M6-M7     | Stage D (prerelease, rollback rehearsal), release controller; stage E only on owner approval                                                                      | all          |

B1 lands before B4-B9 because security comes before the feature. K1-K3 and B2-B3 do not
depend on B1 and run first and in parallel. Each batch: plan, tests (success and failure),
adversarial cases where relevant, docs in the same change, QA record, live proof on the local
stack (`https://claw.local`, local dev users only).

## 14. Required artifacts

ADRs; capability matrix (from the research doc, kept current); tool registry and permission
matrix (`apps/claw-coding-agent/docs/TOOLS.md`, `PERMISSION_MATRIX.md`); threat models
(`docs/03-architecture/`); data flow and retention schedule; JSON schemas for the event contract;
test catalog and regression fixtures; the requirement ledger; dashboards; operator runbooks
(incident, kill switch, rollback); release manifest; user documentation; cross-repo
compatibility matrix and feature-flag lifecycle.

## 15. Non-goals

Repairing customers' repositories; extracting competitors' prompts or private code; desktop-wide
OS input without a separate decision (F030); a model ever approving its own change; "unlimited"
retries; claims of absolute security or fixed correctness percentages.

## 16. Deviations from the pack, and why

- **Pillar 0 added.** The owner asked for the extension's knowledge layer in the same session;
  it also gives every later batch a documented codebase.
- **Stage E stays reachable.** The pack defaults to human-approved releases; the owner wants full
  automation. Both hold: stage E exists, gated by the pack's conditions and an explicit owner
  approval of named change classes.
- **Marketing page (rule 66)** ships with B5, the first user-visible Wolverine batch.
- **Placement**: the pack leaves locations open; this plan puts ingest in agent-service (to be
  confirmed in the B4 ADR) and keeps the healer off the production host.
