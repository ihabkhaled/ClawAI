# QA evidence - bill-gpt-4o-mini-tts-by-tokens-so-speech

Batch: bill-gpt-4o-mini-tts-by-tokens-so-speech
Date: 2026-11-01
Commits: 9d843dd1b
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

Scope: one metering rule in image-service audio generation. Only tts-1 and tts-1-hd bill per
character; gpt-4o-mini-tts bills by tokens against its seeded token price and settles on the hold's
own estimate. Found by the automated security review of the media batch (30896c063). The wider
feature record is docs/qa-evidence/2026-10-31-chat-models-make-media.md.

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `npx vitest run src/modules/audio-generation` in apps/claw-image-service: 6 files, 55 tests passed, including audioMeterMode('SPEECH','AUDIO_OPENAI','tts-1') = CHARACTERS and 'gpt-4o-mini-tts' = TOKENS.     |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | The pre-commit hook ran eslint --max-warnings 0 and the affected typecheck on claw-image-service: `claw-image-service pass`, `pre-commit OK`.                                                                  |
| L03  | Manual API test (curl) with the log line proving the branch ran         | NOT_RUN        | OpenAI audio auth is down locally (AUDIO_PROVIDER_AUTH_FAILED), so no speech call can reach the metering branch live. Covered by the spec above; production check after deploy.                                |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Backend metering rule only; no UI change.                                                                                                                                                                      |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No e2e covers audio; unit spec covers the rule.                                                                                                                                                                |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_APPLICABLE | No access rule changed; the plan gate is untouched.                                                                                                                                                            |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                  |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner walk-through of the whole media feature is pending after deploy.                                                                                                                                         |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | The reviewer's finding was verified in the code: the seeded gpt-4o-mini-tts row has token rates only, and the character path would have priced it at a missing rate. Now it meters tokens.                     |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_RUN        | Estimate settlement over-reserves by design; the owner confirms the audio token estimate constant after seeing real usage.                                                                                     |
| L11  | Regression (neighbouring features still work)                           | PASS           | The same 55 audio specs include tts-1 per-character and Gemini token metering; image and video specs were not touched.                                                                                         |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | Closes the billing-bypass finding from the automated review (metering mismatch). No authz or secret change.                                                                                                    |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | No runtime path or UI change beyond a branch condition.                                                                                                                                                        |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text.                                                                                                                                                                                           |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | The price-table comment in audio-payg.constants.ts is updated and no doc states per-character billing for gpt-4o-mini-tts (knowledge delta: none). GitHub CI has not been read yet; it is read after the push. |

## Findings

The security review flagged that every OpenAI audio model was metered per character, while
gpt-4o-mini-tts has only a per-token price. Fixed in 9d843dd1b.

## Open gaps

- L03: confirm on production once an OpenAI key works there.
- L08/L10: owner walk-through and estimate review after deploy.
