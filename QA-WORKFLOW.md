# QA workflow - read this before you call anything done

This file is for everyone: a new developer, a person who just opened the project, any AI (Claude,
Codex, Cursor, Gemini, Kimi, GLM, Qwen, DeepSeek, Mistral, or one that does not exist yet).

**Rule in one sentence:** a change is not done until it has been tested by hand in a real browser and
with real API calls, across roles, plans and screen sizes, and the results are written down. Unit
tests are the floor, not the finish line.

## What to do, in order

1. **Before you start**: `npm run knowledge:context -- --task="<what you are doing>"`, then read the
   rules it names. Read [rules/60](rules/60-qa-evidence-is-mandatory-and-machine-checked.md).
2. **Open the record**: `npm run qa:evidence:new -- <short-name>`. It creates
   `docs/qa-evidence/<date>-<short-name>.md` with the fifteen lanes.
3. **Build the change** (shared code, never a copy: [rules/59](rules/59-chat-surfaces-are-one-pipeline.md)).
4. **Walk the fifteen lanes** (`npm run qa:evidence:lanes`). The how-to for each is in
   [skills/run-the-qa-team.md](skills/run-the-qa-team.md). The two people forget most:
   - **API by hand (L03)**: log in, call the real endpoint with `curl`, read the service log and find
     the line that proves your new code ran. A 200 alone proves nothing.
   - **Browser by hand (L04)**: open https://claw.local, do the thing a user does with Playwright,
     take a screenshot, look at it yourself. Repeat at phone, tablet and desktop widths, in both
     orientations and in Arabic (right-to-left). Do it as admin, as a paid user and as a FREE user.
5. **Fill the record**: every lane PASS (with the real command and output), FAIL, NOT_RUN or
   NOT_APPLICABLE (each with a reason). Verdict `DONE` only if nothing is open; otherwise `PARTIAL`.
6. **Check it**: `npm run qa:evidence:check -- docs/qa-evidence/<file>.md`.
7. **Clean up** the test data you created (through the API) and say so in the record.
8. **Land it**: lint and test only changed files, commit (hooks run), pull, push, then read
   `gh run list --branch main` and fix anything red ([rules/48](rules/48-lint-and-test-only-what-changed.md)).
9. **Write the knowledge**: rules, skills, docs, context, memory, wiki in the SAME commit
   ([rules/33](rules/33-knowledge-compounding-and-context-velocity.md)).

## What the machine checks

CI fails a push or pull request that contains a `feat`, `fix` or `perf` commit touching product
source without a valid evidence record in the same change. It also rejects a record with a blank
lane, a PASS with no evidence, an assumption written as a result, or `DONE` over an open lane.

## What "reporting honestly" means

Saying "L04 NOT_RUN, no browser could open in this session" is fine. Saying "tested" when you only
ran unit tests is not. If you are an AI and you skipped a lane, write it in the record and in your
final message.

Where everything else is: [CLAUDE.md](CLAUDE.md) - [rules/README.md](rules/README.md) -
[skills/00-index.md](skills/00-index.md) - [docs/16-quality-engineering/](docs/16-quality-engineering/) -
[docs/qa-evidence/README.md](docs/qa-evidence/README.md).
