-- Admin usage analytics reads arbitrary created_at / consumed_at windows.
-- Index-only change: no column or data is touched, so it is safe to roll back
-- by dropping the three indexes.
CREATE INDEX "weighted_usage_records_user_id_created_at_idx" ON "weighted_usage_records"("user_id", "created_at");
CREATE INDEX "weighted_usage_records_created_at_idx" ON "weighted_usage_records"("created_at");
CREATE INDEX "feature_usage_records_state_consumed_at_idx" ON "feature_usage_records"("state", "consumed_at");
