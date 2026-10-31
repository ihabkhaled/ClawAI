# ADR-202: Every gate is satisfied by a plain `git commit` and `git push`

**Status:** Accepted

**Date:** 2026-10-31

Builds on [ADR-061](adr-061-git-hook-policy-no-bypass.md) (no hook bypass). Rules: [rule 23](../../rules/23-git-commits-hooks-and-release-gates.md), [rule 24](../../rules/24-generated-files-and-knowledge-freshness.md), [rule 34](../../rules/34-gate-economy-and-machine-resources.md), [rule 60](../../rules/60-qa-evidence-is-mandatory-and-machine-checked.md), [rule 63](../../rules/63-docs-move-with-code.md).

## Context

CI kept failing for reasons nobody caused by hand and nobody should have to remember:

- `Policy` failed on `npm audit` when a new advisory (GHSA-mrwp-f3q8-3g9p, follow-redirects) was published. That is external state: no commit caused it, so a gate that only reports it leaves main red.
- pre-push failed with `stale count fragment (run npm run knowledge:build)`. The build rewrites `<!-- count:x -->` fragments inside hand-written docs, but pre-commit staged only `.ai`, the snapshot and `AGENTS.md`, so the rewritten docs stayed unstaged and the pushed tree was stale.
- ratchet baselines (format, lint warnings, coverage thresholds) needed `npm run ...:baseline` runs somebody had to remember.
- A long pre-push can lose its connection and exit 141 after `pre-push OK`.

## Decision

The owner's rule: every CI gate must be satisfied automatically by a normal terminal `git commit` and `git push`. No special command, nothing an agent must remember.

1. **A gate registry** (`tools/gates/registry.mjs`) lists every CI job and blocking step with: what it checks, its local enforcement point, whether a normal commit can fail it, and its auto-fix, or the reason a human must decide. `tools/__tests__/gate-registry.test.mjs` fails when a workflow job has no entry, when an entry points at a file or hook line that no longer exists, or when an entry has neither an auto-fix nor a stated human reason. A CI gate without a local story cannot be merged.
2. **pre-commit auto-sync** (`tools/gates/autosync.mjs`, step 3 of 5) repairs and stages, one `autosync:` line each: dead entries in the format baseline, lint-warning baseline entries for staged (proven clean) or deleted files, the coverage threshold table when a vitest config is staged, and a newly advisory'd production dependency. The knowledge step now also stages the docs whose count fragments it rewrote. Baselines only shrink and thresholds only rise: nothing is weakened.
3. **Dependency self-healing** (`tools/security/audit-fix.mjs`): for each blocking advisory not covered by a live allowlist entry it pins the lowest-major patched release (an `overrides` entry, or a bumped range for a direct dependency), regenerates the lockfile, keeps workspace versions unchanged, re-audits, and rolls back if the re-audit is not clean. Hook mode is throttled to once per 6 h unless `package.json`/the lockfile are staged, and tolerates an offline registry. When no patched release exists it prints the exact allowlist entry (reason, reviewedBy, expiry) a reviewer must write; it never edits the allowlist and never weakens `npm-audit.mjs`. `.github/workflows/dependency-remediation.yml` runs the same tool daily and pushes one `chore(deps)` commit to main with the built-in token, the way `release.yml` pushes its version commit.
4. **pre-push self-heal** (`tools/gates/self-heal.mjs`): a stale generated tree is regenerated and committed as `chore(knowledge): refresh generated files`, a pending dependency pin as `chore(deps): ...`, both through the normal hooks (never `--no-verify`), and only when the regeneration touched derived paths. Git cannot add a commit to a push already running, so the push stops once with `run git push again`.
5. **Judgment gates are scaffolded, never faked.** For a feat/fix/perf range without a QA record, pre-push writes the unfilled skeleton and names the file. It never writes `PASS`, and never writes a `Docs:` trailer on the author's behalf (rule 60, rule 63).
6. **The exit 141 problem** has no hook-side fix (the connection drops while git waits). The mitigation stays `npm run gates:receipt`, which proves the tree once so pre-push skips those gates; self-heal makes the usual reason for a long pre-push, stale generated files, disappear.

`policy` stays `continue-on-error` and outside `CI success`: release never depends on an advisory job. The registry marks those entries `advisory`, and they must still go green.

## Consequences

- Plain `git commit` / `git push` is enough for format, generated files, ratchet baselines and dependency pins. Pre-commit time grows by roughly one `npm audit` (about 2 s) at most every 6 h, and a few file reads otherwise.
- A pinned override can cross a major version (ip-address 6 to 10 for geoip-country). The tool says so; the pin is verified by audit and `npm ci --dry-run`, not by the dependent's tests, so the author of the dependent still reads the line.
- Gates that need CI infrastructure (CodeQL, image scan, Redis, deploy rehearsal, Lighthouse, merged coverage) stay CI-only; the registry records why.
- Adding a CI job now requires a registry entry in the same change.

## Alternatives rejected

- Skipping or loosening the audit on a new advisory: weakens a check.
- Auto-writing allowlist entries: the reason and reviewer are the control.
- `--no-verify` for the auto-fix commits: banned (ADR-061); they run the hooks.
