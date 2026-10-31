-- Monthly connector credit is 50% of the plan price on every paid plan (owner order 2026-10-31,
-- ADR-209). It was 30% on Starter and Plus and 25% on Pro, Team, Scale and Unlimited.
--
-- Additive and guarded: a row moves only while it still holds the value this release shipped for
-- it (3000 for starter/plus, 2500 for pro/team/scale/unlimited). A rate an administrator already
-- edited is never overwritten, and a second run matches nothing (every row is then 5000), so
-- re-running is a no-op. Free is left alone: a $0 price converts to $0 credit at any rate.
--
-- Nothing is granted retroactively. Wallets keep their balance. The new share is applied when each
-- wallet rolls into its next UTC-month grant period (CreditGrantService.resolvePeriodGrant).
UPDATE "plans"
SET "payg_credit_percent_bps" = 5000
WHERE "slug" IN ('starter', 'plus')
  AND "payg_credit_percent_bps" = 3000;

UPDATE "plans"
SET "payg_credit_percent_bps" = 5000
WHERE "slug" IN ('pro', 'team', 'scale', 'unlimited')
  AND "payg_credit_percent_bps" = 2500;
