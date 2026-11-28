# 69 — Every change gets the security pass, and no scanner stays red

**Status:** active, **NON-NEGOTIABLE** · **Owner:** security · **Introduced:** 2026-11-28 ·
**Runbook:** [skills/secure-every-change.md](../skills/secure-every-change.md) ·
**Command:** `npm run security:check` · **Extends:** [rules/08](08-security-rules.md), [rules/21](21-security-and-secrets.md), [rules/68](68-internal-surfaces-stay-internal.md)

## Purpose

Security was checked at release time and in a pile of one-off audits, so GitHub gates went red between
them and the release stopped (2026-11-28), after the open-port and sign-up-farm incident of 2026-11-27
([rules/68](68-internal-surfaces-stay-internal.md)). The owner's standard: **very high security and very
high performance, every scenario tested, no scanner left red.** This rule turns that into a pass every
change goes through, by every agent and every tool, with mechanisms that fail the push when it is skipped.

## Applies to

Every change: a feature, fix, refactor, dependency bump, config, workflow, Dockerfile or script that touches
input, auth, network, files, secrets, models, money or the release. A prose-only or formatting-only change
needs no hand-run scan: the hooks below already run the automatic part, and the record says
`security delta: none, because <reason>`.

## Mandatory rules

1. **Run the pass in the skill, in order:** scan, research the change's attack surface, write the abuse tests
   first, run a penetration-style trial through the real entry point, measure the hot paths, patch the root
   cause, recheck, record ([skills/secure-every-change.md](../skills/secure-every-change.md)). The record goes
   in lane L12 (security) and L13 (performance) of `docs/qa-evidence/` ([rules/60](60-qa-evidence-is-mandatory-and-machine-checked.md)).
2. **`npm run security:check` before a non-docs change is called done.** It runs `npm audit` over every
   dependency, development tools included (fails on an unreviewed high or critical advisory, prints what
   moderate would show), gitleaks over the working tree, OSV-Scanner when installed, the pinned-action check,
   and the open GitHub code-scanning, Dependabot and secret-scanning alerts. Every FAIL is fixed in the change.
3. **A check that could not run is reported as SKIPPED, never as passed.** Say so in the report. `--strict`
   makes SKIPPED fail (CI, the weekly workflow).
4. **No alert stays open.** A red CI security job, a GitHub alert or a failing weekly scan is the next task,
   before new work. A false positive is dismissed on GitHub with a written reason and, for CodeQL, listed with
   its reason in `tools/security/codeql-accepted.json`. An advisory with no patched release gets an entry in
   `tools/security/audit-allowlist.json` with reason, reviewer and an expiry. **Never allowlist a real
   finding**: a real secret is rotated first, then removed.
5. **Dependencies stay current and pinned.** Production advisories are pinned by `npm run security:fix`
   ([ADR-202](../docs/13-adr/adr-202-every-gate-is-satisfied-by-plain-git-commit-and-push.md)); upgrades go in
   one reviewed batch, never mixed with feature code. Every third-party action is pinned to a full commit SHA;
   every downloaded tool (gitleaks, actionlint, OSV-Scanner) to a version and a SHA-256.
6. **No secret-shaped literal in any file, test or doc, even a fake.** Build fakes at run time. The local
   gitleaks must be 8.25.1 or newer, because an older one ignores the `[[allowlists]]` in `.gitleaks.toml` and
   reports fixtures as secrets (CI pins 8.30.1).
7. **Test the whole scenario space, not the happy path:** every role _and_ plan tier (free included),
   unauthenticated, another user's id (IDOR), a service token, hostile and oversized input, replay and
   duplicates, SSRF, injection, and the default (flag-off) state. Run the trial through nginx or the UI, never
   only through the service class.
8. **Measure the hot paths** (streaming, tool calls, context assembly, uploads, queries) before and after:
   latency, memory, payload size, calls per request. Every loop, buffer and external call is bounded, with a
   timeout. Record the numbers.
