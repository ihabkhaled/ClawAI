-- ADR-162: the free credit-connector allowance is a count AND a meter, and it does not cover
-- expensive models. Three additive columns; nothing existing changes meaning.

-- The most provider cost, in micro-USD, one UTC month of free requests may add up to.
-- NULL = no meter (the count alone, as before).
ALTER TABLE "plans" ADD COLUMN "credit_connector_free_budget_micro_usd" BIGINT;

-- The dearest model the allowance covers: its OUTPUT price in micro-USD per million tokens.
-- NULL = no price limit (as before).
ALTER TABLE "plans" ADD COLUMN "credit_connector_free_max_model_output_micro_usd" BIGINT;

-- What this user's free requests of this month hold or have used.
ALTER TABLE "credit_free_allowance_usage" ADD COLUMN "spent_micro_usd" BIGINT NOT NULL DEFAULT 0;

-- Free: $0.25 a month of provider cost and models up to $5.00 per million output tokens
-- (STANDARD class and below; PREMIUM and ULTRA are not covered). Only a row that still has the
-- allowance of 10 and neither value set is touched, so an administrator's choice is never overwritten.
UPDATE "plans"
SET "credit_connector_free_budget_micro_usd" = 250000,
    "credit_connector_free_max_model_output_micro_usd" = 5000000
WHERE "slug" = 'free'
  AND "credit_connector_free_requests_per_month" = 10
  AND "credit_connector_free_budget_micro_usd" IS NULL
  AND "credit_connector_free_max_model_output_micro_usd" IS NULL;
