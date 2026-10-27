# ADR-194: The owner can accept disclosed evidence gaps, and the article says so

**Status:** Accepted
**Date:** 2026-10-27

## Context

Production, 2026-10-27, Thread review `cmvnq79c3002d01s780nw00lz` (an Arabic research article about
AI-agent failure patterns) failed review more than ten times. The topic demanded things the evidence
cannot supply: independent primary sources on sycophancy, reward hacking and instruction following,
and a check of an external repository against its files (the research stage returns neither). The
drafts were honest ("no experiment was run", "unverified"), yet the Judge blocked them (scores 67 to
84, blockers such as "does not cite independent primary sources") and the Critic scored 72 against a
minimum of 75 for stating a repository claim as fact.

[ADR-193](adr-193-a-failed-thread-review-names-its-real-cause-and-fills-evidence-gaps-once.md) made
the failure honest (the real blocker is shown) and gave the pipeline one targeted extra research pass
and a "Research more" remedy. When the sources simply do not exist, neither helps. The owner's
position: if the owner decides that a transparent article with named gaps is acceptable, it must be
able to pass.

## Decision

An **owner-approved scope reconciliation**, not a bypass of review. The owner names the specific
evidence gaps they accept; the article then says so plainly; the reviewers stop blocking on exactly
those and on nothing else.

- **Request.** `retry-generation` takes an optional `acceptedEvidenceGaps: string[]` (at most 8
  entries, each 1 to 300 characters, storable text). threads-service validates and forwards it;
  thread-generation-service validates it again, normalises it (trimmed, whitespace collapsed,
  control characters removed, repeats dropped, sorted) and stores it in the job request. It is part
  of the idempotency comparison (`isSameRequest`), is never inherited by a retry of a retry
  (`buildRetryInput` drops it, like `refreshResearch`), and is logged as the step `ACCEPTED_GAPS`
  ("The owner accepted these gaps", the texts in its excerpt). The frontend sends the exact blocker
  texts the owner saw in `progress.failure.review.evidenceGapBlockers`, each one ticked by hand; there
  is no blanket switch.
- **Authors.** With accepted gaps the authors' prompt gets a mandatory H2 section with a fixed,
  localised heading (`LIMITATIONS_HEADINGS`, 13 languages, for example "Limitations and unverified
  items") holding one bullet per accepted gap, stated plainly in the article language. It forbids
  inventing a source, quote, url, number or result, and forbids presenting unverified material as
  fact (it must be labelled unverified).
- **Judge and Critic.** Their prompts get one rubric note: the owner accepted that these
  requirements cannot be met from the available evidence; do NOT raise them as blockers and do NOT
  lower the score for them PROVIDED the article states each one clearly in the limitations section
  and does not present unverified material as fact; keep blocking and scoring down for fabricated
  claims, mis-cited sources, contradictions, invented results, unsafe content and every other defect.
- **Pass rule, unchanged.** Score at least the minimum (Judge 80, Critic 75) and no remaining
  blockers. After a review, a blocker is set aside only when it is an evidence-gap blocker (the
  ADR-193 classifier) AND is about the same topic as an accepted gap (`matchesAcceptedGap`: the
  topic words left after removing the sourcing vocabulary must overlap by half, by pairs of
  characters at 30 percent for Chinese, Japanese and Thai). A blocker the classifier does not read as
  a sourcing request, or about another topic, keeps blocking. The score is never touched. A review
  that set blockers aside leaves the step `ACCEPTED_GAP_WAIVED` listing them.
- **Deterministic post-check.** Before the Judge (when no candidate has it) and before the Critic
  (for the Judge's choice), the article must contain a limitations section: a heading with the
  language's limitations keyword and at least one item covering each accepted gap (half of the gap's
  topic words in one item). Otherwise the round ends with the RETRY step `LIMITATIONS_MISSING`, the
  next round's brief asks the authors to add it, and no model is paid for a review of an article that
  cannot pass. Three rounds without the section is the ordinary `REVIEW_NOT_PASSED`.
- **Reader protection.** A job that passed with accepted gaps stores `gapsDisclosed: true` in the
  revision content (no column, no migration). threads-service keeps it on the draft, carries it into
  every owner edit of that article, and returns `gapsDisclosed` in the public publication payload.
  The public page and the Board reader show a localised notice above the article ("Some requested
  sources could not be found"); it is never hidden and not part of JSON-LD. The safety scan, the
  Critic and the publish thresholds run exactly as before.
- **Owner UI.** The server adds the remedy `ACCEPT_GAPS` ("Accept these gaps and write it honestly")
  whenever the failed review has evidence-gap blockers (the failure class may be `EVIDENCE_GAP` or a
  mixed `REVIEW_NOT_PASSED`). It opens the retry dialog with the gap blockers as unchecked checkboxes,
  the sentence "The article will say clearly what could not be found. Reviewers will still check
  everything else.", and a submit button that stays disabled until one is ticked. "Research more" and
  "Narrow the claims" are unchanged; three buttons are shown, so a model-change remedy yields its
  place to the new one.
- **What never relaxes.** Safety refusals, billing and entitlement codes, the spend cap, the attempt
  and healing bounds, the citation rule (every cited url must be an evidence-bundle item; the
  fabricated-source check is untouched) and the Critic's checks.

## Consequences

An article whose topic demands unobtainable evidence can be published, honestly: it says what it
could not find, in the language it is written in, and every reader is told at the top. The owner
decides, per gap, and the decision is recorded in the step log and in the stored request. Two
independent checks hold the line: the reviewers keep their other duties, and the deterministic
section check does not depend on a model.

No database migration: the request lives in the stored request JSON, the disclosure flag in the
revision content JSON, the steps in the existing step columns.

Known limits. The matcher is lexical: a reviewer who words a blocker with none of the accepted
gap's topic words is not matched and keeps blocking (safe direction; the owner can tick the new
wording on the next retry). An owner's own later edit is reviewed without the accepted gaps, so the
reviewers may block it again; the disclosure flag nevertheless stays. The `LIMITATIONS_HEADINGS`
wording is required by the check, so a locale added later needs a heading, keywords and a case in
`accepted-gaps.utility.spec.ts`.

**Stale when:** a later ADR changes the review pass rule, the retry body, the revision content
shape or the public publication payload.
