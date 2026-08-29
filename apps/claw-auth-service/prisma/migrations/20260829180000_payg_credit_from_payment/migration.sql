-- PAYG credit is a SHARE OF WHAT THE USER PAYS, not an absolute per-plan figure.
--
-- The monthly grant becomes `activeMonthlyPrice.amount_minor * bps / 10000`, so
-- it follows a price change on its own and there is no second number to drift
-- away from the price it was supposed to track.
--
-- `monthly_provider_cost_ceiling_micro_usd` keeps the meaning it always had: a
-- fair-use bound on TOTAL weighted spend across every provider. It is NOT the
-- credit allowance any more. The two are independent by design — a PAYG
-- reservation checks the wallet and passes NULL for the cost ceiling, so a user
-- who buys credit can actually spend it.
--
-- Purely additive with a default, so old code runs against the new schema.
ALTER TABLE "plans"
  ADD COLUMN "payg_credit_percent_bps" INTEGER NOT NULL DEFAULT 3000;

-- Basis points, so 0..10000. A negative share would mint debt on renewal and a
-- share above 100% would hand back more credit than the user paid.
ALTER TABLE "plans"
  ADD CONSTRAINT "plans_payg_credit_percent_bps_range"
  CHECK ("payg_credit_percent_bps" >= 0 AND "payg_credit_percent_bps" <= 10000);
