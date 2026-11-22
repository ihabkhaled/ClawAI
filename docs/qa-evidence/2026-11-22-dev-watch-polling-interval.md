# QA evidence - dev-watch-polling-interval

Batch: dev-watch-polling-interval
Date: 2026-11-22
Commits: (fill in after committing)
Verdict: DONE

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                            |
| ---- | ----------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `node --test tools/__tests__/docker-dev-watch.test.mjs`: 5 pass, 0 fail. The assertion now pins `--polling-interval 2000` for every backend dev script.                                                       |
| L02  | Typecheck, lint and build (touched workspaces)                          | NOT_APPLICABLE | Only the `dev` npm script string changed in each package.json; no TypeScript, no build input and no production script changed.                                                                                |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | After clearing the Turbopack cache: `curl https://claw.local/en/login` gave 200 in 97.1 s cold, then 200 in 0.29 s and 0.21 s. Before the fix every request gave 500 with `postcss ... deadline has elapsed`. |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Dev tooling change; the page served with 200 over curl, and the UI code itself did not change.                                                                                                                |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No e2e covers dev-container file watching; the committed node test above is the guard for it.                                                                                                                 |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No authorization path touched; the change is a local development watcher interval only.                                                                                                                       |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change; the frontend source is untouched by this batch.                                                                                                                                                 |
| L08  | UAT (acceptance criteria walked as the user would)                      | PASS           | Owner ask: the dev frontend must load. Measured reading frontend src over the share: 147 s before, 9 s with backends paused, 22-51 s after the fix; the login page now loads.                                 |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | Polling stays on because `inotifywait` in a container saw no event when a host file was written; nodemon running after restart shows `--polling-interval 2000` in its command line.                           |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or user-facing copy is involved in a dev watcher interval.                                                                                                                                    |
| L11  | Regression (neighbouring features still work)                           | PASS           | `touch apps/claw-audit-service/src/main.ts`, then the audit-service log within 8 s: `[nodemon] restarting due to changes...` and `starting npm run build && node dist/main.js`. Edits still reload.           |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | No secret read or written; the temporary environment dump made during diagnosis was deleted and its absence checked with `ls`.                                                                                |
| L13  | Performance and accessibility                                           | PASS           | Docker VM load average dropped from 88 to 57; file share reads 147 s to 51 s worst case.                                                                                                                      |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing string was added or changed by this batch.                                                                                                                                                     |
| L15  | Docs, knowledge delta and GitHub gates read                             | PASS           | build-system.md section 4 explains why the interval is load-bearing and how to clear the cached Turbopack failure.                                                                                            |

Frontend edit pickup (`watchOptions.pollIntervalMs: 2000`, dev only): after
`./scripts/claw.sh --dev service:rebuild frontend` (exit 0), a marker added to the existing
`src/app/(auth)/login/page.tsx` was served by `curl https://claw.local/en/login` 14 s after the
save, with the log line `✓ Compiled in 16.6s` and no container restart. The file was restored
afterwards and `git status` showed it clean.

## Findings

The 500 was not frontend code: 22 backend containers polled ~7,000 files every 100 ms over Docker
Desktop's file share. Turbopack also caches the failed PostCSS result in the `.next` volume, so the
error outlives the cause until that cache is cleared.

## Open gaps

- Reads are still slower than with everything paused (51 s against 9 s). Moving the repo to WSL 2 or
  using Docker synchronized file shares would remove polling entirely; that is an owner decision.
