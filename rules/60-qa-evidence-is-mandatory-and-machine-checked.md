# 60 - No change is done without walking every QA lane and recording the evidence

**Status:** active, **STRICT** - **Owner:** quality - **Introduced:** 2026-10-03 - **ADR:** [ADR-156](../docs/13-adr/adr-156-qa-evidence-is-mandatory-and-machine-checked.md)
**Plain-language entry point:** [QA-WORKFLOW.md](../QA-WORKFLOW.md) - **Runbook:** [skills/run-the-qa-team.md](../skills/run-the-qa-team.md)
**Extends:** [rules/44](44-live-verification-before-done.md), [rules/49](49-qa-team-discipline-and-test-evidence.md)

Unit tests are the floor. The owner has said it repeatedly and it kept being skipped, in the same
chat and in new ones: **every change is walked as the whole QA team, with real evidence, before it
is called done.** This rule turns that from advice into a record that is machine-checked.

## The fifteen lanes (every one, every batch)

`npm run qa:evidence:lanes` prints them. L01 unit and integration (changed files only) - L02
typecheck, lint, build - **L03 manual API test (curl) with the log line proving the branch ran** -
**L04 manual browser test (Playwright on the real UI) with screenshots** - L05 automation e2e - L06
RBAC across roles AND plan tiers (free included) - L07 device matrix (3+ widths, both orientations,
RTL) - L08 UAT (acceptance criteria walked as the user) - L09 product verification (does it do what
the owner asked) - L10 business verification (money, limits, copy, claims match the code) - L11
regression - L12 security (authz/IDOR, secrets, injection) - L13 performance and accessibility - L14
i18n (13 locales) - L15 docs, knowledge delta, GitHub gates read.

## The rules

1. **One record per batch**: `npm run qa:evidence:new -- <slug>` creates
   `docs/qa-evidence/<date>-<slug>.md`. All fifteen lanes are filled in. Nothing is left blank.
2. **A lane is PASS, FAIL, NOT_RUN or NOT_APPLICABLE.** PASS needs the command and its real output,
   a count, a path or a screenshot name. NOT_RUN and NOT_APPLICABLE need a reason. A placeholder,
   an assumption or "should work" is rejected by the checker.
3. **Verdict DONE only when no lane is NOT_RUN or FAIL.** Otherwise the verdict is PARTIAL and the
   open lanes are listed as gaps with an owner. Reporting PARTIAL honestly is always allowed;
   reporting DONE over an open lane is a prohibited sentence.
4. **Unit tests alone never make a batch done.** L03 and L04 are the two lanes that were skipped
   most. A UI change without a Playwright pass on the real UI, or an API change without a curl and
   the log line, is PARTIAL by definition.
5. **The checker is the mechanism.** `node tools/qa/evidence.mjs check <file>` validates a record;
   `check --range A..B` fails when a feat/fix/perf commit that touches `apps/*/src`, `apps/*/prisma`
   or `packages/*/src` has no valid record changed in the same range. CI runs it on every push and
   pull request (`ai-native-os` -> `qa-evidence`). Its tests: `tools/__tests__/qa-evidence.test.mjs`.
6. **Cheap does not mean skipped.** Gate economy (rules/34, rules/48) removes duplicate work, never a
   lane: run the lanes scoped (one surface class per lane, a few real calls), not at full scale.
   If a lane truly cannot run (no visible browser, an external account is empty), say NOT_RUN with
   the reason and what would close it.
7. **Same rules for every agent and person.** Claude, Codex, Cursor, Gemini, Kimi, GLM, Qwen,
   DeepSeek, Mistral and a human developer all start at [QA-WORKFLOW.md](../QA-WORKFLOW.md); every
   router carries this rule.
8. **Test data is cleaned.** A QA run deletes what it created, through the API, and says so in the record.

## What it costs when ignored

2026-10-03: a 14-item batch shipped with unit tests, a streaming bug the browser lane found only
because the owner asked, red CI that a Runtime V2 job would have shown, and no record of which lanes
ran. The owner had to ask three times for the lanes that already existed in rules/49.

Related: [rules/04](04-testing-rules.md), [rules/22](22-testing-and-coverage.md),
[docs/16-quality-engineering/](../docs/16-quality-engineering/), [context/testing-map.md](../context/testing-map.md).
