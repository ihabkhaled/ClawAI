-- F100: organization runner policy (staged). Every column is nullable or defaults to the
-- inert value ('off', false, NULL), so this migration constrains no existing runner.
-- IF NOT EXISTS keeps a re-run harmless.
ALTER TABLE "organization_policies" ADD COLUMN IF NOT EXISTS "minRunnerVersion" TEXT;
ALTER TABLE "organization_policies" ADD COLUMN IF NOT EXISTS "allowedRunnerPlatforms" JSONB;
ALTER TABLE "organization_policies" ADD COLUMN IF NOT EXISTS "runnerPolicyMode" TEXT NOT NULL DEFAULT 'off';
ALTER TABLE "organization_policies" ADD COLUMN IF NOT EXISTS "requireVersionReport" BOOLEAN NOT NULL DEFAULT false;

-- F100: the last runner-policy verdict recorded on the session; NULL = never evaluated.
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "runnerCompliance" TEXT;
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "runnerComplianceReason" TEXT;
