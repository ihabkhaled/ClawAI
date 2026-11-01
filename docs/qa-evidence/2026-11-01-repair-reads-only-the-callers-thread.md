# QA evidence - repair-reads-only-the-callers-thread

Batch: repair-reads-only-the-callers-thread
Date: 2026-11-01
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

Scope: answer repair loaded the message named by `messageId` without checking it belongs to the
caller's thread, for its text and, since the media batch, for the media it preserves. Found by the
automated security review of e6dd8726e. Now `findSourceInThread` returns the message only when its
threadId equals the thread resolved for the user; any other id reads as missing.

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `npx vitest run src/__tests__/answer-repair.manager.spec.ts src/modules/chat-messages/__tests__/media-final-step.spec.ts` in apps/claw-chat-service: 2 files, 86 tests passed, including the new 'reads a message id only inside the caller thread, never another thread'. |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `npx tsc --noEmit -p tsconfig.json` printed nothing (clean); `npx eslint --max-warnings 0` on the manager and its spec printed nothing (clean).                                                                                                                            |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | The repair surface accepts only local Ollama models and none is available locally, so the endpoint cannot be driven live. Covered by the spec above.                                                                                                                       |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Backend lookup scoping only; no UI change.                                                                                                                                                                                                                                 |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No e2e covers repair; the unit spec covers the rule.                                                                                                                                                                                                                       |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | Ownership scoping only; plan gates are untouched.                                                                                                                                                                                                                          |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                                                                              |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner walk-through pending after deploy.                                                                                                                                                                                                                                   |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | A repair with the message in its own thread still resolves content and keeps the media (existing specs updated to carry the thread id); a message from another thread is treated as missing and the request fails with the existing error.                                 |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or copy change.                                                                                                                                                                                                                                            |
| L11  | Regression (neighbouring features still work)                           | PASS           | The 39 repair specs pass, and the 47 final-step specs still pass beside them.                                                                                                                                                                                              |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Closes the IDOR finding: the text lookup (already unscoped before this batch) and the media lookup are both scoped to the caller's thread.                                                                                                                                 |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | One extra comparison on a lookup already made.                                                                                                                                                                                                                             |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text.                                                                                                                                                                                                                                                       |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Knowledge delta: none, because no doc describes the lookup. GitHub CI has not been read yet.                                                                                                                                                                               |

## Findings

The text lookup in resolveOriginalContent predates the media batch; the media preservation copied
it. Both fixed together.

## Open gaps

- L03: needs an Ollama-enabled run of the repair surface.
- L08: owner walk-through after deploy.
