# QA evidence - unknown-named-media-model-plan-check

Batch: unknown-named-media-model-plan-check
Date: 2026-11-01
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

Scope: one authorization path in the chat media tool loop. When the user names a media model that is
not in the catalog and the classifiers cannot infer a single target, the loop used the raw fallback
list without a plan check. Every fallback target is now checked with the same plan access call; none
allowed means the call is refused and no generation starts. Found by the automated security review
of 1c4b25137.

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `npx vitest run src/modules/chat-messages/__tests__/media-tool-loop.manager.spec.ts` in apps/claw-chat-service: 1 file, 43 tests passed. The added case checks that startMedia is never called when the plan denies every target of an unknown model name. |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `npx tsc --noEmit -p tsconfig.json` printed nothing (clean); `npx eslint --max-warnings 0` on the manager and its spec printed nothing (clean).                                                                                                            |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | Needs a plan whose access list excludes a named media model; no such account is set up locally. The branch is covered by the spec above.                                                                                                                   |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Backend authorization path; no UI change.                                                                                                                                                                                                                  |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No e2e covers the media loop; the unit spec covers the rule.                                                                                                                                                                                               |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | The refusal is unit-tested with an access mock; a real restricted plan is checked on production after deploy.                                                                                                                                              |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                                                              |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner walk-through pending after deploy.                                                                                                                                                                                                                   |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | A named model the plan denies gets a clear 'not in your plan' tool error and is never swapped for another; an unknown name only reaches targets the plan allows.                                                                                           |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or copy change.                                                                                                                                                                                                                            |
| L11  | Regression (neighbouring features still work)                           | PASS           | The other 42 loop specs pass, including catalog candidates, named-model honoring and the constants fallback on a catalog outage.                                                                                                                           |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Closes the plan-gate parity finding on the unknown-name branch; a failed plan lookup already refuses.                                                                                                                                                      |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | One plan check per fallback target, in parallel, only on the unknown-name path.                                                                                                                                                                            |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text.                                                                                                                                                                                                                                       |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Knowledge delta: none, because the chat CLAUDE.md already states that a named model is plan-checked. GitHub CI has not been read yet.                                                                                                                      |

## Findings

The review noted that the single-target plan check left the multi-target fallback list unchecked.
Fixed by checking every target.

## Open gaps

- L03/L06: confirm with a restricted plan on production after deploy.
- L08: owner walk-through after deploy.
