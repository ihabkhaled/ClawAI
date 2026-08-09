# One-Month Free Trial Design

## Goal

Make the Free plan a once-per-account, 30-day trial. After expiry, the user keeps
account access but cannot consume models, tokens, chats, or other plan-gated AI
features until a non-trial paid entitlement is activated.

The $1 plan is explicitly outside this feature and remains available for payment
testing without trial semantics.

## Business outcome

Free access is an acquisition path rather than a permanent subscription. Success
means new users can evaluate ClawAI for 30 days, expired users see a clear upgrade
path, and no client/API bypass can restore free usage or start another trial.

## Considered approaches

1. **Store only an expiry on the active assignment.** Simple, but deleting or
   replacing an assignment can recreate a trial. Rejected because it does not
   enforce once-per-account eligibility.
2. **Durable auth-owned redemption plus assignment expiry (selected).** A unique
   lifetime redemption row proves the account has consumed trial eligibility;
   the active assignment carries the exact entitlement deadline used by normal
   entitlement checks.
3. **Create a zero-dollar payment subscription.** Rejected because Free has no
   financial transaction and payment-service must not own auth plan assignment.

## Authoritative data model

Auth-service remains the source of truth for plans and user entitlements.

- `Plan.isTrial` defaults to `false`.
- `Plan.trialDurationDays` is nullable and must be exactly `30` when `isTrial`
  is true; it is null otherwise.
- The seeded `free` plan is backfilled to `isTrial=true` and
  `trialDurationDays=30`. The $1 testing plan is not changed.
- `PlanTrialRedemption` stores `userId`, the first trial plan/assignment,
  `startedAt`, and `expiresAt`; `userId` is unique across all trial plans.
- `UserPlanAssignment.entitlementValidUntil` stores the same deadline for the
  active trial assignment.

Existing Free users are backfilled from their earliest Free assignment. Their
deadline is that assignment's `startsAt + 30 days`, so accounts already older
than 30 days become expired immediately rather than receiving an unintended new
trial.

## Assignment and upgrade flow

Trial assignment runs in one auth database transaction:

1. Read the active trial plan and duration.
2. Create the unique redemption row.
3. Create/activate the user plan assignment with the redemption deadline.
4. Point `User.activePlanId` at the trial plan.

A uniqueness conflict means the account already consumed its trial and produces
`PLAN_TRIAL_ALREADY_USED`. Paid subscription events continue through the durable
billing entitlement inbox; activating a non-trial plan replaces the expired
trial assignment without deleting its redemption history.

## Enforcement

`EntitlementsService` evaluates trial expiry before returning plan limits or
feature gates. Admin entitlement bypass remains unchanged. For a non-admin with
an expired trial it throws the stable backend code `PLAN_TRIAL_EXPIRED`.

This check is applied at the central auth entitlement/quota boundary, which is
already used by token reservation and backend feature gates. Downstream chat,
routing, agent, and model operations therefore fail closed without duplicating
clock logic in every service. Client-side checks are presentation only.

The comparison uses an injected/current server clock and the persisted UTC
deadline. Expiry is inclusive: access is rejected when `now >= expiresAt`.

## API contracts

Admin plan create/update views include:

- `isTrial: boolean`
- `trialDurationDays: 30 | null`

Normal plan/entitlement views expose only presentation-safe trial state:

- `isTrial`
- `trialEndsAt`
- `isTrialExpired`

They never expose redemption identifiers. Changed frontend mutations must assert
the complete serialized request body.

## Frontend behavior

The admin plan form includes a localized “30-day trial” switch. Enabling it
sets the fixed duration to 30; disabling it sends null. The seeded Free plan is
enabled by default through database seed/migration, not a frontend slug check.

Portal layout shows a persistent localized banner directly under the navbar:

- Active trial: days remaining and an upgrade action.
- Expired trial: access has ended and a paid plan is required.

When chat/model execution receives `PLAN_TRIAL_EXPIRED`, the existing API error
pipeline maps it to a localized message, shows a toast, and renders the error in
the chat response area. All visible copy exists in all 13 locales.

## Security and failure behavior

- Trial eligibility is derived only from authenticated user identity.
- A client cannot submit `startedAt`, `expiresAt`, redemption state, or userId.
- Concurrent signup/assignment attempts are serialized by the unique user
  redemption constraint and transaction.
- Expired users retain settings/billing/account access so they can upgrade.
- Payment failure does not erase the redemption or reactivate Free.
- Deleting sessions, browser data, or historical assignments cannot restore
  eligibility.

## Acceptance criteria

1. New accounts on seeded Free receive exactly 30 days of entitlement.
2. At `now >= expiresAt`, quota reservation and every entitlement-gated AI
   operation reject with `PLAN_TRIAL_EXPIRED`.
3. An account can never activate any trial-flagged plan twice.
4. A paid entitlement immediately removes the expired-trial block.
5. Admin create/edit APIs and UI persist the trial toggle; Free is flagged by
   default and the $1 testing plan is untouched.
6. Portal banner and chat/toast errors are translated in all 13 locales.
7. Existing Free users are backfilled from original assignment time.
8. Financial records and payment-service subscription history are unchanged.

## Test strategy

- Prisma/migration assertions for Free backfill, unique lifetime redemption,
  and existing-user deadlines.
- Auth repository/service tests for atomic first redemption, concurrent reuse,
  exact 30-day boundary, admin bypass, expiry rejection, and paid upgrade.
- Contract tests for admin plan DTOs and frontend serialized mutations.
- Shared/backend entitlement tests proving chat/model/token gates receive the
  stable error code.
- Frontend controller/component tests for toggle, active/expired banners, and
  chat/toast error localization.
- Scoped typecheck, lint, test, and build gates only at commit boundaries.

## Explicit non-goals

- Password reset or Coding Agent benchmark work.
- Applying trial semantics to the $1 testing plan.
- Calendar-month arithmetic, recurring Free access, promotional-code systems,
  trial extensions, or admin redemption resets.
