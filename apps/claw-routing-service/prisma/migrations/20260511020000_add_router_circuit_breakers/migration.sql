-- Smart Router Flagship — Phase 12: Persisted Circuit Breakers
CREATE TABLE "router_circuit_breakers" (
  "id"                 TEXT NOT NULL,
  "scope"              TEXT NOT NULL,
  "state"              TEXT NOT NULL,
  "failure_count"      INTEGER NOT NULL DEFAULT 0,
  "opened_at"          TIMESTAMP(3),
  "last_transition_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "router_circuit_breakers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "router_circuit_breakers_scope_key"
  ON "router_circuit_breakers"("scope");
