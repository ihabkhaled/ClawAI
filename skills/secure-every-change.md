---
name: secure-every-change
summary: The security and performance pass every change goes through before it is called done - dependency, secret and code scanning, vulnerability research, abuse tests, a penetration-style trial, stress and performance measurement, patching the root cause, and no scanner left red.
task_keywords:
  [
    security pass,
    vulnerability,
    vulnerabilities,
    dependency scanning,
    code scanning,
    gitleaks,
    npm audit,
    osv,
    dependabot,
    codeql,
    penetration test,
    pentest,
    abuse test,
    stress test,
    patch,
    advisory,
    cve,
    secret leak,
    security check,
    github alerts,
  ]
applies_to: [apps/claw-*, apps/claw-frontend, packages/shared-*, tools/security, .github/workflows]
required_rules:
  [
    69-security-pass-on-every-change,
    08-security-rules,
    21-security-and-secrets,
    60-qa-evidence-is-mandatory-and-machine-checked,
  ]
affected_workspaces: [apps/claw-*, apps/claw-frontend, packages/shared-*]
required_tests: [the abuse tests for the change's threats, tools/__tests__/security-check.test.mjs]
required_docs: [rules/69-security-pass-on-every-change.md, docs/08-runtime-devops/ci-cd-pipeline.md]
validation_lane: npm run security:check, then the hooks (git commit, git push) gate the change - rules/23 gate matrix
---

# Skill: secure every change

The runbook for [rule 69](../rules/69-security-pass-on-every-change.md). The owner's standard (2026-11-28): very high
security and performance, every scenario covered, no scanner left red. Security is checked on **every** change, not at
release time, by every agent and every tool.

## When to use

- Every change that touches input, auth, network, files, secrets, models, money, dependencies, a workflow or the release.
- GitHub shows a code-scanning, Dependabot or secret-scanning alert, or a security job in CI is red.
- A new library, a new outbound call, a new endpoint, a new upload path, a new prompt-fed tool.

## When NOT to use

- A prose-only or formatting-only change: the hooks already run gitleaks and the audit. Record
  `security delta: none, because <reason>` in the QA evidence and stop.
- As a replacement for the QA lanes: this is lanes L12 (security) and L13 (performance) done properly, not the other thirteen.

## Procedure

1. **Scan.** `npm run security:check` ([tools/security/security-check.mjs](../tools/security/security-check.mjs)): `npm audit`
   over every dependency, development tools included (fails on an unreviewed high or critical advisory; prints what moderate
   would show), gitleaks over the working tree, OSV-Scanner when installed, workflow actions pinned to commit SHAs, and the
   open GitHub code-scanning, Dependabot and secret-scanning alerts. Every FAIL is fixed in this change. A SKIPPED line is
   reported as skipped, never as passed. Add `--level=moderate` to see what a stricter audit blocks, `--history` to scan
   every commit ever made (about 15 s), `--outdated` to list the root dependencies behind their latest release, `--strict` to
   make SKIPPED fail.
2. **Research the change's attack surface.** List what the change touches: input, another user's data, model or tool output,
   the network, a shell, files, secrets, the browser, a queue, a plan limit or money. For each library involved look up its
   current advisories and the OWASP risks that apply (API Top 10, LLM Top 10 for anything fed to a model):
   `gh api "advisories?ecosystem=npm&affects=<package>"`, the package's own changelog, `npm view <package> versions`,
   and the OSV database. Write the threats as a short list in the QA evidence record; each one gets a test in step 3.
3. **Write the abuse tests first.** A test per threat that tries to do the bad thing and asserts it is refused **before** the
   side effect (the request never leaves, the row never changes, the log never contains it). The matrix: unauthenticated,
   another user's id (IDOR), every role _and_ every plan tier (free included), a service token where one applies, hostile
   and oversized input (every `z.string()` and `z.array()` has `.max()`), injection (path, command, header, prompt),
   SSRF and private addresses, replay and duplicates, ReDoS, a secret leaking into a log, response or error, and the
   default (flag-off) state. Fake secrets are built at run time, never typed ([rule 69](../rules/69-security-pass-on-every-change.md) item 6).
   Existing patterns: `ssrf-pentest.spec.ts` in claw-plugin-service, `tools/__tests__/internal-controllers-guarded.test.mjs`.
4. **Penetration-style trial.** Run the feature the way an attacker would, through its real entry point (nginx at
   `https://claw.local/api/v1`, the UI in Playwright), with the hostile inputs from step 3. `scripts/qa/live-authz-check.mjs`
   is the template for authorization and IDOR trials. Any unauthorised side effect is a blocking failure, even when the UI
   says it was refused. Record the exact command and the response.
5. **Stress and performance.** For anything on a hot path (streaming, tool calls, context assembly, uploads, a list query,
   the composer) measure before and after: latency (p50 and p95), memory, payload size, calls per request. Run it
   concurrently and with a large input (`scripts/qa/live-shared-run-load.mjs` is the template), and with a dependency down.
   Every loop, buffer and external call is bounded and has a timeout. Record the numbers next to the threat list.
6. **Patch the root cause.** Fix what the trial proved, not the symptom a scanner named. Never weaken a test, a rule or a
   scanner; never allowlist a real finding. A dependency advisory: `npm run security:fix` pins a patched production
   release; anything else goes into the reviewed upgrade batch, separate from feature code. No patched release exists: a
   reviewed entry in `tools/security/audit-allowlist.json` (reason, reviewer, expiry). A real secret: rotate first, then remove.
7. **Recheck.** Rerun steps 1, 3 and 4. The abuse test that failed before the patch now passes; the scan is green.
8. **Record.** Lane L12 and L13 of the `docs/qa-evidence/` record carry the threats, the commands and the numbers
   ([rule 60](../rules/60-qa-evidence-is-mandatory-and-machine-checked.md)). A false positive is dismissed on GitHub with a
   written reason, and a CodeQL one is also listed in `tools/security/codeql-accepted.json`.

## Tools

| Tool                                             | Where it runs                                                                             | What it catches                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm run security:check`                         | by hand, any time                                                                         | all of the below that can run here, plus the open GitHub alerts          |
| gitleaks (8.25.1 or newer locally, 8.30.1 in CI) | pre-commit (staged), pre-push (outgoing commits), CI (every push), weekly (whole history) | secrets, including the retired admin password                            |
| `npm audit` over every dependency                | pre-push, `security:check`, weekly at moderate; production only in CI `policy`            | vulnerable packages, development tools included                          |
| `npm run security:fix`                           | by hand, pre-commit auto-sync, daily `dependency-remediation.yml`                         | pins the patched release of a production advisory                        |
| OSV-Scanner 2.7.1                                | CI `osv-scan` (advisory), weekly, `security:check` when installed                         | advisories from the OSV database that npm audit does not list            |
| CodeQL + `tools/security/sarif-gate.mjs`         | CI `codeql` (fails on any finding), GitHub default setup                                  | injection, SSRF, ReDoS, unsafe workflows                                 |
| Trivy                                            | CI `image-scan` when a production Dockerfile changes                                      | fixable HIGH/CRITICAL image vulnerabilities, Dockerfile misconfiguration |
| actionlint (with shellcheck)                     | CI `policy`                                                                               | workflow mistakes, unquoted shell                                        |
| pinned-action check                              | pre-push, `security:check`                                                                | an action pinned to a tag or branch (supply chain)                       |
| Dependabot alerts and updates, secret scanning   | GitHub                                                                                    | vulnerable dependencies, secrets at push time                            |
| eslint-plugin-security, typescript-eslint strict | `npm run lint`, lint-staged                                                               | unsafe code patterns                                                     |

## Failure modes

- Reporting a SKIPPED scanner as a pass, or a mocked test as live evidence.
- `gitleaks dir .` over the whole directory: it walks node_modules, caches and nested worktrees, took over four minutes and
  reported 8,489 false findings (2026-11-28). `security:check` scans only the files git tracks or would add.
- A local gitleaks older than 8.25.1: it ignores `[[allowlists]]` in `.gitleaks.toml` and flags every test fixture. Upgrade it.
- Dismissing an alert with no reason, or widening an allowlist to get green.
- Testing only the happy path, only as admin, or only the free plan.
- Fixing the symptom: a regex that blocks one payload instead of the validation that should have refused the class.
- Mixing a dependency upgrade with feature code, so the real finding hides in the noise.
- An unbounded loop, buffer or retry on a hot path that only shows under concurrency.

## Definition of done

- [ ] `npm run security:check` exits 0, or every FAIL is fixed and every SKIPPED is named.
- [ ] The change's threats are written down and each has a test that tries it.
- [ ] The trial ran through the real entry point across roles and plan tiers; commands and responses recorded.
- [ ] Hot paths measured before and after; nothing unbounded; numbers recorded.
- [ ] GitHub shows no open code-scanning, Dependabot or secret-scanning alert; no security job is red.
- [ ] No secret-shaped literal added, no allowlist widened for a real finding.

Related: [security-review](security-review.md) (the code-review checklist), [investigate-a-production-intrusion](investigate-a-production-intrusion.md),
[run-the-qa-team](run-the-qa-team.md), [rules/08](../rules/08-security-rules.md), [rules/21](../rules/21-security-and-secrets.md),
[rules/68](../rules/68-internal-surfaces-stay-internal.md).
