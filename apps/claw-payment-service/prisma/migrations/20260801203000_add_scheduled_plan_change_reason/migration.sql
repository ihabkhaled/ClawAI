ALTER TABLE "subscriptions"
  ADD COLUMN "scheduled_change_reason" TEXT;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_scheduled_change_reason_check"
  CHECK (
    "scheduled_change_reason" IS NULL
    OR "scheduled_change_reason" IN ('USER_REQUESTED_DOWNGRADE', 'PLAN_RETIREMENT')
  );
