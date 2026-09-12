-- Organization policy: every column narrows what a member's client may do.
-- Defaults are deliberately the widest possible value, so creating a row
-- changes nothing until an administrator narrows a field. A migration that
-- tightened on arrival would lock out every member of every organization the
-- moment it ran.
CREATE TABLE "organization_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "allowedTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedModels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maximumRisk" TEXT NOT NULL DEFAULT 'R4',
    "deniedEffects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requireApproval" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maximumRetentionDays" INTEGER NOT NULL DEFAULT 3650,
    "minimumPermissionMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_policies_organizationId_key" ON "organization_policies"("organizationId");

ALTER TABLE "organization_policies"
    ADD CONSTRAINT "organization_policies_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
