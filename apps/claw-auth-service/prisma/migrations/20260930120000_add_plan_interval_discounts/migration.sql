-- Per-plan term discounts (basis points). Longer-term PlanPriceVersion rows are
-- derived from the active MONTHLY price and these figures; the plan-interval-
-- discounts seeder re-mints the existing plans' QUARTERLY/SEMIANNUAL/YEARLY
-- versions once. Defaults: 10% / 15% / 20%.
ALTER TABLE "plans"
  ADD COLUMN "quarterly_discount_bps" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN "semiannual_discount_bps" INTEGER NOT NULL DEFAULT 1500,
  ADD COLUMN "yearly_discount_bps" INTEGER NOT NULL DEFAULT 2000;

ALTER TABLE "plans"
  ADD CONSTRAINT "plans_interval_discount_bps_check"
  CHECK (
    "quarterly_discount_bps" BETWEEN 0 AND 9000
    AND "semiannual_discount_bps" BETWEEN 0 AND 9000
    AND "yearly_discount_bps" BETWEEN 0 AND 9000
  );
