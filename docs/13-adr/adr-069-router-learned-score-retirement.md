# ADR-069: Router learned-score retirement — one production learning system

**Status**: Accepted
**Date**: 2026-08-15
**Deciders**: ClawAI core team
**Slice**: Cloud Smart Router — Batch 11, Learning Evolution V5 ("Learned scores")

## Context

`docs/architecture/cloud-smart-router/IMPLEMENTATION_PLAN.md` §5.1 flagged two
learned-metric stores that already disagree and must not be left stacked as a
third:

1. **`RouterModelProfile` / `RouterTopicProfile`** (`schema.prisma:448-499`),
   written by `RouterEducationManager.rebuildCalibrationSnapshot()`
   (`router-education.manager.ts`) from `RoutingOutcomeRecord` +
   `RoutingFeedbackRecord` raw observations, and applied to every live route
   through `RouterEducationManager.calibrateDecision()`
   (`routing.service.ts:230`, `:437`). This runs on **every** routing decision
   regardless of which lane produced it — legacy heuristic or `CloudRouterManager`
   — because `calibrateDecision` is a post-processing step agnostic to the
   decision's origin. It already carries `sampleSize`, `confidenceInProfile`,
   `calibrationTrustScore`, and `weightedSuccessScore` — close to the pack's
   V5 shape.