9. **The security step is never skipped by a gate receipt** ([rules/34](34-gate-economy-and-machine-resources.md)):
   a receipt proves a tree, while a secret or an advisory is judged at the moment of the push. `--no-verify`
   stays banned ([ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md)).

## Prohibited patterns

- Calling a change done with a SKIPPED, red or unread security check, or reporting a scanner you did not run.
- Dismissing an alert without a written reason, or widening `.gitleaks.toml`, the audit allowlist or
  `codeql-accepted.json` to get green.
- A fake `sk-…`, `ghp_…`, `AKIA…`, JWT or PEM literal anywhere in the repository.
- A workflow `uses:` pinned to a tag or branch, or a downloaded binary with no checksum.
- Upgrading a linter or a framework in the same commit as feature code: real findings drown in the noise.
- Testing only as an admin, only the free path, or only the unit.
- Fixing the symptom a scanner names instead of the root cause.

## Correct pattern

```bash
npm run security:check                              # the pass's automatic part, by hand
npm run security:check -- --level=moderate          # what a stricter audit would block
npm run security:check -- --history                 # also every commit ever made (about 15 s)
npm run security:check -- --outdated                # also the root dependencies behind their latest release
git add <explicit paths> && git commit && git push  # hooks: gitleaks (staged), then audit + gitleaks (outgoing)
```

## Enforcement

| Where                                                                                   | Runs                                                                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| pre-commit (`tools/gates/secret-scan.mjs`)                                              | gitleaks over the staged diff                                                                                            |
| pre-push (`tools/security/pre-push-security.mjs`, called by `tools/gates/pre-push.mjs`) | gitleaks over the commits being pushed, `npm audit` over every dependency, pinned actions; never skipped by a receipt    |
| CI `ci.yml`: `secrets`, `codeql`, `image-scan`, `policy`, `osv-scan`                    | gitleaks over the pushed range, CodeQL (fails on any finding), Trivy, production `npm audit`, OSV-Scanner (advisory)     |
| CI `security-scan.yml` (weekly and on demand)                                           | gitleaks over the whole history, `npm audit` at moderate over every dependency, OSV-Scanner                              |
| `dependency-remediation.yml` (daily)                                                    | pins patched production releases and pushes one `chore(deps)` commit                                                     |
| GitHub                                                                                  | Dependabot alerts and updates, secret scanning with push protection, CodeQL default setup                                |
| `npm run security:check`                                                                | everything above that can run on this machine, plus the open GitHub alerts                                               |
| Tests                                                                                   | `tools/__tests__/security-check.test.mjs`, `tools/__tests__/gate-registry.test.mjs`, `tools/__tests__/ci-gates.test.mjs` |
| Review and QA lane L12 / L13                                                            | the threats written down with a test that tries each, the trial, the measured numbers                                    |

## Related skills

- [secure-every-change](../skills/secure-every-change.md) · [security-review](../skills/security-review.md) ·
  [investigate-a-production-intrusion](../skills/investigate-a-production-intrusion.md) ·
  [run-the-qa-team](../skills/run-the-qa-team.md)

## Related context

- [rules/08](08-security-rules.md) · [rules/21](21-security-and-secrets.md) · [rules/23](23-git-commits-hooks-and-release-gates.md) ·
  [rules/60](60-qa-evidence-is-mandatory-and-machine-checked.md) · [rules/68](68-internal-surfaces-stay-internal.md)
- [CI pipeline](../docs/08-runtime-devops/ci-cd-pipeline.md) · [load-bearing facts](../context/load-bearing-facts.md)

## Definition of done

- [ ] `npm run security:check` exits 0, or every FAIL is fixed and every SKIPPED is named in the report.
- [ ] The change's threats are written down and each has a test that tries it.
- [ ] The penetration-style trial ran through the real entry point, across roles and plan tiers; results recorded.
- [ ] Hot paths measured before and after; nothing unbounded.
- [ ] GitHub shows no open code-scanning, Dependabot or secret-scanning alert, and no security job is red.
- [ ] No secret-shaped literal was added; no allowlist was widened for a real finding.
