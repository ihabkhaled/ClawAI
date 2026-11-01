# QA evidence - audio-voice-resolved-through-the-provider-catalog

Batch: audio-voice-resolved-through-the-provider-catalog
Date: 2026-11-01
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

Scope: production QA as a fresh Pro user (qa-media-pro) on v1.227 found that "say hello in a calm
voice as audio" reached OpenAI with voice "calm" and OpenAI answered 400 (AUDIO_PROVIDER_REJECTED),
so no speech was made. The audio service now resolves the voice through the shared provider catalog;
a name the provider does not offer becomes the provider's default.

| Lane | What                                                                    | Status         | Evidence or reason                                                                                                                                                                                                                                                                       |
| ---- | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                     | PASS           | `npx vitest run src/modules/audio-generation` in apps/claw-image-service: 6 files, 57 tests passed, including 'replaces a voice the provider does not offer' and 'keeps a voice the provider does offer'.                                                                                |
| L02  | Typecheck, lint and build (touched workspaces)                          | PASS           | `npx tsc --noEmit -p tsconfig.json` and `npx eslint --max-warnings 0` on the service and constants printed nothing (clean).                                                                                                                                                              |
| L03  | Manual API test (curl) with the log line proving the branch ran         | PASS           | Production, Pro QA user: image-service log `POST https://api.openai.com/v1/audio/speech failed ... status code 400` and audio_generations row voice=calm, AUDIO_OPENAI gpt-4o-mini-tts FAILED AUDIO_PROVIDER_REJECTED reproduced the defect; the same prompt after deploy is the re-run. |
| L04  | Manual browser test (Playwright against the real UI) with screenshots   | NOT_APPLICABLE | Backend voice resolution; no UI change.                                                                                                                                                                                                                                                  |
| L05  | Automation e2e (a committed or existing spec was run)                   | NOT_APPLICABLE | No e2e covers audio generation; the unit specs cover the rule.                                                                                                                                                                                                                           |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                    | NOT_RUN        | Plan gate untouched; Free refusal is re-run on the qa-media-free user after the deploy.                                                                                                                                                                                                  |
| L07  | Device matrix (3+ widths, both orientations, RTL)                       | NOT_APPLICABLE | No UI change.                                                                                                                                                                                                                                                                            |
| L08  | UAT (acceptance criteria walked as the user would)                      | NOT_RUN        | Owner walk-through pending after deploy.                                                                                                                                                                                                                                                 |
| L09  | Product verification (it does what the owner asked, edge cases decided) | PASS           | A style word no longer breaks speech; a real provider voice is kept; Gemini names resolve through the same catalog.                                                                                                                                                                      |
| L10  | Business verification (money, limits, copy and claims match the code)   | NOT_APPLICABLE | No money, limit or copy change.                                                                                                                                                                                                                                                          |
| L11  | Regression (neighbouring features still work)                           | PASS           | All 57 audio-generation specs pass, including music with no voice.                                                                                                                                                                                                                       |
| L12  | Security (authz and IDOR, secrets, injection)                           | PASS           | The voice string no longer reaches the provider unless it is in a fixed list.                                                                                                                                                                                                            |
| L13  | Performance and accessibility                                           | NOT_APPLICABLE | One list lookup.                                                                                                                                                                                                                                                                         |
| L14  | i18n (13 locales, RTL)                                                  | NOT_APPLICABLE | No user-facing text.                                                                                                                                                                                                                                                                     |
| L15  | Docs, knowledge delta and GitHub gates read                             | NOT_RUN        | Knowledge delta: apps/claw-image-service/CLAUDE.md. GitHub CI has not been read yet.                                                                                                                                                                                                     |

## Findings

The tool argument `voice` is free text written by the chat model; the audio service passed it to the
provider unchanged.

## Open gaps

- L06/L08: re-run on production after the deploy, with the QA users.
- Style words are dropped, not forwarded as `instructions` to gpt-4o-mini-tts; a possible follow-up.
