-- Semantic Router Flagship — Phase 2
-- Adds shadow-mode storage for SemanticIntentAnalyzerManager output.
-- Always nullable, populated async, never required by the v1 hot path.

ALTER TABLE "routing_decisions"
  ADD COLUMN IF NOT EXISTS "semantic_analysis" JSONB;