2. **`RouterLearnedScore`** (`schema.prisma:951-971`, keyed on
   `(profileKey, domain, taskFamily)`), written only by
   `LearningLoopManager.recordFeedback()` via `LearnedScoreRepository`. Its
   only callers are `apps/claw-routing-service/src/modules/learning-loop/`
   itself and the old `RouteEvaluatorManager`
   (`apps/claw-routing-service/src/modules/route-evaluator/`) — a module
   already established as dead code with zero production callers
   (`IMPLEMENTATION_PLAN.md` §2, §3 D11: `RouteEvaluatorManager`/
   `/routing/evaluate-v2` "stays untouched, still-dead code — a separate
   future cleanup, not in this pack's scope"). Nothing in the live routing
   path (`routing.service.ts`, `routing.manager.ts`, `cloud-router.manager.ts`)
   ever reads or writes `RouterLearnedScore`.

The V5 prompt requires versioned model/deployment/task scores derived from
completion, tool success, schema validity, acceptance, regenerate/switch
behavior, explicit feedback, evaluator results, latency, cost, and failure,
with raw observations kept separate from aggregates, minimum samples,
confidence intervals, recency decay, outlier controls, evaluator attribution,
batch recalibration first, and rollback. Building this against a table with no
live writers or readers would produce evidence nobody's traffic ever sees.

## Decision

**Retire `RouterLearnedScore` as a live target. `RouterModelProfile` /
`RouterTopicProfile`, via `RouterEducationManager`, is the one production
learned-score system going forward.** All V5 work in this batch extends the
education profiles and their repository, not `RouterLearnedScore` or
`LearningLoopManager`.

`RouterLearnedScore` stays in the schema and in the database as
**dead-but-harmless**:

- The table and the `RouterLearnedScore` Prisma model are **not deleted** in
  this batch. Dropping a table/model is a destructive migration decision with
  its own blast radius (anything that still imports the generated type,
  however dead) and does not need to happen in the same batch as the ADR that
  decides the table is unwired. It is logged below as a follow-up.
- `LearningLoopManager`, `LearnedScoreRepository`, and
  `learning-loop.module.ts` are left exactly as they are — same precedent as
  `RouteEvaluatorManager` in `IMPLEMENTATION_PLAN.md` D11: still-registered,
  still dead, a separate future cleanup, out of this batch's scope.
- No new code path writes to or reads from `RouterLearnedScore` as part of
  this batch.

### What V5 adds to the education profiles

Audited field-by-field against the pack's six requirements before writing
anything (`router-education.manager.ts`, `routing-education.repository.ts`,
`routing-education.types.ts`, `schema.prisma`):

| Requirement                               | Before this batch                                                                                                                                                                                                                                                                                                                                              | After this batch                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw observations separate from aggregates | Already correct. `RoutingOutcomeRecord` / `RoutingFeedbackRecord` are the raw per-decision observations; `RouterModelProfile` / `RouterTopicProfile` are the derived aggregates rebuilt from them.                                                                                                                                                             | Unchanged — confirmed, not touched structurally.                                                                                                                                                                                                                                                                                                                       |
| Recency decay                             | Already present. `computeFreshness()` applies a hyperbolic decay (`1 / (1 + ageDays / EDUCATION_WINDOW_DAYS)`) to every weighted sum.                                                                                                                                                                                                                          | Unchanged — confirmed, not touched.                                                                                                                                                                                                                                                                                                                                    |
| Minimum samples                           | Partial. `MIN_PROFILE_SAMPLE_SIZE` already gated the _override-to-best-profile_ path and the summary/prompt-hint surfacing, but the primary confidence blend in `calibrateDecision` applied `CALIBRATION_BLEND` at full, fixed weight regardless of the current profile's sample size.                                                                         | Closed the gap: the blend is now gated on `MIN_PROFILE_SAMPLE_SIZE` and scaled by the profile's own `confidenceInProfile`, so a thin profile can no longer pull a decision's confidence as hard as a well-sampled one.                                                                                                                                                 |
| Confidence intervals                      | Missing. Profiles carried only point estimates.                                                                                                                                                                                                                                                                                                                | **New.** Wilson score interval (`successRateLowerBound` / `successRateUpperBound`) computed from `successRate` and `routeCount`, stored on both profile tables.                                                                                                                                                                                                        |
| Outlier controls                          | Partial. Success/dissatisfaction scores were already bounded per-observation via `clamp01`, but latency and cost aggregates summed raw values with no bound — one 60s latency spike shifts the whole-window average.                                                                                                                                           | **New.** Latency and cost now go through a median/MAD-winsorized weighted average before entering the profile, so one anomalous sample cannot dominate the window.                                                                                                                                                                                                     |
| Evaluator attribution                     | Missing. `judgeVerifiedRate` / `judgeRevisedRate` / `judgeEscalatedRate` existed but were not attributed to any evaluator/rubric version — every judge run was pooled as if it were the same evaluator.                                                                                                                                                        | **New.** `RoutingOutcomeRecord.evaluatorVersion` (raw, nullable — most rows will be `null` until a judge run reports one) rolls up into `evaluatorVersions` on the profile, so a version change is visible instead of silently blended in.                                                                                                                             |
| Batch recalibration first, rollback       | Missing. `rebuildCalibrationSnapshot()` overwrote the live `RouterModelProfile` / `RouterTopicProfile` tables (`replaceModelProfiles` / `replaceTopicProfiles`) _before_ the calibration snapshot row was written, and the snapshot only stored the summary/prompt-hint digest — never the full profile rows. A bad recalibration had nothing to roll back to. | **New.** Each `RoutingCalibrationSnapshot` now durably stores its own full `modelProfiles` / `topicProfiles` payload and is written **before** the live tables are promoted (write order flipped: stage the versioned batch first, then apply). `rollbackCalibration(version?)` restores a prior snapshot's stored profile rows to the live tables and reactivates it. |

Also newly versioned: every `RouterModelProfile` / `RouterTopicProfile` row
now carries `scoreVersion`, tying it to the `RoutingCalibrationSnapshot.version`
that produced it — the pack's "**versioned** model/deployment/task scores"
requirement, which nothing previously satisfied (profiles were silently
overwritten with no version marker at all).

## Alternatives considered

1. **Wire `RouterLearnedScore` as the versioned aggregate layer over the
   education profiles**, per the second option the implementation plan left
   open. Rejected: it would mean every recalibration dual-writes two tables
   with two different key shapes (`(provider, model, taskFamily, topicKey)`
   vs `(profileKey, domain, taskFamily)`), with no consumer for the second
   write and a permanent reconciliation risk between them. The versioning and
   rollback this ADR adds already live naturally on the table that is
   actually read on the hot path.
2. **Delete `RouterLearnedScore`, `LearningLoopManager`, and
   `learning-loop.module.ts` now.** Rejected for this batch: it is a
   destructive schema change bundled with a learning-behavior batch, raises
   the risk surface for no behavioral gain (the table already has zero
   production readers), and the same "flag as follow-up, don't fix now"
   treatment was already applied to the equally-dead `RouteEvaluatorManager`
   in this same migration (D11). Consistency with that precedent argues for
   the same deferral here.

## Consequences

- `RouterEducationManager.calibrateDecision()` remains the single point where
  learned scores affect a live routing decision. No second learning system
  competes with it.
- `RouterLearnedScore` / `LearningLoopManager` / `RouteEvaluatorManager` are
  now uniformly documented as dead-but-harmless, not silently drifting
  duplicates. Follow-up (not this batch): a dedicated cleanup ADR to either
  delete `RouterLearnedScore` + `LearningLoopManager` + `RouteEvaluatorManager`
  together, or repurpose `RouterLearnedScore` for a genuinely new consumer
  (e.g. V6 tenant priors) if one materializes.
- Every profile row is now traceable to the calibration batch that produced
  it, and a bad batch can be rolled back without recomputing history from
  `RoutingOutcomeRecord` / `RoutingFeedbackRecord`.

## Migration

Additive, nullable/defaulted columns only — no destructive change, no table
drop:

- `router_model_profiles`: `score_version TEXT?`, `success_rate_lower_bound
DECIMAL(6,4)?`, `success_rate_upper_bound DECIMAL(6,4)?`,
  `evaluator_versions TEXT[]` (default `{}`).
- `router_topic_profiles`: same four columns.
- `routing_calibration_snapshots`: `model_profiles JSONB?`,
  `topic_profiles JSONB?`.
- `routing_outcome_records`: `evaluator_version TEXT?`.

Migration file:
`apps/claw-routing-service/prisma/migrations/20260815120000_add_router_learned_score_v5_fields/migration.sql`,
hand-written (no live database in this environment to run
`prisma migrate dev` against); `npx prisma generate` was run to regenerate
the TypeScript client from the edited schema — that step only reads
`schema.prisma`, it does not touch any database or apply the migration.

## Validation

`cd apps/claw-routing-service && npx tsgo --noEmit && npm run lint && npm test`.
New/extended coverage: `router-education.manager.spec.ts`,
`routing-education.repository.spec.ts`,
`routing-education-statistics.utility.spec.ts`.

## Rollback

Of this ADR's code: revert the listed files; the four migrations are additive
so reverting the application code is safe without a down-migration (the
columns simply go unread). Of a bad _recalibration batch_ at runtime: call
`RouterEducationManager.rollbackCalibration(version)` (or omit `version` to
restore the immediately preceding snapshot), which restores that snapshot's
stored `modelProfiles` / `topicProfiles` payload to the live tables and
reactivates it — no recomputation from raw observations required.
