-- Smart Router Flagship — Phase 10: Learning loop
CREATE TABLE "router_learned_scores" (
  "id"                  TEXT NOT NULL,
  "profile_key"         TEXT NOT NULL,
  "domain"              "DomainTag" NOT NULL,
  "task_family"         TEXT NOT NULL,
  "success_rate"        DECIMAL(6,4) NOT NULL DEFAULT 0.6,
  "feedback_positive"   INTEGER NOT NULL DEFAULT 0,
  "feedback_negative"   INTEGER NOT NULL DEFAULT 0,
  "judge_verified"      INTEGER NOT NULL DEFAULT 0,
  "judge_revised"       INTEGER NOT NULL DEFAULT 0,
  "judge_escalated"     INTEGER NOT NULL DEFAULT 0,
  "fallback_triggered"  INTEGER NOT NULL DEFAULT 0,
  "total_routes"        INTEGER NOT NULL DEFAULT 0,
  "last_updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "router_learned_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "router_learned_scores_profile_key_domain_task_family_key"
  ON "router_learned_scores"("profile_key", "domain", "task_family");
CREATE INDEX "router_learned_scores_profile_key_idx"
  ON "router_learned_scores"("profile_key");
CREATE INDEX "router_learned_scores_domain_idx"
  ON "router_learned_scores"("domain");
