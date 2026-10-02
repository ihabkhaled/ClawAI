# ADR-140: The free-trial length is a per-plan setting

- Status: Accepted
- Date: 2026-10-01

## Context

The free trial was "exactly 30 days" in six places: the `plans_trial_duration_check`
constraint, both plan DTOs, the plan form, the seeder, and `assignTrialPlanOnce`
(which filtered on `trialDurationDays: 30` and wrote `now + 30 * 86_400_000`). The
column `Plan.trialDurationDays` already existed, so the owner could not use it: any
other value was refused at every layer.

## Decision

- `Plan.trialDurationDays` is the only source of a trial's length. Valid values are
  whole days from 1 to 3650 on a trial plan, and `NULL` on any other plan. Migration
  `20261001120000_dynamic_trial_duration` widens the CHECK constraint; no row changes.
- `assignTrialPlanOnce` reads the length from the plan row at grant time. A trial
  already running keeps the end date it was given; editing the plan only affects
  trials that start afterwards.
- The seeder's `30` is a default for a fresh database. An edited plan row is never
  rewritten (the administrator-edited branch does not touch the column, and the legacy
  upgrade branch keeps a stored value).
- Admin actions, both reasoned and audit-logged (`plan_trial_days_added`,
  `plan_admin_trial_grant`):
  - `POST /admin/plans/users/:userId/trial-days` `{ days, reason }` adds days to the
    user's trial, counted from the current end, or from today if it has lapsed.
  - `POST /admin/plans/users/:userId/assign` now accepts `durationDays` as an
    alternative to `durationMonths`. On a trial plan it sets the user to that plan for
    N days, reopening a spent trial.
- **Relation to `PlanTrialRedemption`.** It stays a lifetime row (one per user). An
  admin Free-for-N-days grant re-points it at the new assignment and sets a new
  `expiresAt`, so it reads ACTIVE. Any later grant (Pro, another admin grant) names a
  different assignment, so the row reads SUPERSEDED and no "days left" is shown. "Add
  trial days" is refused with `PLAN_TRIAL_SUPERSEDED` in that case, because extending a
  row that no longer grants access changes a date nobody can see take effect.
- Remaining days are whole days rounded up and floored at 0, in the admin subscription
  dialog (badge) and on the user's `/plan` page (same count as the trial banner).
- User-facing copy must not hard-code the length; it is read from the plan.

## Consequences

- Trial length can be 14, 90 or 365 without a deploy. It is a plan edit.
- Support can extend or reopen a trial without a database edit.

## What would make this stale

- A second trial per account, or a trial on a paid plan (the redemption row is
  unique per user and the CHECK ties the length to `is_trial`).
- Moving trial length out of `Plan` (a per-cohort or per-campaign trial).
- `EntitlementApplier.revoke` (entitlements module) still writes a 30-day trial for a
  user downgraded by a billing event with no prior trial. It does not read the plan
  yet; until it does, that one path ignores an edited length.

## Incident 2026-10-01: a 90-day Free plan broke signup

The first ADR-140 migration widened `plans_trial_duration_check` but missed the
second rule from `20260809120000`: `plan_trial_redemptions_duration_check` still
required `expires_at = started_at + 30 days`. When the owner set the Free trial to
90 days in production, every signup and every admin "Set to Free" / "Add trial
days" failed with HTTP 500 (Postgres 23514). Dev never failed because the dev
database had drifted and lacked that constraint.

Fix: `20261002090000_trial_redemption_any_length` replaces it with
`expires_at > started_at`. Guard: `trial-length-constraints.spec.ts` reads the
migration history and fails if the current definition of either trial constraint
pins a day count. Lesson: when a rule moves from a constant to a setting, grep the
migrations for every CHECK that encoded the constant, and verify against a database
built from migrations, not a drifted dev copy.
