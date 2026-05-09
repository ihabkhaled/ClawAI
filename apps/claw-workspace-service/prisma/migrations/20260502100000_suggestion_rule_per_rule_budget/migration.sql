-- Stream 13.3 v1.1 — per-rule per-hour cap on the suggestion factory.
-- null = unbounded (caller falls through to the env-driven global cap).
ALTER TABLE "suggestion_trigger_rules"
  ADD COLUMN "per_rule_budget_per_hour" INTEGER;
