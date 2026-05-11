-- Smart Router Flagship — Phase 9: Workflow routing
CREATE TYPE "WorkflowKind" AS ENUM (
  'DIRECT_LLM', 'SEARCH_FIRST', 'EXTRACT_FIRST',
  'PDF_EXTRACTION', 'YOUTUBE_TRANSCRIPT',
  'IMAGE_ANALYSIS', 'IMAGE_GENERATION',
  'VIDEO_ANALYSIS', 'AUDIO_TRANSCRIBE',
  'FILE_GENERATION', 'CODE_REVIEW',
  'COMPARE_ENSEMBLE', 'JUDGE_PIPELINE'
);

CREATE TABLE "router_workflows" (
  "id"                 TEXT NOT NULL,
  "workflow_key"       TEXT NOT NULL,
  "kind"               "WorkflowKind" NOT NULL,
  "display_name"       TEXT NOT NULL,
  "description"        TEXT,
  "steps"              JSONB NOT NULL,
  "default_model_tier" TEXT NOT NULL DEFAULT 'A',
  "is_enabled"         BOOLEAN NOT NULL DEFAULT true,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "router_workflows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "router_workflows_workflow_key_key"
  ON "router_workflows"("workflow_key");
CREATE INDEX "router_workflows_kind_idx"
  ON "router_workflows"("kind");
