# 54 — A completion claim needs observable evidence

**Status:** active · **Owner:** platform · **Added:** 2026-09-20

**Applies to**: every task, every batch, every status update that uses the
word "done", "fixed", "passing", "verified", or "ready".

**Related**: [rules/44](44-live-verification-before-done.md) (nothing is done
until it has been seen running) · [rules/49](49-qa-team-discipline-and-test-evidence.md)
(who you must be while you look, and what evidence each hat produces) ·
[rules/31](31-anti-gaming-and-semantic-compliance.md) (never weaken a check to
pass it) · [rules/34](34-gate-economy-and-machine-resources.md) (gate once,
for real) · [skills/keep-an-agent-honest.md](../skills/keep-an-agent-honest.md)
(the runbook for applying this without the AI-Psychiatry plugin installed).

## The rule

This file is the source-of-truth restatement of a discipline this repo
already expects: a claim of completion is a factual assertion about the
world, and it must be backed by something observable, not by confidence in
the diff. Rules 44 and 49 already say **what** must be checked (the running
stack, both lanes, every QA hat) and **who** you must be while checking it.
This rule states the three non-negotiables that make those checks honest
rather than theatrical, and exists because "the code looks right" is not the
same claim as "the code was run and did the right thing" — and only the
second one may ever be reported as done.

## The three non-negotiables

### 1. A completion claim needs observable evidence

"Done" is not a feeling about the diff. It is a claim that must point at one
of: a command's actual pasted output, an exit code you actually read, a
screenshot from a live pass, a log line that names the branch that ran, or a
`curl` response body — the same evidence categories rules 44 and 49 already
define. A completion claim with no evidence attached is not a completion
claim; it is a guess wearing the word "done".

### 2. A lane you could not run is reported as not run

If the browser lane, the API lane, a device in the responsive matrix, or a
role in the RBAC sweep could not be exercised — no live stack, no credential,
no device — say exactly that and name why. Silently omitting an unrun lane, or
folding it into "the rest looks fine", is a false completeness claim even if
every word in it is individually true.

### 3. Never weaken a check to pass it, and never claim a test passed without its output

Loosening an assertion, deleting a failing test case, adding a suppression
(`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, a widened `any`) to clear
a gate, or reporting a test suite as green without having actually run it and
seen the result, are the same violation: making the signal lie instead of
making the code correct. [`rules/31`](31-anti-gaming-and-semantic-compliance.md)
already prohibits gaming a check; this rule adds that the report itself must
match what the check actually said, every time, with no exceptions for
"probably still passes" after an unrelated edit.

## What this does not add

This rule does not introduce a new gate, a new script, or a new lane. It
governs the **honesty of the report** about lanes and gates that
[rules/44](44-live-verification-before-done.md) and
[rules/49](49-qa-team-discipline-and-test-evidence.md) already require. Read
those two for the mechanics of what to run; read this one for what you are
allowed to say about the result.

## Enforcement

- **Live verification and QA discipline** — the mechanics this rule's claims
  must be true of are defined and enforced by
  [`rules/44-live-verification-before-done.md`](44-live-verification-before-done.md)
  and [`rules/49-qa-team-discipline-and-test-evidence.md`](49-qa-team-discipline-and-test-evidence.md).
- **Pre-commit hook** — runs the scoped gates (lint, typecheck, test, build)
  for touched workspaces before a commit lands; a commit claiming green
  without having run it is caught the moment the hook actually runs, per
  [`rules/23-git-commits-hooks-and-release-gates.md`](23-git-commits-hooks-and-release-gates.md).
  Bypassing it is separately and absolutely prohibited under
  [ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md).
- **`tools/__tests__`** — machine checks that catch specific instances of an
  unbacked claim (e.g. `tools/__tests__/prisma-migrations-present.test.mjs`
  catches "the migration ships" without a migration file on disk).
- **`npm run knowledge:coverage` / `knowledge:build` / `knowledge:verify`** —
  catch a knowledge-delta claim (a rule, skill, or index entry said to exist)
  that is not actually reachable or not actually regenerated, per
  [`rules/33-knowledge-compounding-and-context-velocity.md`](33-knowledge-compounding-and-context-velocity.md)
  and [`rules/24-generated-files-and-knowledge-freshness.md`](24-generated-files-and-knowledge-freshness.md).

## Definition of done

- [ ] Every "done"/"fixed"/"passing"/"verified" claim in a status update is
      backed by evidence in the categories above, not by inference.
- [ ] Every lane that was not run is named as not run, with the reason.
- [ ] No check was weakened, suppressed, or skipped to make it pass.
