-- Stream 01 Phase 5 — Scheduled sync automation
-- Additive migration: adds PAUSED enum value, cadence/state columns on connectors,
-- observability columns on sync runs, and SyncCadenceDefault registry.
-- Backward compatible: existing rows keep old values; new columns have defaults.

-- 1. Extend connector status enum with PAUSED
ALTER TYPE "WorkspaceConnectorStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- 2. Extend connector with scheduling state + override + rate-limit + circuit state
ALTER TABLE "workspace_connectors"
  ADD COLUMN IF NOT EXISTS "sync_interval_seconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "backfill_window_days"  INTEGER,
  ADD COLUMN IF NOT EXISTS "paused_at"             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "pause_reason"          TEXT,
  ADD COLUMN IF NOT EXISTS "rate_limit_state"      JSONB,
  ADD COLUMN IF NOT EXISTS "circuit_state"         JSONB,
  ADD COLUMN IF NOT EXISTS "last_tick_at"          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "last_run_key"          TEXT;

-- 3. Extend sync run with observability columns
ALTER TABLE "workspace_sync_runs"
  ADD COLUMN IF NOT EXISTS "duration_ms"   INTEGER,
  ADD COLUMN IF NOT EXISTS "retry_count"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cursor_before" TEXT,
  ADD COLUMN IF NOT EXISTS "cursor_after"  TEXT,
  ADD COLUMN IF NOT EXISTS "error_code"    TEXT,
  ADD COLUMN IF NOT EXISTS "is_dry_run"    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "triggered_by"  TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "run_key"       TEXT;

-- 4. Indexes for dashboard aggregation + dedup keyed runs
CREATE INDEX IF NOT EXISTS "workspace_sync_runs_connector_started_idx"
  ON "workspace_sync_runs" ("connector_id", "started_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_sync_runs_connector_run_key_key"
  ON "workspace_sync_runs" ("connector_id", "run_key") WHERE "run_key" IS NOT NULL;

-- 5. Per-provider cadence default registry
CREATE TABLE IF NOT EXISTS "workspace_sync_cadence_defaults" (
  "provider"              "WorkspaceProvider" PRIMARY KEY,
  "interval_seconds"      INTEGER NOT NULL,
  "backfill_window_days"  INTEGER NOT NULL DEFAULT 30,
  "priority"              INTEGER NOT NULL DEFAULT 50,
  "supports_delta_sync"   BOOLEAN NOT NULL DEFAULT FALSE,
  "supports_webhook_sync" BOOLEAN NOT NULL DEFAULT FALSE,
  "native_cursor_kind"    TEXT,
  "notes"                 TEXT,
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Seed the registry from FEATURES_v3 Stream 01 cadence table
INSERT INTO "workspace_sync_cadence_defaults"
  ("provider", "interval_seconds", "backfill_window_days", "priority", "supports_delta_sync", "supports_webhook_sync", "native_cursor_kind", "notes")
VALUES
  ('SLACK',                60,   14, 30, FALSE, TRUE,  'slack-oldest',            'Phase 5 baseline; delta added v1.5'),
  ('GMAIL',                120,  30, 20, TRUE,  FALSE, 'gmail-history',           'Phase 5 uses historyId delta'),
  ('GITHUB',               180,  30, 25, TRUE,  TRUE,  'github-etag+since',       'Phase 5 uses since= hybrid'),
  ('JIRA',                 300,  30, 35, TRUE,  TRUE,  'jira-timestamp',          'Phase 5 uses updated>= JQL'),
  ('GITLAB',               300,  30, 35, FALSE, TRUE,  'gitlab-updated-after',    'Delta added v1.5'),
  ('BITBUCKET',            300,  30, 35, FALSE, TRUE,  'bitbucket-updated-after', 'Delta added v1.5'),
  ('GOOGLE_DRIVE',         600,  30, 50, FALSE, FALSE, 'drive-page-token',        'Delta added v1.5'),
  ('MICROSOFT_ONEDRIVE',   600,  30, 50, FALSE, FALSE, 'drive-page-token',        'Delta added v1.5'),
  ('MICROSOFT_SHAREPOINT', 600,  30, 50, FALSE, FALSE, 'drive-page-token',        'Delta added v1.5'),
  ('CONFLUENCE',           600,  30, 45, FALSE, FALSE, 'confluence-version-when', 'Delta added v1.5'),
  ('CLICKUP',              600,  30, 50, FALSE, TRUE,  'clickup-updated-gt',      'Delta added v1.5'),
  ('FIGMA',                900,  30, 60, FALSE, TRUE,  'figma-version',           'Delta added v1.5')
ON CONFLICT ("provider") DO NOTHING;
