# Claw Auth Service - Development Rules

## Service Overview

This is the Auth microservice for the Claw platform. It owns all authentication, user management, and session handling.

## Ownership

- **Users**: CRUD operations, role management, status management
- **Sessions**: Refresh token storage, session lifecycle
- **Authentication**: Login, logout, JWT token issuance, token refresh

## Tech Details

- **Port**: 4001
- **Database**: PostgreSQL (`claw_auth`)
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Events Published

- `user.created` — when a new user is created
- `user.login` — when a user successfully logs in
- `user.logout` — when a user logs out

## Baseline rules

Baseline rules for every backend service (commands, absolute rules, declarations, library wrapping, Docker rebuild, workflow phases, checklists, output format): [docs/04-backend/backend-service-baseline.md](../../docs/04-backend/backend-service-baseline.md). This file adds only what is specific to `claw-auth-service`.

- Library wrapping here: `src/common/utilities/hashing.utility.ts` wraps `argon2`; services import `{ hashPassword, verifyPassword }` from the wrapper.
- The entitlements payload carries `hasPaygCredit` (metering on and wallet available > 0, fail closed); it unlocks `allowImageGeneration` only (ADR-139, rule 37 item 21).
- Plan model access uses `allowedCostClasses`; Free defaults to `FREE`, `CHEAP`, and `STANDARD`, while every paid catalog plan includes all five classes. Class access is an upper bound: explicit model rows cannot grant a class excluded by the plan. The versioned catalog migration preserves plans with explicit access rows. See [plan and quota specification](../../docs/06-data/plan-and-quota-specification.md#5-model-access).

## PAYG connector credit — this service owns it (ADR-078)

`modules/credit/` holds the wallet, the ledger, the reservation and the PAYG
classification. Four new tables: `user_credit_wallets`, `credit_ledger_entries`,
`credit_packages`, `credit_package_versions`, plus three columns on
`weighted_usage_records`.

Four things here are easy to break by accident:

1. **`RESERVE_QUOTA_LUA` has NINE windows, not seven.** `CREDIT_GRANT` and
   `CREDIT_PURCHASED` were appended. They INVERT the encoding of the other
   seven: the "limit" is the wallet bucket balance read from Postgres, and the
   counter holds only outstanding holds. Settled spend is subtracted in
   Postgres and never accumulated in Redis, because production Redis is
   RDB-only — losing its tail must cost a safety margin, never a balance.
   Any assertion on the adjust ARGV must derive its offset from the key count
   (see `adjustArgv` in `quota.service.spec.ts`), never a literal index.
2. **`credit_ledger_entries` is append-only.** A correction is a new
   compensating row. The invariant is
   **`(grant + purchased) − reserved = SUM(ledger)`** — NOT `wallet = SUM(ledger)`.
   A RESERVATION row is negative the moment a hold is taken, but the money has
   not left the buckets yet; it sits in `reserved_micro_usd` until the hold
   settles or is released. Comparing gross buckets against the ledger reports a
   "drift" exactly equal to the outstanding holds, which is how a live audit
   raises a false alarm mid-request. A spec asserts the real invariant after a
   concurrency run.
3. **Money is `BigInt` micro-USD.** No float touches this module. `Math.round`
   and `parseFloat` are banned in payment-service by ESLint; extending that ban
   here is an open follow-up recorded in `rules/37`.
4. **Never log a balance next to a `userId`.** Rule 19's redaction list, and
   rule 37 rule 4.

The kill switch is `SystemSetting` key `payg.credit.enabled`, checked once
inside `reserve` rather than at each call site. `modules/system-settings/` is
its read path — the model had existed with zero consumers.

**Every reserve reply carries `maxOutputTokens`, including an unmetered one.**
The unmetered branch echoes `input.requestedMaxOutputTokens` — an unmetered
request has no balance to clamp against, so the requested maximum IS the answer.
Do not "simplify" it back to `{ metered: false, reason }`: `PaygMeter` reads
`hold.maxOutputTokens` off every outcome without branching on `metered`, and
when this field was missing the client read the whole reply as malformed and
failed CLOSED. The switch therefore inverted — turning PAYG **off** refused
every paid model on every install that had not armed it, which is the default.
Pinned by the short-circuit cases in `credit-reservation.manager.spec.ts` and by
`payg-meter-wire.spec.ts` in shared-entitlements.

**Finalize reply and billing mode (F108, rule 37 item 23).** `POST internal/credit/finalize`
answers 200 `{ settled, billingMode, settledCostMicroUsd? }` (it was a bodiless 204; callers that
ignore the reply are unaffected). `CreditBillingModeService.resolve` names the user from
`PlansRepository.findEffectiveProvenance` through the pure `billingModeForAssignment`: a
non-trial `FREE_DEFAULT` is `PAYG`, `PAID_SUBSCRIPTION` is `SUBSCRIPTION`, EVERYTHING else
(trial, admin grant, promotion, migration, no assignment, administrator, failed lookup) is
`UNKNOWN`. `settledCostMicroUsd` is the CHARGED amount (not the priced cost), attached only for
`PAYG` and only when a safe integer; a replay or unknown reservation answers `settled: false`
with no cost and no lookup. Pinned by `credit-reservation.manager.spec.ts` ("finalize outcome"),
`credit-billing-mode.{utility,service}.spec.ts`.

**Unit metering (rule 37 item 17).** Reserve and finalize accept optional
`imageUnits` (≤ 10), `audioSeconds` (≤ 7,200, seconds of INPUT audio) and
`ttsCharacters` (≤ 100,000), defaulted to 0 in `credit-internal.dto.ts`. The
hold is sized on the EXPECTED units (`clampOutputTokensToBalance`) and settled
on the MEASURED ones (`toRawTokenBreakdown`) against `imagePerUnitMicroUsd`,
`audioPerUnitMicroUsd` and `ttsPerCharacterMicroUsd`. `ModelRateClient`'s
local-fallback shape check counts the per-unit columns: a per-image row has
zero token rates on purpose and must not be refused as "free local". The units
are NOT persisted on `weighted_usage_records` (no column) — the ledger amount
carries the cost. Pinned by `credit-unit-metering.spec.ts`,
`credit-internal-units.dto.spec.ts`, `clients/__tests__/model-rate.client.spec.ts`.

**The disabled path is the default path.** It is what a fresh install runs and
what rollback lever #1 selects, so it needs more testing than the enabled one,
not less. Test a PAID model with the switch off.

`ScheduleModule` and `@nestjs/schedule` are NEW here. The reservation sweeper
and the grant renewal each take a distinct Redis lock and run on staggered
intervals; they take the lock even at one replica, so raising
`AUTH_SERVICE_REPLICAS` stays a config change rather than a double-refund
incident.

Deploy: **this service must be healthy before payment-service starts.** See
`docs/11-runbooks/runbook-payg-credit.md`.

## Admin per-user statistics live in their own module (2026-09-06)

`modules/admin-statistics/` serves the two panels the admin users page opens per
row. It exists as its own module rather than hanging off `credit` or `quota`
because it reads the token ledger (quota) and the credit ledger (credit)
together, and neither module owns the pair.

- `GET /api/v1/admin/users/:userId/usage-statistics` → tokens for the UTC day,
  ISO week and calendar month, plus settled credit spend per month.
- `GET /api/v1/admin/users/:userId/plan-overview` → plan, entitlement grant and
  free-trial standing.
- `GET /api/v1/admin/users/:userId/usage-breakdown?hours|from&to` → models
  (provider/connector, requests, input/output tokens, micro-USD cost), gated tools
  (`feature_usage_records`, CONSUMED), workflows, credit-connector use and the
  free allowance (`limit`/`used`/`remaining`, `null` = unlimited, `0` = disabled).
- `GET /api/v1/admin/usage-analytics?hours|from&to&userId&limit` → platform-wide
  totals, `today` (UTC), hourly/daily series, models, top users (masked email),
  tools, workflows. Both are `ADMIN_USAGE_VIEW`, admin-only.

Usage analytics rules (2026-10-05): everything aggregates EXISTING rows
(`weighted_usage_records`, `feature_usage_records`, `credit_free_allowance_usage`);
nothing new is stored except three indexes. Range hard cap 90 days (rejected, not
clamped), hourly grain up to 7 days else daily, every GROUP BY has a LIMIT (max
50). RELEASED rows are excluded; cost is `COALESCE(actual, estimated)` in integer
micro-USD, shipped as a string. Known gap: tools are counted only for
`PlanFeatureKey` features (web search/fetch/extract, file generation, compare...);
image and other in-turn tool calls appear only as `toolCallCount` and by
`workflow`, never named per tool.

Three things here are easy to get wrong:

1. **The two routes carry DIFFERENT permissions on purpose.** The controller
   defaults to `ADMIN_USAGE_VIEW`; `plan-overview` overrides it to
   `ADMIN_PLANS_MANAGE` (`RolesGuard` resolves with `getAllAndOverride`, so the
   handler wins). Plan and trial are subscription facts, and payment-service
   gates the other half of that same modal on `ADMIN_PLANS_MANAGE` — splitting
   them would make one modal half-load for anyone holding only one permission.
   Neither is `ADMIN_USERS_MANAGE`, which gates the PAGE: the frontend must gate
   each button on the permission its own endpoint enforces, or it ships a
   control that 403s on every click.
2. **CONSUMPTION ledger rows are stored NEGATIVE** (`amountMicroUsd: -charge`).
   `aggregateMonthlyConsumption` negates the SUM so the panel reports a positive
   figure; rendering the raw sum shows every month's spend as a refund. Only
   `CONSUMPTION` is counted — grants, expiries, top-ups, reservations and admin
   adjustments all move a wallet without the user having spent anything.
3. **Micro-USD leaves this service as a STRING.** `bigint` does not survive JSON,
   and a wallet figure silently truncated past `Number.MAX_SAFE_INTEGER` is the
   exact failure the integer-money rule exists to prevent. The frontend renders
   it with `formatMicroUsd`, which takes a string.

`AdminUserStatisticsService` deliberately does not verify the user exists: the
ledgers are the truth for consumption, and an id with no rows is
indistinguishable from a real user who never spent anything. Both are honestly
reported as zero.

## Display currency is a PREFERENCE, not a profile field (2026-09-12)

`User.currencyPreferenceMode` / `preferredCountryCode` / `preferredCurrencyCode`
live on the ordinary `PATCH /users/me/preferences` endpoint, alongside language
and appearance — NOT on the sensitive profile mutation that demands the current
password. Choosing which symbol a price prints in cannot move money, change an
entitlement or reveal anything, and making someone re-enter a password for it
would teach them to type their password more often for no security.

Three things this service must keep straight:

1. **Country and currency are stored separately.** A country can share a
   currency, hold several, or change one. Country is context for AUTO; the
   currency is the answer.
2. **The MANUAL invariant is checked against the MERGED state, not the payload.**
   A request can switch to MANUAL without naming a currency because one is
   already stored, and it can clear the stored currency while leaving the mode
   alone. Only the merged result says whether MANUAL ends up with nothing to
   show — `CURRENCY_PREFERENCE_INCOMPLETE`.
3. **Switching to AUTO keeps the stored choice.** Clearing it on every switch
   means toggling AUTO off and on silently forgets what the user picked.

Never infer currency from `languagePreference`. Arabic is not EGP and English is
not USD. Conversion itself belongs to payment-service's `modules/display-fx`;
this service owns the preference and nothing more — see ADR-097 and
`rules/45-display-currency-versus-settlement-currency.md`.

## Read-aloud voice is a PREFERENCE too (2026-09-26)

`User.ttsVoice` (`tts_voice VARCHAR(32)`, nullable; migration
`20260926100000_add_user_tts_voice`) rides `PATCH /users/me/preferences`
(`ttsVoice: string | null`, trimmed, validated against `TTS_VOICES_BY_PROVIDER`
in `@claw/shared-constants`, case-sensitive — "Kore", "alloy"; null = each
provider's default). Returned on `/auth/me` and `SafeUser`. chat-service reads it
through `GET /internal/users/:id/speech-preferences` → `{ ttsVoice }`
(`UsersInternalController`, `@Public()` + `ServiceTokenGuard`, never proxied by
nginx). Nothing else of the profile leaves on that route.

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
npm run migrate          # Run migrations (production)
npm run migrate:dev      # Create + run migration (dev)
npm run seed             # Seed admin user + system roles + plans (full seed)
npm run seed:permissions # Reconcile system-role permissions ONLY (no users/plans)
npm run prisma:generate  # Regenerate Prisma client
```

## Role-Permissions Auto-Sync (drift correction)

`PermissionsSeederService` (`src/modules/roles/services/permissions-seeder.service.ts`) runs on every auth-service boot via `OnModuleInit`. It diffs the canonical `SYSTEM_ROLE_SEED` in `src/common/constants/rbac.constants.ts` against the in-DB `role_permissions` rows for the two system roles (ADMIN, USER) and reconciles drift:

- **Adds** any permission present in the seed but missing from the DB (e.g., when a new permission is appended to `USER_DEFAULT_PERMISSIONS` after the initial deploy).
- **Removes** extras gated by `SEED_RECONCILE_PERMISSIONS` (default `false` = ADD-only, so admin-granted extras like `JUDGE_USE` on USER survive every `docker up`). Set to `true` to hard-reconcile both system roles back to the canonical seed (adds AND removes).
- Emits a structured warn log per role on drift: `roleSlug=… added=[…] removed=[…] finalGrantCount=…`
- Custom (non-system) roles are NEVER touched — admins manage those via the role→permission matrix UI.
- `onModuleInit` soft-fails: a transient DB error logs but does not crash auth-service startup.

Operators can run the reconciler standalone (no full deploy) via `npm run seed:permissions` (backed by `prisma/seed-permissions.cjs`). Useful for rolling a permission catalog change out to an existing install.

## Super-Administrator Authority (2026-08-27)

One account carries `User.isSuperAdmin`, guaranteed unique by a **raw-SQL partial
index** that `schema.prisma` cannot express — never accept a migration diff that
proposes dropping `users_single_super_admin_idx`.

Authority is two questions, deliberately answered in two places:

- **May this actor mutate this row, for this scope?** →
  `resolveSuperAdminMutability` (pure, in `modules/users/service.utilities/`).
  Never re-derive this from `user.isSuperAdmin` at a call site, and never write a
  second predicate.
- **Does this actor hold super-administrator authority?** →
  `UsersService.assertSuperAdminActor` (DB read). Do **not** add an
  `isSuperAdmin` JWT claim — already-issued tokens would lack it until expiry.

`SUPER_ADMIN_SELF_PERMITTED_SCOPES` = `PROFILE` only. Adding a scope is a product
decision with an unrecoverable failure mode, not a code-review call.

Administrator-class mutations (create/promote/demote/suspend/reactivate an
`ADMIN`, and editing a **system** role's permissions) require a super-admin actor.
Ordinary-user mutations must stay ungated.

Cross-module target reads use `PlansRepository.findUserMutabilityFacts` and
`RolesRepository.isSuperAdminActor` — **not** `UsersService`, because
`UsersModule` imports `RolesModule` and `PlansModule` and the reverse is a cycle.

System-driven writers (billing entitlement events, plan retirement) are exempt on
purpose and state it at the write site.

Full rule: `rules/35-super-administrator-and-privilege-boundaries.md` ·
ADR: `docs/13-adr/adr-073-super-administrator-authority.md`

## Quota windows must widen as they lengthen (2026-08-27)

A plan's daily cap may not exceed its weekly cap, nor weekly its monthly. A
shorter window that allows more is not a stricter plan — the longer ceiling
binds first, so the shorter number is unreachable, and the shorter number is
what the pricing card leads with.

This was live: the Free plan advertised **300,000 tokens a day against a 20,000
weekly ceiling**. A visitor read fifteen times the allowance the account
actually grants and would hit the wall on the first afternoon.

`findQuotaWindowConflicts` (`modules/plans/utilities/`) is the single predicate;
`PlansService.createPlan` and `updatePlan` refuse with
`PLAN_QUOTA_WINDOWS_INCOHERENT`. Update merges the partial DTO onto the stored
row first — raising the weekly cap alone would otherwise be judged with no daily
cap to compare against.

`null` is unlimited and `0` is disabled; neither is "a smaller number" here, and
conflating them is how an unlimited window would start failing validation.

Existing rows are not migrated: the replacement numbers are a pricing decision,
so the guard surfaces them by refusing the next edit rather than picking values.

## Admin plan grants carry duration, reason and provenance (2026-09-02)

`PlansRepository.assignUserToPlan` used to serve two callers with genuinely
different intent under one signature: an administrator deliberately putting a
user on a plan, and a brand-new signup landing on the platform's default plan.
Forcing both through one method meant a signup grant had to fabricate an
`assignedByUserId`, a `grantReason` and a `durationMonths` that describe
nothing real about the event — or the admin-grant path had to make all three
optional and quietly do the wrong thing when they were missing. Neither is
acceptable for a table (`UserPlanAssignment`) that downstream billing and
support tooling reads as an audit trail.

The split: `assignDefaultPlan(userId, planId)` preserves the old signup
behavior byte-for-byte — no admin actor, `grantType` defaults to
`FREE_DEFAULT`, `entitlementValidUntil` stays null (never expires) — and is
the only method `AuthManager.register()` and `UsersService.assignSignupPlan()`
call. `assignUserToPlan` is now exclusively the admin-grant path: it always
requires `assignedByUserId`, a validated `durationMonths`, and a non-empty
`grantReason`, and always writes `grantType: 'ADMIN_GRANT'`. A signup is not
an administrator's discretionary decision, and an admin grant is not an
anonymous default — collapsing them back into one method would either force a
fake reason onto every signup or silently drop the audit trail off every real
grant.

`PlansService` validates before the repository ever sees a grant:
`PLAN_GRANT_DURATION_INVALID` when `durationMonths` is missing, not a whole
number, below 1, or above `PLAN_GRANT_MAX_DURATION_MONTHS` (60 — a ceiling
against a typo like `240` silently granting two decades, not a real expected
value), and `PLAN_GRANT_REASON_REQUIRED` when the trimmed `grantReason` is
empty. Both are `BusinessException`s with `HttpStatus.BAD_REQUEST`, refused
before any write.

`entitlementValidUntil` is computed once, at grant time
(`addCalendarMonths(now, durationMonths)`), and stored on the
`UserPlanAssignment` row — it does **not** get its own expiry sweep. The
existing lazy-expiry read in `findEffectiveForUser` already filters on
`OR: [{ entitlementValidUntil: null }, { entitlementValidUntil: { gt: now } }]`,
which an admin grant now simply participates in the same way a payment-service
entitlement event already did. An expired admin grant does not need a cron job
to "notice" — the next read of the user's effective plan already excludes it,
and the row itself is left in place as the historical record of what was
granted, by whom, and why.

### The QUARTERLY/SEMIANNUAL pricing backfill is a separate seeder, not a version bump

The 4-way checkout term selector (1/3/6/12 months) needs a `PlanPriceVersion`
row for `QUARTERLY` and `SEMIANNUAL` on every plan, in addition to the
`MONTHLY`/`YEARLY` rows that already existed. `plan-catalog.seeder.cjs` is
where those rows are created (`upsertPrices`), but it is versioned `2` and
`seed-runner.cjs`'s run-once guard means its `run()` — `upsertPrices` included
— never executes again once an install's `plan-catalog` v2 has already
completed. That is every install seeded before this feature shipped,
production included. Bumping `plan-catalog` to v3 would not fix this: v3's
`run()` would re-evaluate `matchesLegacyFingerprint` for every plan, find it
false (v2 already moved every plan off the legacy baseline), and fall through
to the branch that writes only `modelAccessMode` and a null
`weeklyTokenQuota` — the same trap already documented for the PAYG allowance
migration, applied to a different pair of columns.

`plan-quarterly-semiannual-pricing.seeder.cjs` exists for exactly this reason,
mirroring `plan-payg-allowance.seeder.cjs`'s pattern: a new, independently
versioned seeder that targets EXISTING installs, reads plans and their
currently-active `MONTHLY` price LIVE from the database (never the static
`plan-catalog.json`, since an operator may have re-priced a plan or added a
new one since that file shipped), and is keyed on `PlanPriceVersion.activeKey`
existence so running it twice is a no-op.

**This seeder must run before any deploy that expects all four checkout terms
to be selectable on an existing install.** Without it, `QUARTERLY` and
`SEMIANNUAL` render as "unavailable for this interval" on every install that
seeded before this feature shipped — not because the frontend or the checkout
flow is broken, but because the price rows simply do not exist yet. It is
registered in `seed.cjs` immediately after `planCatalogSeeder`, since it
depends on the plans (and their active monthly prices) already existing.

## Team plan description is rewritten by its own seeder (2026-09-29)

The seeded Team description promised pooled team billing and a shared account,
neither of which exists (REQ-POS-005). `plan-catalog.json` carries the accurate
text for fresh installs; `plan-team-description.seeder.cjs` (v1) rewrites
existing rows. It writes **only** `description`, keyed on the old text, so an
administrator's own wording survives and a rerun is a no-op. Same reason as the
seeders above: `plan-catalog`'s else branch never writes `description`, and the
catalog checksum payload does not include it. Prices, quotas and feature rules
are untouched.

## A trial is superseded, not merely expired (2026-09-06)

`PlanTrialRedemption` is written once per user (`userId` unique) and
deliberately outlives the assignment that created it, so an operator can still
reconstruct "when did they trial" long after a paid or admin grant replaced it.
That is the right model, and it makes `expiresAt` a trap: it keeps counting
down forever, whatever else has happened to the account.

Reported: an operator granted a user Pro for a year, and the admin panel went on
showing **"Free trial — 23 days left"** beside the grant, plus **"This is an
ordinary free account. Nothing has been bought and nothing is owed."** Both were
read from a single field in isolation.

- `AdminUserPlanService.toTrial` now takes the assignment as well and reports
  `state: ACTIVE | EXPIRED | SUPERSEDED`. The test is **identity** —
  `redemption.assignmentId` against the assignment in force — not plan slug or
  grant type, so it does not have to enumerate everything that can replace a
  trial. SUPERSEDED beats EXPIRED when both hold: the user did not lose
  anything on that date, they hold the replacement.
- **No assignment at all is EXPIRED, not SUPERSEDED.** Nothing replaced it, and
  SUPERSEDED would assert a replacement that does not exist.
- `isExpired` is kept and still means only "the clock passed `expiresAt`". A
  SUPERSEDED trial is routinely `isExpired: false`.

**Entitlements were never affected, and this is worth knowing before hunting for
a bigger bug.** Access comes from the ACTIVE assignment:
`findActiveTrialState` reads that row's `plan.isTrial`, so a Pro grant reports
no trial, `resolveTrialPresentation` nulls `trialEndsAt` for a non-trial plan,
and `PLAN_TRIAL_EXPIRED` can only fire when the plan in force is itself a
trial. The end user saw the correct thing throughout; only the admin panel lied.

## Trial length is per plan; admins can extend it (adr-140-dynamic-trial-length, 2026-10-01)

- `Plan.trialDurationDays` (1..3650, NULL off a trial plan) is the only source of
  a trial's length. `assignTrialPlanOnce` reads it; there is no `30` in the grant
  path. The seeder's 30 is a fresh-database default and an edited plan row is
  never overwritten. DTO, plan form and the DB CHECK share the 1..3650 range.
- `POST /admin/plans/users/:userId/trial-days { days, reason }` adds days to the
  user's trial (`PlansService.extendUserTrial`): from the current end, or from
  today if it lapsed. Refused with `PLAN_TRIAL_NOT_FOUND` (no redemption) or
  `PLAN_TRIAL_SUPERSEDED` (another grant replaced it). Audit action
  `plan_trial_days_added`.
- `POST /admin/plans/users/:userId/assign` takes `durationDays` OR
  `durationMonths`. `durationDays` on a trial plan is "Set to Free for N days": it
  also works for a spent trial and re-points the lifetime `PlanTrialRedemption`
  at the new assignment (so it reads ACTIVE). A later Pro grant names a
  different assignment, so it reads SUPERSEDED and no countdown is shown. Audit
  action `plan_admin_trial_grant`. A reason is required.
- Known gap: `EntitlementApplier.revoke` still writes a 30-day trial for a user
  with no redemption; it should read the free plan's `trialDurationDays`.

Rule: [28-billing-integrity-and-api-contracts](../../rules/28-billing-integrity-and-api-contracts.md)
§9 and §10.

## Sessions across tabs and "Remember me" (ADR-106, 2026-09-19)

- **A refresh token may be reused for 30 s** (`REFRESH_REUSE_GRACE_MS`), and
  gets a sibling in the same family. Two tabs, two VS Code windows or a lost
  response do this; every one of them used to revoke the family and sign the
  user out everywhere. Reuse after 30 s, or of a revoked or expired token,
  still revokes the family.
- A lost `rotateSession` race re-reads the session (`findSessionById`) before
  deciding. A logout that won the race still revokes.
- `Session.persistent` is "Remember me": `rememberMe` on login, kept on every
  rotation. Off means 12 h (`SESSION_ONLY_REFRESH_TTL_SECONDS`); on means
  `JWT_REFRESH_EXPIRY`. Absent means on, which covers VS Code, the device flow
  and old clients.
- Prove any change with `scripts/qa-lab/session-refresh-experiment.mjs`
  ([skills/debug-a-sign-out.md](../../skills/debug-a-sign-out.md)).

## Media plan gates (ADR-122, 2026-09-25)

`Plan.allowImageGeneration` / `allowHelperVision` / `allowTextToSpeech`
(`DEFAULT false`) and `Plan.maxVideoSeconds` (`Int? DEFAULT 60`; `null`
unlimited, `0` disabled) ride the entitlements payload as
`plan.featureGates.*` and `plan.limits.maxVideoSeconds`. Free: off / 60 s;
every paid slug: on / 600 s. Fresh installs take them from the `media` block of
`plan-catalog.json` (`mediaGateProjections` in the seeder, deliberately NOT in
the checksummed payload); existing rows from migration
`20260925200000_add_media_plan_gates`, by slug. The admin entitlement plan has
all on and `maxVideoSeconds: null`. Deploy auth-service before image-service
and chat-service: an old payload reads as "gate off" and refuses paid users.

## Plugins plan gate (plugins-and-mcp-design.md section 5, 2026-10-13)

`Plan.allowPlugins` is `DEFAULT true` (every other gate is opt-in): the module is ON for every plan, Free and custom
plans included. `Plan.maxInstalledPlugins` (`Int? DEFAULT 5`) and `Plan.maxUserMcpServers` (`Int? DEFAULT 0`) are
`null` unlimited, `0` disabled, so the column defaults are the Free values and a row can never land on unlimited by
omission. Tiers (installs / own servers): free and trial 5 / 0, starter 10 / 3, plus 25 / 5, pro 50 / 10, team and scale
100 / 25, unlimited null / null. They ride the entitlements payload as `plan.featureGates.allowPlugins` and
`plan.limits.maxInstalledPlugins` / `maxUserMcpServers`; the admin entitlement plan has the gate on and both caps
`null`. Fresh installs take them from the `plugins` block of `plan-catalog.json` (`pluginGateProjections`, not in
the checksummed payload); existing rows from migration `20261013100000_add_plugins_plan_gate`, whose cap updates only
touch a row still holding the column default, so a tuned number survives a re-run. Permissions `PLUGINS_USE`,
`PLUGINS_INSTALL`, `PLUGINS_MANAGE_OWN_SERVERS` are USER defaults (the boot reconciler back-fills them);
`PLUGINS_ADMIN` is ADMIN only. Deploy auth-service before the plugin service: an old payload reads as "gate off".

### Plugin calls are metered as `PLUGIN_CALLS` (batch 2, 2026-10-13)

`PlanFeatureKey.PLUGIN_CALLS` (window `DAY`) is reserved by claw-plugin-service per tool call through the existing
`POST internal/quota/features/reserve` and settled (`CONSUME` when the call ran, `RELEASE` when it failed) through
`features/settle`; no per-feature code exists, the feature key is the only input. `Plan.maxPluginCallsPerDay`
(`Int? DEFAULT 20`, `null` unlimited, `0` disabled) is the one value an administrator edits (create and update plan DTOs, admin
plan view, public catalog, `plan.limits.maxPluginCallsPerDay` in the entitlements payload; the admin entitlement plan is
`null`). The `plan_feature_rules` row the reservation reads is DERIVED from it, and the two are written in ONE transaction:
`PlansRepository.create` always writes the rule and `update` rewrites it whenever the update carries the field (`toPluginCallsRule`:
`null` ENABLED, `0` DISABLED, `n` LIMITED `DAY`; the shared writer is `upsertFeatureRuleOn`, which `PlanBillingRepository.upsertFeatureRule`
also uses), so the payload and the enforced rule cannot disagree and a failed rule write rolls the plan write back. A plan with no
rule fails closed (the plan reads as disabled), which is why a custom plan can never be created without one.
The daily cap cannot be overshot by concurrent calls: `FeaturePolicyService.reserve` hands the whole decision to
`FeatureUsageRepository.reserveWithinLimit`, which counts and writes inside one transaction under
`pg_advisory_xact_lock(hashtext(userId || feature))`. Retries are keyed by `requestId`: a RESERVED or CONSUMED row is returned as is
with no cap check, a RELEASED row is revived to RESERVED only after the cap check passes, and a new request is checked then inserted.
This covers every metered feature, not only plugin calls.
Tiers (calls per day): free and trial 20, starter 100, plus 300, pro 1000, team and scale 5000, unlimited null. Fresh installs take
the `plugins.maxCallsPerDay` and `features.PLUGIN_CALLS` blocks of `plan-catalog.json` (they must agree; a spec checks it);
existing databases take migrations `20261013120000_add_plugin_calls_feature` (enum value alone) and
`20261013120100_plugin_calls_plan_limits` (column, per-tier numbers only where the column still holds 20, then one rule row per
plan with `ON CONFLICT DO NOTHING`, so a re-run never re-enables or overwrites an administrator's value). Specs:
`plugin-calls-plan-gate.spec.ts`, `plugin-calls-reservation.spec.ts`, `plans.service.plugin-calls.spec.ts`,
`plans.repository.plugin-calls.spec.ts` (one-transaction rollback), `feature-usage.repository.spec.ts` (serialised interleaving,
with a no-lock control, and the retry cases), `plan-billing.repository.spec.ts`.

## Free credit-connector requests (ADR-142, 2026-10-01)

`Plan.creditConnectorFreeRequestsPerMonth` (`Int? DEFAULT 0`; `null` unlimited, `0` none) lets a user
make N requests per UTC month in TOTAL across all credit connectors (one counter row `(user, '*', month)`), absorbed by the platform. Amended 2026-10-02: a finite N is counted FIRST for a user with no purchased credit and is enforced even with `payg.credit.enabled` off or missing (count only, no wallet charge); a spent cap is 402 `PAYG_FREE_ALLOWANCE_EXHAUSTED`. Free = 2,
every other plan = 0. Create/update plan DTOs take `0..1,000,000` or `null`; the admin plan view and
the public catalog return it. Fresh installs: `creditAllowanceProjection` in
`plan-catalog.seeder.cjs` (NOT in the checksummed payload; an administrator-edited row is never
rewritten). Existing installs: migration `20261001150000_credit_connector_free_allowance`, which seeds
Free = 2 only when it creates the column.

- Lives in `modules/credit`: `CreditFreeAllowanceService` (policy, clamp, counter),
  `CreditFreeAllowanceRepository` (the guarded single-statement upsert on
  `credit_free_allowance_usage`), eligibility and ceiling maths in
  `utilities/credit-free-allowance.utility.ts`, surfaces and constants in
  `constants/credit-free-allowance.constants.ts`.
- `CreditReservationManager` tries credit FIRST and calls the allowance only when credit cannot cover
  the call. The record is a `WeightedUsageRecord` with `isFreeAllowance`; `finalize` moves no money;
  `release` gives the slot back once (gated on `markReleased`) and appends a `FREE_ALLOWANCE` row.
- Only token-priced surfaces are eligible; never image, video, transcription or TTS.
- `GET /credit/me` adds `freeAllowance: { limit, used, remaining, resetsAt } | null`.
- A new `PaygSurface` is NOT free until it is added to `FREE_ALLOWANCE_ELIGIBLE_SURFACES`.
- Raising the allowance shrinks each free request's cost budget (`ceiling / allowance`); raise
  `monthlyProviderCostCeilingMicroUsd` with it.

## Sign-up failures have stable codes (2026-10-02)

`POST /auth/register` never answers an expected failure with a raw 500. The web
client maps each code to translated copy (`utilities/signup-failure.utility.ts`).

| Failure                                                          | Status | Code                                                                 |
| ---------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| Field format (email, password rules, names, phone E.164)         | 400    | `VALIDATION_FAILED` + `errors: { field: [RegisterValidationIssue] }` |
| Weak password (manager defence in depth)                         | 400    | `WEAK_PASSWORD`                                                      |
| Address already registered (incl. a concurrent P2002 on `email`) | 409    | `DUPLICATE_ENTITY`                                                   |
| Throttled (route budget or global throttler)                     | 429    | `RATE_LIMITED` + `Retry-After` header (rules/58)                     |
| Default plan could not be assigned                               | 503    | `SIGNUP_PLAN_ASSIGNMENT_FAILED`                                      |
| Anything else                                                    | 500    | none (client shows the generic copy + `x-request-id`)                |

- **Duplicate email stays `DUPLICATE_ENTITY`.** It is the one enumeration surface
  ADR-096 / rules/43 §1 keep on purpose. Do not add a second.
- **Zod messages in `register.dto.ts` are `RegisterValidationIssue` codes, not prose.**
  The frontend mirrors the enum in `src/enums/register-validation-issue.enum.ts`.
- **Plan assignment is compensated, not transactional:** the user row and the plan
  are written by two repositories, so on failure `AuthManager` deletes the user
  (`AuthRepository.deleteUserById`, relations cascade) and throws the 503. A retry
  can never hit `DUPLICATE_ENTITY` on a half-made account.
- **A failed verification email does not fail sign-up.** The account is complete;
  the response says `verificationEmailSent: false` and `/check-email` shows a
  notice beside the resend button. Phone is not unique; there is no captcha and no
  registration toggle. `/auth/register` has its own budget (5/h per IP, 3/h per
  address) on top of the global throttler — see the next section.

## Sign-in / sign-up route budgets (rules/58, ADR-147, 2026-10-02)

Every public route in `AuthController` and `VscodeAuthorizationController` carries
`@AuthRateLimit(AuthRateLimitPolicy.X)` (`modules/auth/decorators/`). The guard
counts Redis fixed windows (`RedisService.incrementWindow`, one Lua call) BEFORE the
Zod pipe and before any account lookup, then answers 429 + `Retry-After` +
`RATE_LIMITED`. Budgets: `constants/auth-rate-limit.constants.ts` — the only place.

- Login: 10 / 15 min per IP + address, 30 / 15 min per IP. Register: 5 / h per IP,
  3 / h per address. Confirms: 10 / 15 min per IP. Reset request and resend keep
  `EmailDispatchCooldownService` and add 5 / h per IP. Refresh 60 / min per IP.
- Address = trim + lowercase only (keep `+tags` and dots). Every key part is SHA-256
  hashed: `auth:rl:<policy>:<ip|email|ip-email>:<hash>`. Never log a key or address.
- IP = `resolveClientAddress` from `@claw/shared-auth`: X-Real-IP only when the peer
  IS nginx (loopback, docker name `nginx`, or `TRUSTED_PROXY_ADDRESSES`), else the
  peer. A private peer is NOT enough (LAN client on :4001). Never X-Forwarded-For.
- **Only failed logins spend the login budget.** `AuthRateLimitSuccessInterceptor`
  (added by the same decorator) calls `AuthRateLimitService.settle` after a 2xx:
  rules with `onSuccess: RESET` delete their key, `REFUND` gives one hit back via
  `RedisService.refundWindow` (never below zero). Only login sets `onSuccess`.
- **Fails open**: Redis error or no reply in 250 ms → request allowed + warning. The
  ioredis client has `maxRetriesPerRequest: null`; without the timeout an outage hangs login.
- No lockout. A new public auth route needs a policy in the same commit.
- Runbook (see 429s, raise a limit, clear a key): `docs/11-runbooks/runbook-auth-rate-limits.md`.

## Email Change (Batch 09)

The email-change API comprises authenticated `/api/v1/users/me/email-change` request, verify-current, resend, status, and cancel operations plus the public `/api/v1/auth/email-change/confirm` token endpoint. Authenticated handlers must derive ownership from the current principal; never accept a user ID for these routes. Keep mutation throttles at five requests per minute and preserve generic request/resend responses so account or delivery state cannot be enumerated.

Persist only OTP and confirmation-token hashes. Enforce expiry, resend cooldown, attempt ceilings, single-use transitions, and a transactional final email swap. Operational delivery requires applying the Prisma migration, regenerating the Prisma client, rebuilding the auth-service through the supported repository lifecycle command, and verifying service health plus the workflow against the rebuilt container.

**Batch deviation:** inline English SMTP templates intentionally follow the existing auth email adapter because this repository has no email-template or email-i18n layer. Do not invent a parallel template system as part of this batch.

## Ops access tokens (ADR-102)

- `modules/ops-tokens` mints read-only `claw_ops_` tokens. Only the SHA-256 is
  stored, and the token is shown once.
- Endpoints: `admin/ops-tokens` (list, create, revoke) and
  `internal/ops-tokens/verify` (service token).
- Never log a token or its hash.
- Never add a write scope. A new read surface gets a new scope.

## Grafana access cookie (ADR-115)

- `modules/grafana-access` mints and checks the cookie nginx's `auth_request`
  asks about for every `/grafana/*` request. `POST /auth/grafana-access`
  (ADMIN + `ADMIN_SYSTEM_VIEW`) sets `claw_grafana` — httpOnly, Secure, Lax,
  `Path=/grafana`. `GET /auth/grafana-access/verify` is `@Public` (nginx is
  the caller, carrying the cookie, not a Bearer token) and answers 204 or
  401, with the admin's email in `X-Grafana-User`.
- The cookie is signed with a key **derived** from `JWT_SECRET`
  (`deriveScopedKey`, `common/utilities/scoped-token.utility.ts`) under its
  own audience — never `JWT_SECRET` directly, so an access token and a
  Grafana cookie can never verify as each other.
- Its lifetime is `min(15 min, JWT_ACCESS_EXPIRY)` — never widen past that
  without checking `REVOCATION_CHECK_TIMEOUT_MS`'s TTL assumption in
  `@claw/shared-auth`: a longer cookie could outlive its own revocation entry.
- `verify` checks the session id against the SAME Redis revocation key every
  service's `SessionRevocationGuard` reads, and fails OPEN on a Redis error
  like every other revocation check here — Grafana is what an operator opens
  during an incident.
- Never add a second cookie or reuse this one for another purpose. A new
  narrow surface gets its own `deriveScopedKey` context string.

## Deployment live progress (modules/deployment)

- `GithubActionsAdapter.latestRun()` reads TWO lanes: `deploy-production.yml`
  runs (manual dispatches only) and `release.yml` runs (the automatic lane —
  release calls deploy-production as a reusable workflow, so those rollouts
  never show in deploy-production's own run list). Reading one lane pinned the
  admin panel on the last manual run.
- Selection lives in `utilities/deployment-run.utility.ts`
  (`rankRunCandidates`, `selectDeployJobs`): active run first, then newest
  `created_at`; skipped runs dropped; for a release run only jobs named
  `deploy / …` (`GITHUB_RELEASE_DEPLOY_JOB_PREFIX`) are shown; a finished
  release run with no deploy job is passed over. Job reads per poll are capped
  by `GITHUB_MAX_RUN_PROBES` — it is on the page's poll path.
- Renaming the `deploy` job id in `release.yml` changes the job-name prefix and
  silently hides every automatic rollout — update the constant with it.

## Trial length has no database constant (incident 2026-10-01)

No CHECK may pin a trial day count: `plan_trial_redemptions_duration_check` is now
`expires_at > started_at` (migration `20261002090000`). The guard spec
`src/modules/plans/__tests__/trial-length-constraints.spec.ts` enforces it. The dev
database had drifted and lacked the old constraint, so test schema changes against
a migrated database, not only the dev one.

## Prompt-cache writes in the credit path (2026-10-01, ADR-153)

- `reserve` `cacheWritePromptTokens` and `finalize` `usage.cacheCreationPromptTokens` are additive,
  default 0. The write is priced by `calculateCostMicroUsd` from `cacheWritePerMillionMicroUsd` ONLY
  when that rate is positive, else as ordinary input. Never bill a write at zero or at a guessed premium.
- `applySettlement` is `min(actual, held)`: the hold MUST be sized for the premium
  (`estimateInputCostMicroUsd` 4th argument) or it is absorbed. `credit-cache-write.spec.ts` proves
  both directions; keep it green.
- `weighted_usage_records.raw_cache_write_tokens` attributes the write slice per settled row.

## Web Push (ADR-166)

`modules/notifications` also sends browser push. `web-push` is imported only in `WebPushAdapter`. VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are all-or-nothing; never log a subscription endpoint. Push text comes from the email dictionaries (`buildPushMessage`), never from new strings.

## Observability pages (ADR-169)

`GET /api/v1/admin/observability/*` (`overview`, `filter-options`, `health`, `users`, `users/export`, `providers[/:provider]`,
`models[/detail]`, `plans`, `workflows`) lives in `modules/admin-statistics`, ADMIN role plus `ADMIN_USAGE_VIEW`. Lists are
`page` + `limit` (max 100) over ALL matching rows, never a top-N. Only `users` (EVERY request, any page) and `users/export` return
full emails and are audited; everything else masks. Settle time is `finalized_at - created_at`, NOT provider latency; settle / refund rate is
settled vs released holds, NOT an HTTP success rate. Only the health queries read RELEASED rows. Every window read runs under `SET LOCAL statement_timeout`, in batches of at most six per page. A row's plan is `COALESCE(w.plan_id, u.active_plan_id)` (nothing fills `plan_id`); settle-time metrics skip legacy rows (`request_id = reservation_id`); series are zero-filled. Wire types are `AdminObs*` in
`@claw/shared-types`. Details: `docs/04-backend/admin-usage-explorer-endpoints.md`.

## Threads job budget (ADR-159, addendum 2026-10-14)

`modules/entitlements/repositories/thread-job-budget.repository.ts` is the aggregate spend cap of one Threads job; every transaction is SERIALIZABLE on one budget row, so parallel authors of the same job conflict by design.

- **Every transaction is wrapped in `retryOnSerializationFailure`** (bounded 8 attempts, full-jitter backoff, `P2034`; `reserveCall` also retries `P2002`). Only a transaction that still conflicts surfaces, as a `503 THREAD_BUDGET_BUSY`. Never map a conflict to a refusal: it used to reach the user as "credit checks unavailable".
- **`reserveCall` answers an outcome, not a boolean** (`ThreadCallReserveOutcome`): `RESERVED`, `ALREADY_RESERVED` proceed; `CAP_EXCEEDED` (with `remainingMicroUsd`), `BUDGET_CLOSED`, `BUDGET_NOT_FOUND`, `ALREADY_FINALIZED`, `ALREADY_RELEASED` do not. The wire stays `true`/`false` unless the body sets `detailed: true`, so an older meter keeps working. Money is integer micro-USD end to end.
- **A request id is idempotent.** Same id and same credit hold: answered from the row. A FINALIZED/RELEASED row asked for again with a NEW hold is a genuine retry and is reopened; what it already spent stays counted (`settledMicroUsd` accumulates). A RESERVED row asked for with a new hold follows it and the old hold is released by `ThreadJobBudgetService`.
- **The budget counts what was CHARGED.** `CreditReservationManager.finalize` calls `ThreadJobBudgetCreditLinkService.settleForReservation(hold, chargedMicroUsd)` (0 for a free-allowance call), because the finalize reply withholds the cost from non-PAYG billing modes. The meter's own `calls/finalize` is only the fallback, at the hold. Do not read the budget's spend from the finalize reply.
- **A Threads hold is sized to the cap left.** `credit/reserve` takes an optional `threadJobBudgetId`; the manager clamps the hold to `cap - reserved - spent` (`spendCeilingMicroUsd`), so a long answer is shortened instead of being refused. A model with no published price (routing answers `isFallbackRate: true`, the provider's dearest rate) is refused for a Threads call with `PAYG_MODEL_UNPRICED` BEFORE any hold (D06-b); a plain chat is still held at the fallback rate. The fallback price itself is routing-service's.
- **`close` releases in-flight calls** in the same transaction (a cancelled job's calls are abandoned), gives their credit holds back, then consumes (FINALIZED) or returns (RELEASED) the plan allowance. A repeated close re-runs the idempotent allowance step; a failed one answers 503 so the caller retries.
- **`ThreadJobBudgetSweeperService`** (Redis-locked, bounded) closes ACTIVE budgets older than 12 h as RELEASED and releases plan-allowance holds stranded on an already-closed budget. It is the backstop for a job that died without closing; the caller still closes on failure.
- `POST internal/threads/budgets/summary` returns `{status, capMicroUsd, reservedMicroUsd, spentMicroUsd, settledMicroUsd, remainingMicroUsd, freeAllowanceMicroUsd}` for the generation service's spend display. `settledMicroUsd` (D-L2-03, read-only, no schema change) is the budget row's settled total whatever the billing mode, so a Pro plan-wallet job shows its real figure without chat-service reporting it. A Free included-plan call settles at 0 by design (the user is charged nothing), so a Free job reads 0 here; the Free meter is the figure for that.
- **Platform-failed jobs (ADR-162 addendum 2026-10-14).** `close` also accepts `PLATFORM_FAILED` (`ThreadJobBudgetCloseStatus`, Prisma `ThreadJobBudgetState`): the models ran or the platform broke and NO draft completed. It closes like RELEASED (in-flight calls released, credit holds given back, the plan-feature holds - including the Free user's one lifetime Thread - settled RELEASE) and ALSO refunds the Free meter money of the job's FINISHED free calls: `ThreadJobBudgetFreeMeterRepository.refundFinishedCalls` claims `thread_job_budgets.free_refunded_at` and lowers `credit_free_allowance_usage.spent_micro_usd` (never below 0, per month the call was charged to) in ONE transaction, so it happens exactly once however often the close is retried or raced. Request slots are not touched (a Thread takes none). A refund that fails still releases the lifetime hold, then answers `503 THREAD_BUDGET_BUSY` so the caller retries (idempotent). The caller decides what is platform-caused (the code list lives in thread-generation); REVIEW_NOT_PASSED and owner/billing refusals close RELEASED/FINALIZED as before. The stale-budget sweeper still closes as RELEASED (no refund of finished calls); a late finalize of a call whose credit release failed can leave up to one call's cost on the meter.
- `summary` also returns `freeAllowanceMicroUsd`: what the Free meter currently charges for the job (finished calls at real cost, in-flight at their hold; 0 for non-free jobs and after the refund), read from the free usage rows linked through the budget calls' `credit_reservation_id`. Progress shows it for Free jobs, whose `settledMicroUsd` is 0 by design. An unreadable meter reports 0, never an error.
- **Refusal codes inside a Thread (D-L2-06).** `takeHold` tells three 402s apart: the job's cap has money but less than the call needs and the wallet could pay -> `PAYG_CAP_TOO_LOW` (`availableMicroUsd` is the cap left); the wallet is genuinely empty or the cap is fully spent -> `PAYG_CREDIT_EXHAUSTED`; a model with no usable price -> `PAYG_MODEL_UNPRICED` (refused in `classify` before any hold). The meter (`readThreadCallVerdict`) maps a `CAP_EXCEEDED` outcome with cap left to `PAYG_CAP_TOO_LOW` too. The wire is unchanged for older callers (a bare boolean unless `detailed: true`).
- Free + Threads: `PaygSurface.THREADS` is in `FREE_ALLOWANCE_ELIGIBLE_SURFACES` and in `FREE_ALLOWANCE_COUNT_WAIVED_SURFACES`: its calls are bounded by the money meter and the price limit and take NO slot on the monthly request count under EVERY Free plan shape, with or without a meter (D-L2-04: one Thread had driven the counter to 12 of 10; D-P5-01 2026-10-14: production's Free plan had NO meter and a lower count, so the waiver that required a meter let the count end the first Thread at its Nth call with `PAYG_FREE_ALLOWANCE_EXHAUSTED`, 402, spent 6,475, no refund). The admission carries `countsSlot`, the usage ledger row is written `FREE_ALLOWANCE_USED:UNCOUNTED`, and a release reads that row (`findFreeAllowanceCountsSlot`) so it gives back the hold and no slot. See the ADR-162 addendum.
- **Plan-config assumptions for Threads on Free (D-P5-01, ADR-162 addendum 2026-10-14).** Read from `plans`: `credit_connector_free_requests_per_month` (count; `0` = allowance off, so a Free Thread is refused `PAYG_CREDIT_EXHAUSTED`, `null` = unlimited), `credit_connector_free_budget_micro_usd` (meter, optional), `credit_connector_free_max_model_output_micro_usd` (price limit, optional), `monthly_provider_cost_ceiling_micro_usd` (per-request ceiling = min($0.15, ceiling / count)). The ADR-162 migration sets the meter ONLY on a Free row whose count is exactly 10 and whose meter and limit are unset, so a production row with another count (5, the 2 of ADR-142) has NO meter. Every shape must finish its one Thread: a Threads call is count-waived (limit lifted, no slot) whether or not a meter exists; what bounds it is the meter when present, else the plan's lifetime Thread allowance, the job's spend cap and the per-request ceiling. Chat on the same plan is still held to the count. The table-driven specs in `credit-free-allowance.service.spec.ts` pin five shapes. An admin who wants a hard monthly dollar bound on Free Threads must set the meter. The generation service closes a job that failed with `PAYG_FREE_ALLOWANCE_EXHAUSTED` as `PLATFORM_FAILED` (a Thread takes no slot, so that code is the platform's accounting), which returns the lifetime Thread and the meter money.
- **Allowance refusal body.** When a plan feature a Thread reserves is off, or its allowance is used up or held by a running generation, `reserve` answers 403 `{code: THREAD_ALLOWANCE_UNAVAILABLE, message, feature, reason, used, limit, window}` (`threadAllowanceRefusal`); the message names used and limit and says when it frees up (a LIFETIME allowance frees only when the running generation ends or fails on our side). threads-service still collapses every 403 from generation into its own generic message; passing the body through is open (see the ADR addendum).
- Specs: `entitlements/repositories/__tests__/thread-job-budget.repository.spec.ts` runs real `Promise.all` interleavings against `helpers/fake-thread-budget-prisma.helper.ts` (a snapshot-and-conflict stand-in for SERIALIZABLE Postgres).

- Platform-failure refunds are capped at `THREAD_FREE_REFUNDS_PER_DAY` (5) per user per rolling 24 h (`THREAD_FREE_REFUND_WINDOW_MS`). Past the cap a `PLATFORM_FAILED` close is stored as `FINALIZED` (the attempt is used, no money refund), so deliberately failing jobs cannot be turned into unlimited free model calls (security review, 2026-10-14). A retried close of such a budget is answered as done.

## Public profiles for Threads and community notifications (ADR-180, 2026-10-14)

- **`POST /api/v1/internal/users/public-profiles`** (service token, body `{ ids: string[] }`, 0-100 ids, strict) -> `[{ id, username, displayName }]` and **`GET /api/v1/internal/users/by-username/:username`** (case-insensitive, 404 when unknown or malformed) are in `UsersInternalController`, declared before the `:id/...` routes. They return ACTIVE accounts only; unknown, pending and suspended ids are simply absent. `displayName` = first + last name when set, else the username (`toPublicProfile`). Never add an email, phone, role or status to `PublicProfile`.
- **Six new notification kinds** (`THREAD_COMMENTED`, `THREAD_COMMENT_REPLIED`, `THREAD_MENTIONED`, `THREAD_REACTED`, `THREAD_COMMENT_REACTED`, `THREAD_CHANGE_REQUESTED`) follow exactly how `THREAD_PUBLISHED` works: `UserNotificationKind` (shared-types), `AuthEmailKind`, `NOTIFICATION_EMAIL_KIND`, copy in all 13 `auth/email/copy/*.copy.ts` (the email uses only `{value}` = the Thread title), push text from the same copy. The request DTO accepts any `UserNotificationKind` and `params` of up to 8 values of 200 characters; the community params are `actorName`, `actorUsername`, `title`, `excerpt`. A new kind needs the enum, the email kind, the map and 13 translations or the completeness spec fails. `MCP_SERVER_APPROVED` and `MCP_SERVER_REJECTED` (sent by plugin-service, ADR-187) follow the same path; the email uses `{value}` = the server name and the rejection reason travels only in the in-app and push text (`excerpt`).
- **Three more kinds for reader change requests (ADR-188):** `THREAD_CHANGE_ACCEPTED`, `THREAD_CHANGE_APPLIED`, `THREAD_CHANGE_DECLINED`, sent to the person who suggested the change. Same path as above (enum, `AuthEmailKind`, `NOTIFICATION_EMAIL_KIND`, 13 copy files; `{value}` = the Thread title; the accepted and declined emails open "My suggestions"). No schema change: the `kind` column is a string.
- **Free refund cap can overshoot (known, by design).** `THREAD_FREE_REFUNDS_PER_DAY` (5) is checked by counting recent refunds and then writing the refund; the count and the write are not atomic across concurrent closes. Several `PLATFORM_FAILED` closes of the same user that run at the same moment can all read a count below the cap, so the cap can be exceeded by at most `MAX_ACTIVE_GENERATIONS_PER_OWNER - 1` (active-generations cap 3 minus 1 = 2) refunds. Each refund is still exactly-once per job (`free_refunded_at` claim) and bounded by the Free meter, so the overshoot is capped and harmless; do not "fix" it with a global lock without a decision.
