-- Apply the approved Free plan contract to existing installations. The catalog
-- seeder preserves administrator-edited rows, so a migration is required for
-- this explicit product-policy change.
UPDATE "plans"
SET
  "daily_token_quota" = 300000,
  "weekly_token_quota" = 20000,
  "monthly_token_quota" = NULL,
  "monthly_provider_cost_ceiling_micro_usd" = 300000,
  "max_chats_per_day" = 5,
  "max_messages_per_day" = 250,
  "max_workspace_connections" = 5,
  "max_context_packs" = 10,
  "max_memory_items" = 10,
  "allow_workspaces" = true,
  "allow_consensus_mode" = true,
  "allow_escalation_chain" = true,
  "allow_repair_lab" = true,
  "allow_task_decomposer" = true,
  "allow_best_of_n" = true,
  "allow_verifier" = true,
  "allow_pipeline_lab" = true,
  "allow_cost_ensemble" = true,
  "allow_role_pack" = true
WHERE "slug" = 'free';

UPDATE "plan_feature_rules"
SET "access_mode" = 'ENABLED', "limit" = NULL, "updated_at" = CURRENT_TIMESTAMP
WHERE "feature" = 'WORKSPACES'
  AND "plan_id" IN (SELECT "id" FROM "plans" WHERE "slug" = 'free');
