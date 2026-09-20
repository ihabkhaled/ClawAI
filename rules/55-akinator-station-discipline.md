# 55 — Akinator station discipline

**Status:** active · **Owner:** knowledge-layer · **Added:** 2026-09-20

> Ported from the Akinator method (https://github.com/ihabkhaled/akinator-ai,
> `skills/everything/SKILL.md`). This rule is the non-negotiable subset,
> restated in ClawAI's own vocabulary so it applies whether or not the
> `akinator` plugin is installed in the session. Full runbook:
> [`skills/apply-akinator-without-the-plugin.md`](../skills/apply-akinator-without-the-plugin.md).

## The rule

A change is the code **plus** the knowledge that lets the next agent act on it
in seconds. Half a change — code with the documentation, skill, rule, context
or memory update deferred to "a follow-up" — is no change. This is not new: it
restates `CLAUDE.md`'s "NEVER ship a change with no knowledge delta" and
`rules/33-knowledge-compounding-and-context-velocity.md` in station form, and
adds the ASK and AUDIT disciplines that were missing.

## What must happen, every task that can change the repository

1. **Ask before assuming.** Before planning, raise every genuine ambiguity in
   one grouped, ranked message — each question carrying the answer you would
   pick as a default, so "go with recommendations" is a complete reply. Do not
   interrupt mid-implementation for something askable at the start.
2. **Audit claim versus code before planning on top of it.** "Already done" is
   checked, not assumed. A function that exists but has no live caller is
   **present-but-not-wired**, which behaves as MISSING, not DONE.
3. **Declare the knowledge delta by path at plan time.** Before writing code,
   name the `docs/`, `skills/`, `rules/`, `context/`, `memory/`, `wiki/` paths
   the batch will create or update — or write `knowledge delta: none — <reason>`
   for genuinely trivial work.
4. **Same-batch knowledge.** Documentation, skills, rules, context and memory
   updates land in the **same commit** as the code they describe, never a
   follow-up.
5. **Never guess on money, permissions, deletion, security, or a public
   contract.** Stop and ask, or cite the existing rule that already answers it
   (`rules/16`, `rules/21`, `rules/28`, `rules/37`, `CLAUDE.md`'s money facts).
6. **Gate once, late, scoped.** No gate-per-edit, no all-workspace gate on a
   scoped change — this is already `rules/34-gate-economy-and-machine-resources.md`;
   this rule just applies it to knowledge work too (don't re-run
   `knowledge:coverage` per file either).
7. **Honest gaps.** An unanswered question is written as
   `_Unknown — ask the owner and record the answer._`, never an invented fact.
   A gate that wasn't run is reported as not run, never assumed green.

## Prohibited

- Marking a task done with no artifact behind the tick (a rule with no
  Enforcement section that names something real, a skill nobody could follow,
  a doc that restates the code with no why).
- Adding a rule, skill, or context file that is not reachable from its index —
  `npm run knowledge:coverage` treats unreachable as nonexistent.
- Weakening `npm run knowledge:coverage`, a lint rule, or a test to make a
  compliance claim pass instead of making the claim true.
- Putting a knowledge check inside a git hook that is meant to stay fast — the
  hook regenerates and verifies generated artifacts (rule 24); it does not run
  `knowledge:coverage`.

## Enforcement

- `npm run knowledge:coverage` — fails when a rule/skill/context file added
  under this discipline is unreachable from its index, or when a rule names no
  real enforcement mechanism (`rule-enforcement` check).
- `npm run knowledge:test` / `npm run knowledge:verify` — regenerate and verify
  the `.ai/` manifests that prove the knowledge layer's hashes match the tree;
  run as part of the existing pre-commit hook and CI (see
  `rules/24-generated-files-and-knowledge-freshness.md`).
- `tools/__tests__` — the test suite backing the knowledge tooling itself; a
  new station artifact that breaks a `tools/__tests__` invariant (dead link,
  missing index row, missing enforcement mention) fails there before CI.
- The pre-commit hook — runs `knowledge:build` after lint-staged, so a
  hand-edited generated file or a missing index row is caught before the
  commit lands (`rules/23-git-commits-hooks-and-release-gates.md`).

## Definition of done

- [ ] The task's questions were asked once, grouped, ranked, defaulted — or the
      task was genuinely trivial and that is stated.
- [ ] Any claimed-existing capability was audited against the code, not assumed.
- [ ] The knowledge delta was declared by path before implementation started.
- [ ] Every path in that delta exists, is reachable from its index, and
      `npm run knowledge:coverage --silent` was run and its exact output
      reported.
- [ ] Nothing on money, permissions, deletion, security, or a public contract
      was guessed.
