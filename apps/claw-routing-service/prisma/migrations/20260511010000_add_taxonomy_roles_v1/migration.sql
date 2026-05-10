-- Smart Router Flagship — Phase 2: Taxonomy Roles
-- Additive only; no existing tables are modified.

CREATE TABLE "taxonomy_roles" (
  "id" TEXT NOT NULL,
  "role_key" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "industry_key" TEXT NOT NULL,
  "domain_key" "DomainTag" NOT NULL,
  "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "privacy_default" "PrivacyClass" NOT NULL DEFAULT 'CLOUD_PERMITTED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "taxonomy_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "taxonomy_roles_role_key_key" ON "taxonomy_roles"("role_key");
CREATE INDEX "taxonomy_roles_industry_key_idx" ON "taxonomy_roles"("industry_key");
CREATE INDEX "taxonomy_roles_domain_key_idx" ON "taxonomy_roles"("domain_key");
