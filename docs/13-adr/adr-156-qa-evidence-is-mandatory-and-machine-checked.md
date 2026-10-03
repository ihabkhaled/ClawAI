# ADR-156 - QA evidence is mandatory and machine-checked

**Status:** Accepted - **Date:** 2026-10-03 - **Owner direction:** chat, 2026-10-03

## Context

Rules 44 and 49, the QE standards and the run-the-qa-team skill already required manual API and browser testing,
RBAC across plans, UAT, a device matrix and evidence. They were advice. In practice they were skipped, in the same
chat and in new ones, and the owner had to ask for them again after a batch was declared finished on unit tests.

## Decision

1. A fixed list of fifteen lanes (L01-L15) is the definition of "tested". Unit tests are L01 only.
2. One record per batch at `docs/qa-evidence/<date>-<slug>.md`, with a status and real evidence or a reason per
   lane. Verdict DONE is allowed only with no NOT_RUN or FAIL lane.
3. `tools/qa/evidence.mjs` validates records and checks a commit range: a `feat`/`fix`/`perf` commit touching product
   source needs a valid record in the same range. CI (`ai-native-os` -> `qa-evidence`) runs it on every push and PR.
4. `QA-WORKFLOW.md` at the repository root is the plain-language entry point for people and every AI; every router,
   the root policy, the rules index, the skills, the context map, the wiki and memory point to it.

## Consequences

- A change cannot land as a feat or fix without a record; an honest PARTIAL record is accepted and lists its gaps.
- The check is structural (every lane present, evidence present, no placeholder, no DONE over an open lane). It cannot
  prove the evidence is true; review and the owner remain the check on truth.
- Cost: a few minutes per batch; the lanes are run scoped, one surface class per lane (rules/48).
