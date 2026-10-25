# ADR-191: Unavailable Judge results are never verified

**Status:** Accepted
**Date:** 2026-10-25

## Context

Chat Judge provider failures and unparseable output were converted to an
`ACCEPT` verdict. The response then displayed a green verified mark beside
"Judge unavailable", which told the owner that a review had passed when none
had completed.

## Decision

- Provider failures, malformed output, and ambiguous plain text produce
  `UNAVAILABLE` with zero confidence and no review response.
- Explicit structured or unambiguous plain-text `ACCEPT`, `REVISE`, and
  `ESCALATE` decisions remain supported.
- Keep the original answer available, but display a muted warning instead of
  a verified badge when the Judge is unavailable.
- Add a conditional mental-health accuracy note in shared chat context and the
  video planner. It separates AI behavior metaphors from human diagnoses and
  discourages diagnosis from anecdotes.

## Consequences

An unavailable review is visible as a distinct outcome and is never reported as
approval. The change affects normal chat and surfaces that use the shared
review pipeline. No database migration is required.

**Stale when:** a later ADR changes the Judge's unavailable state or the UI's
verified-state contract.

**Stale when:** a later ADR changes the Judge's unavailable state or the UI's
verified-state contract.
