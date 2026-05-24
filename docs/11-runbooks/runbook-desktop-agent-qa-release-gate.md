# Runbook — Desktop Agent QA / UAT / Release Gate Matrix

> Owner: Desktop Agent V2 Stream 12
> Added: 2026-05-24

This runbook lists every check that MUST pass before a desktop-agent
release is promoted across channels. Operators run this checklist
against a fresh stack-rebuild environment before tagging
`desktop-agent-v*` and pushing.

## Per-channel quality bar

| Stage                              | canary | beta  | stable |
| ---------------------------------- | :----: | :---: | :----: |
| Lint (`npm run lint`)              |   ✔    |   ✔   |   ✔    |
| Typecheck (`npm run typecheck`)    |   ✔    |   ✔   |   ✔    |
| Unit tests (`npm test`)            |   ✔    |   ✔   |   ✔    |
| Coverage ≥ 92% per service         |   ✔    |   ✔   |   ✔    |
| `qa/test-stream-10-capability-framework.sh`   |   ✔    |   ✔   |   ✔    |
| `qa/test-stream-13-recipes-crud.sh`           |   —    |   ✔   |   ✔    |
| `qa/test-stream-13-runner-live.sh`            |   —    |   ✔   |   ✔    |
| `qa/test-stream-13-runner-v2.sh`              |   —    |   ✔   |   ✔    |
| `qa/test-stream-13-runner-retry-fallback.sh`  |   —    |   ✔   |   ✔    |
| `qa/test-foundation-closeout.sh` (V2 Stream 01)|  —    |   ✔   |   ✔    |
| `qa/test-providers-cross-os.sh` (Windows)     |   —    |   —   |   ✔    |
| `qa/test-providers-cross-os.sh` (macOS)       |   —    |   —   |   ✔    |
| `qa/test-providers-cross-os.sh` (Linux)       |   —    |   —   |   ✔    |
| Manual recipe golden-path UAT                 |   —    |   ✔   |   ✔    |
| Manual marketplace install UAT                |   —    |   —   |   ✔    |
| Manual SAML SSO callback against mock IdP     |   —    |   —   |   ✔    |
| Tauri bundle smoke (open app → tray → palette → approve a capability)|—|✔|✔|
| Tauri auto-update self-test                   |   —    |   —   |   ✔    |
| Soak: 7 days no `[dual-write]` divergence WARN|   —    |   —   |   ✔    |
| `runbook-cross-os-evidence.md` checklist filed|   —    |   —   |   ✔    |
| ADR review for any new HARD_DENYLIST entry    |   ✔    |   ✔   |   ✔    |

## Regression matrix — when a stream changes, re-run these

| Stream changed              | Mandatory regression suite                                      |
| --------------------------- | --------------------------------------------------------------- |
| 01 (foundation/dual-write)  | foundation-closeout + capability-framework + agent-service      |
| 02 (provider hardening)     | providers-cross-os on the operator's OS + provider smoke harness |
| 03 (recipe runner)          | recipes-crud + runner-live + runner-v2 + runner-retry-fallback  |
| 04 (Tauri shell)            | Tauri bundle smoke + auto-update self-test (canary channel)     |
| 05 (activity-memory + suggestions)| sync-loop smoke + suggestions cron one-shot (`node -e "require('./apps/.../agent-suggestion.manager').scanAndEmit()"`) |
| 06 (marketplace)            | marketplace publish + install + analyse + publisher portal CRUD |
| 07 (fleet SSO + governance) | SAML mock IdP + device matrix endpoint + fleet RBAC scopes      |
| 08 (live UX)                | SSE event delivery + bulk-approve happy + bulk-approve partial-fail |
| 09 (OS control add-ons)     | SYSTEM provider probes + LOCK/SUSPEND/NETWORK_INFO smoke         |
| 10 (release channels)       | dry-run of Tauri build pipeline (no signing) — verify artifacts  |
| 11 (security/privacy)       | redact-path smoke (POST a known-secret payload → grep logs for `[REDACTED]`) + denylist regression (POST a forbidden tuple → expect 422) |
| 12 (this file)              | run every script listed above                                    |

## How to run the full master harness

```bash
# All live-stack scripts, one-shot:
bash qa/test-desktop-agent-master.sh

# Cross-OS smoke (one per OS):
#   Windows: Git Bash → bash qa/test-providers-cross-os.sh
#   macOS:   Terminal  → bash qa/test-providers-cross-os.sh
#   Linux:   any shell → bash qa/test-providers-cross-os.sh
# Output → ./provider-evidence-<os>.md; file at
# .claude/Integrations/cross-os-evidence/<date>-stream-12-<os>.md
```

## What "release-blocking" means

Per CLAUDE.md "What Claude Treats as Blockers":

- Any failed test in the suites above
- Any `UnhandledPromiseRejection` or `FATAL` in claw-agent-service
  or claw-audit-service logs during the QA run
- Any divergence row added to `GET /agent/capabilities/dual-write-status`
  during a known-good command run (means a policy regression was shipped)
- Missing cross-OS evidence file for ANY healthy provider on ANY OS
- Missing redact-path coverage for a new request body field that
  could carry credentials

## Sign-off

The release-engineer must paste the output of the full master harness
(or summarised PASS/FAIL counts per script) into the GitHub PR or
release-tagging Linear ticket before promoting beta → stable.

## See also

- `docs/16-quality-engineering/RELEASE_READY_QUALITY_GATE.md`
- `docs/11-runbooks/runbook-cross-os-evidence.md`
- `docs/11-runbooks/runbook-desktop-agent-release-channels.md`
- `docs/11-runbooks/runbook-desktop-agent-security.md`
