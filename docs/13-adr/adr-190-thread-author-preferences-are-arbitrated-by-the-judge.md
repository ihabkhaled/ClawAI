# ADR-190: Thread author preferences are arbitrated by the Judge

**Status:** Accepted
**Date:** 2026-10-25

## Context

Thread generation required every author to produce the same exact draft hash
before calling the Judge. Different drafts therefore exhausted generation
rounds without using the Judge to compare them. Owner edits also treated
author agreement as a readiness gate even though only one edited draft exists.

## Decision

- Authors vote for their preferred candidate draft. The service records the
  plurality agreement percentage, including ties and splits.
- The Judge receives all candidates and the percentage, selects the strongest
  candidate, and reviews it. The Critic reviews the Judge-selected candidate.
- A split or tie alone does not fail a round. Existing Judge, Critic, citation,
  and safety gates still apply.
- For an owner-edited single draft, author agreement is informational; Judge,
  Critic, and exact citation validation decide readiness.
- Content hashes still bind a review to the exact immutable draft and citations.

## Consequences

The Judge now resolves disagreement within the current round instead of
triggering another full author round. The owner review displays the author
preference percentage. The persisted review field is additive; no database
migration is required. This supersedes the candidate-selection portion of
[ADR-189](adr-189-thread-articles-are-typeset-by-a-guarded-format-stage-and-rendered-as-rich-safe-html.md).

**Stale when:** a later ADR changes author voting, Judge selection, or the
publication readiness gates.

**Stale when:** a later ADR changes author voting, Judge selection, or the
publication readiness gates.
