# Workspace Automation — 7-day Soak Window

**Status:** Day 1 of 7 started 2026-05-02
**Gate:** `docs/16-quality-engineering/RELEASE_READY_QUALITY_GATE.md` — release readiness requires 7 consecutive days where the master harness exits 0 with no critical errors in service logs.

## Schedule

| Day | UTC date | Run command | Expected outcome | Recorded by | Status |
|---|---|---|---|---|---|
| 1 | 2026-05-02 | `bash qa/test-workspace-automation-full.sh` against running dev stack | 12/12 streams PASS, 0 critical errors | Sonnet (autonomous) | ✅ PASS — see `regression-matrix.md` row "2026-05-02 (live QA)" |
| 1b | 2026-05-09 | post-Gap-fixes re-run with `GITHUB_WEBHOOK_SECRET=testsecret bash qa/test-workspace-automation-full.sh` | 12/12 PASS, stream-11 13/13 (incl. body-cap 413 + rate-limit live) | Sonnet (autonomous) | ✅ PASS — Gap 1 closed; new migration `20260502100000_suggestion_rule_per_rule_budget` deployed; GlobalExceptionFilter body-parser fix verified |
| 2 | 2026-05-03 | same | 12/12 PASS, 0 critical errors | (operator) | ⏸ pending |
| 3 | 2026-05-04 | same | 12/12 PASS, 0 critical errors | (operator) | ⏸ pending |
| 4 | 2026-05-05 | same | 12/12 PASS, 0 critical errors | (operator) | ⏸ pending |
| 5 | 2026-05-06 | same | 12/12 PASS, 0 critical errors | (operator) | ⏸ pending |
| 6 | 2026-05-07 | same | 12/12 PASS, 0 critical errors | (operator) | ⏸ pending |
| 7 | 2026-05-08 | same | 12/12 PASS, 0 critical errors | (operator) | ⏸ pending |

## Per-day procedure

1. Bring stack up: `./scripts/claw.sh up` (waits for all containers healthy).
2. Run master harness: `bash qa/test-workspace-automation-full.sh`. Capture stdout to `qa-soak-day-N.log`.
3. Append the run row to this document with PASS/FAIL + any new defects.
4. If any stream fails: open a defect, fix, restart the soak counter from day 1.

## Soak-window auto-tools

You can schedule a recurring agent in Claude Code via `/loop 24h /run-soak` (where `/run-soak` is a slash command that runs steps 1–3). Or set a CronCreate routine that fires at 09:00 UTC daily.

## Failure-restart protocol

If on any day a stream fails or new critical errors land in service logs:

1. Pause the soak counter — capture the failed log + log line at the offending check.
2. Triage: bug or test bug? Fix root cause; update `regression-matrix.md` if a test was wrong.
3. Re-run the master harness to confirm fixed state; then restart day-1.

## What's tested each day

- All 12 per-stream QA scripts (10-approval-engine, 11-webhook-receiver, 12-auto-suggest, 13-suggestion-factory, 20, 21, 22, 23, 30, 31, 41).
- Cross-cutting docker log scan across workspace, audit, memory, chat, agent, file services for `UnhandledPromiseRejection`, `FATAL`, `Cannot read properties of undefined`.
- DB persistence checks (each stream's script asserts table-row counts after writes).
- Auth gating (admin-only endpoints reject anonymous).

## What is NOT tested in this soak (and why)

- Real GitHub-webhook signature/replay/body-cap/rate-limit live cases — currently SKIPped by stream 11 because no `WorkspaceConnector` row of provider `GITHUB` and status `CONNECTED` is provisioned in dev. To unblock: complete OAuth flow at `/workspace/providers` for GitHub, then re-run stream 11 — the SKIPs flip to live assertions automatically.
- Browser-side rendering of the new pages (`/admin/webhook-deliveries`, `/admin/ai-action-policies`, `/admin/suggestion-rules`, `/workspace/inbox`, `/workspace/semantic-search`, `/workspace/digest`, `/workspace/impl-handoffs`, `LearnedPreferencesPanel`, rewritten `GmailMessageDialog`). Recommend a one-time visual UAT on day 1 of soak.
- Real Frontier-LLM end-to-end pull/load/inference — separate `claw-llamacpp-service` flagship; awaits operator with GPU + bandwidth.

## Sign-off

After day 7 is green:

1. Update `docs/10-uat-acceptance/regression-matrix.md` "Master regression status" with a "soak complete 2026-05-08" row.
2. Update `workspace-automation-uat-execution-log.md` with the final GO row.
3. Bump `docs/16-quality-engineering/RELEASE_READY_QUALITY_GATE.md` checkbox for the workspace-automation initiative.
