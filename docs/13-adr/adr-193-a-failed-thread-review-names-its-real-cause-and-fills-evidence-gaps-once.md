# ADR-193: A failed Thread review names its real cause and fills evidence gaps once

**Status:** Accepted
**Date:** 2026-10-27

## Context

Production, 2026-10-27, Thread review `cmvnq79c3002d01s780nw00lz` (an Arabic research article):
three review rounds, several retries each, all ended `REVIEW_NOT_PASSED`. The Judge scored 82, 72
and 84 and each time listed one or two blockers: the article did not cite independent primary
sources, and repository files were not in the evidence, so claims could not be verified.

The pass rule is unchanged and correct: a review passes when `score >= minimum` AND there are no
blockers (`MIN_JUDGE_SCORE` 80, `MIN_CRITIC_SCORE` 75). Three things were wrong around it:

1. The owner saw "The judge scored the draft too low" although the score was above the minimum.
   The real cause, an unmet requirement, was hidden.
2. A missing source could never appear. A retry keeps the saved research checkpoint and only
   rewrites; a draft cannot cite a source that is not in the bundle.
3. The owner could force a new research pass only by editing the topic.

## Decision

- **Honest failure message.** A failed review leaves a verdict in its step excerpt: score, minimum
  and the blocker texts (at most three, each shortened). A score that met the minimum fails with
  the new step codes `JUDGE_BLOCKED` / `CRITIC_BLOCKED`; `*_SCORE_LOW` stays for a score below the
  minimum. `progress.failure.review` carries `{ reviewer, score, minScore, blockers, blocked }`.
  The panel says "Blocked by an unmet requirement", quotes each blocker as given (`dir="auto"`,
  never translated) and shows "84 of 100, needs 80 and no blockers". Additive: older services send
  no `review`; the old codes still map.
- **Blocker-aware evidence-gap loop.** A deterministic multilingual classifier
  (`isEvidenceGapBlocker`) marks a blocker as an evidence gap when it asks for sources, citations,
  primary sources, a check against files or a repository, or an unverified fact. After a failed
  round, when another round follows and at least one blocker is an evidence gap, the pipeline runs
  ONE targeted research pass through the existing `ResearchClient`: the query is the topic plus the
  evidence-gap blockers, shortened, sanitised, secrets and URL query strings removed. Only NEW
  items are merged (dedupe by id and normalised URL, public http(s) URLs only, at most 10 new
  items, at most 30 items and 400,000 characters in the bundle); existing items keep their ids and
  order, so every citation already written resolves. The larger bundle is saved on the job (fenced
  on the attempt), so a later retry inherits it, and the next round's authors see the new ids in
  the revision brief. A style, structure or contradiction blocker never triggers research.
- **Bounds.** At most one pass per job attempt; it spends one healing attempt of the attempt's
  budget; it is skipped above 85 percent of the spend cap (ADR-181 `HealingBudget`); it never
  fails the job. A failed, empty or skipped pass is a `SKIPPED` step with a code
  (`EVIDENCE_GAP_RESEARCH_FAILED`, `_EMPTY`, `_SPEND_CAP`); a successful one is `SUCCEEDED` with
  `EVIDENCE_GAP_RESEARCH_DONE`; the pass starts with a `STARTED` step `EVIDENCE_GAP_RESEARCH`
  ("Looking for the missing sources"). Cancellation still propagates.
- **Evidence-gap failure class.** When the rounds are spent and every blocker of the last review
  is an evidence gap, the failure code stays `REVIEW_NOT_PASSED` but `progress.failure` carries
  `failureClass: EVIDENCE_GAP` with the remedies `RESEARCH_MORE`, `NARROW_CLAIMS` and
  `TRY_SUGGESTED_MODEL`.
- **"Research more".** The retry body gets an optional `refreshResearch` boolean (threads-service
  DTO, forwarded; generation-service DTO). With it, `inheritCheckpoints` copies nothing: not the
  research, and no model reply (every reply is keyed to the research it saw, so none could be
  replayed). It is part of the stored request, so the idempotency comparison treats it as a
  different request; a retry of a retry does not inherit it. A changed topic still starts over.
  The retry dialog has a "Research more before writing" checkbox, ticked by default after an
  `EVIDENCE_GAP`; the recovery panel offers "Research more" (one click) and "Narrow the claims"
  (opens the dialog on the topic with a hint that dropping the demand for sources removes the
  blocker).
- The Judge, the Critic and the pass rule are not weakened.

## Consequences

An owner is told the real cause of a failed review and can act on it: more research in one click,
or a narrower topic. A draft that needs a source gets one chance to find it inside the job. The
cost is at most one extra research call per job attempt, inside the existing spend and healing
bounds. No database migration: the verdict and the pass steps live in the existing step columns
(`excerpt` is `VARCHAR(1200)`), the merged bundle replaces `evidence_bundle` on the job row, and
`refreshResearch` lives in the stored request JSON.

The classifier is a keyword list, so a blocker worded unusually may not be recognised (research is
then skipped, never wrongly forced) and a non-source blocker that mentions a source word may
trigger one bounded pass.

**Stale when:** a later ADR changes the review pass rule, the research client, the retry body or
the checkpoint inheritance rules.
