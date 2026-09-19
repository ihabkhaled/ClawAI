# ADR-110: AI-written files have a daily allowance per plan; exports are free

**Status**: Accepted
**Date**: 2026-09-19

## Context

The owner asked for files on all plans, with limits. On 2026-09-19 they chose
**daily** limits, "Free 15/day, others incremental, generous", and ruled that
exports of an answer the user already has never count.

The plan-feature system had a ledger (`FeatureUsageRecord`) and a
`reserve`/`consume` policy, but its only caller, `features/consume`, recorded
**after** the work. An exhausted allowance was logged and nothing more. No
metered feature could refuse a request.

## Decision

1. **`PlanFeatureKey.FILE_GENERATION`**, as a daily (`DAY`) rule per plan.
   Values are seeded by migration `20260919200100_seed_file_generation_limits`
   and by `plan-catalog.json`:

   | Plan                     | AI-written files per day |
   | ------------------------ | -----------------------: |
   | Free                     |                       15 |
   | Starter                  |                       30 |
   | Plus                     |                       75 |
   | Pro                      |                      200 |
   | Team / Scale / Unlimited |                   no cap |

   The enum value has its own migration, because Postgres cannot use a new
   enum value inside the transaction that added it. The seed skips existing
   rows, so an operator's later change survives redeploys.

2. **Reserve before, settle after.** auth-service gains
   `POST internal/quota/features/reserve`, which returns
   `{allowed, reservationId}` or `{allowed:false, reason, used, limit, window}`,
   and `POST internal/quota/features/settle` with `CONSUME` or `RELEASE`.
   Admins and plan-less users are observed, never refused.
   `EntitlementsAdapter` exposes both calls.
3. **chat-service checks before the model writes.**
   - `callFileGenerationService` reserves first, so a refusal costs no tokens.
   - It consumes once the file is queued, and releases if writing or
     queueing fails.
   - Every execution has its own reservation id, so "regenerate with AI"
     counts again.
   - A limit is a business rule, not a security boundary. If auth-service is
     unreachable, the file is allowed and nothing is settled.
4. **The refusal is a reply, not an error.**
   - The execution runs asynchronously, after the send returned 201, so it
     cannot answer 429.
   - The assistant message gets `metadata.type = 'file_limit'` with
     `{used, limit, window}`, plus English fallback text.
   - The chat renders `FileLimitNotice`: translated in 13 locales, with the
     numbers, and "See plans".
5. **Exports and rebuilds never count.** Neither calls a model.
6. The billing page's "Included features" list shows the new key automatically,
   labelled "AI-written files" in 13 locales ("1 of 15 used").

## Consequences

- Two limits apply to a file: this count, and the plan's token allowance
  (`docs/business/plan-allowances.md`). Whichever runs out first binds. Free's
  daily token pace usually ends before 15 large files do.
- The admin UI cannot edit feature rules yet; a change is one row in
  `plan_feature_rules`.
- `internal/quota/*` required no credential when this shipped, relying on
  nginx not routing it. Since 2026-09-20 it requires the shared service token
  ([TD-035](../14-risk-debt/technical-debt.md)), as does
  `internal/users/:id/entitlements`.

## Verified

- **Specs:**
  - auth: reserve within allowance, refusal with numbers, admin and plan-less
    never refused, settle both ways.
  - adapter: the reserve and settle wire format.
  - chat access-control: pass-through; fail-open when unreachable; settle
    skips a null reservation and never throws.
  - chat manager: consume once queued, release on failure, refuse without any
    model call.
  - frontend: the notice and the metadata reader.
- **Live (2026-09-19):**
  - Setup: a new Free user, with Free's limit set to 1 for the test.
  - Request 1, "make me a pdf with …", queued a PDF.
  - Request 2 got `type: file_limit`, `{used:1, limit:1, window:DAY}`, with no
    generation id.
  - The ledger held exactly 1 `FILE_GENERATION` row. The limit was then
    restored to 15, and billing showed "1 of 15 used".
  - The notice rendered, with no export buttons on the refused reply, at
    1440, 768, 390 and 844×390 wide, with no horizontal scroll, and in Arabic
    RTL at 390.
