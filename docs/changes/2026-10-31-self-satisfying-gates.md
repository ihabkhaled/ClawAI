# Change - Gates satisfy themselves on a plain commit and push

Date: 2026-10-31. Decision: [ADR-202](../13-adr/adr-202-every-gate-is-satisfied-by-plain-git-commit-and-push.md).

## Why

CI went red for reasons no one should have to remember: a new npm advisory, stale count fragments in docs, ratchet baselines that needed a manual run.

## What changed

- `tools/gates/registry.mjs` plus `tools/__tests__/gate-registry.test.mjs`: every CI job and policy step has a local enforcement point and an auto-fix or a stated human reason.
- `tools/gates/autosync.mjs` (pre-commit step 3 of 5): prunes dead format/lint baseline entries, records declared coverage thresholds, runs the dependency auto-fix. Each prints one `autosync:` line and is staged.
- `tools/affected/index.mjs`: the knowledge step stages the docs whose `<!-- count:x -->` fragments it rewrote. This was the cause of `stale count fragment` at pre-push.
- `tools/security/audit-fix.mjs` (`npm run security:fix`): pins the patched release of a new high/critical production advisory and verifies the lockfile. `.github/workflows/dependency-remediation.yml` runs it daily.
- `tools/gates/self-heal.mjs` (pre-push): commits regenerated files / dependency pins through the hooks and stops once; scaffolds, but never fills, a missing QA record.
- `package.json` override `ip-address ^10.7.5` (lockfile updated) clears GHSA-mwp4-54f8-5fhr, reached through `geoip-country`.

## Not automatic, and why

QA evidence content, the `Docs:` trailer, secrets, failing tests, type errors, and an advisory with no patched release (needs a reviewed allowlist entry with an expiry).

## Rollback

Remove the `autosync.mjs` line from `.husky/pre-commit` and the heal block in `tools/gates/pre-push.mjs`; the registry test then fails and names what to update.
