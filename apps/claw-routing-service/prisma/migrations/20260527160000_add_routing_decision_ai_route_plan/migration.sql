-- Semantic Router Flagship — Phase 4
-- Adds shadow-mode storage for AIRoutePlannerManager output.
-- Always nullable, populated async, never required by the v1 hot path.

ALTER TABLE "routing_decisions"
  ADD COLUMN IF NOT EXISTS "ai_route_plan" JSONB;
