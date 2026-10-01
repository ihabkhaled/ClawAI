import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { FleetController } from './controllers/fleet.controller';
import { FleetInternalController } from './controllers/fleet-internal.controller';
import { SamlController } from './controllers/saml.controller';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationAccessService } from './services/organization-access.service';
import { OrganizationMembershipService } from './services/organization-membership.service';
import { RunnerPolicyService } from './services/runner-policy.service';
import { OrganizationPolicyService } from './services/organization-policy.service';
import { OrganizationUsageScopeService } from './services/organization-usage-scope.service';
import { SamlService } from './services/saml.service';

/**
 * Stream 40 — Multi-device fleet admin.
 *
 * v1: Organizations + members + role-based access (OWNER/ADMIN/MEMBER).
 * The schema is in place so the frontend can manage user-to-org
 * relationships and the agent service can scope policies / capabilities
 * by `orgId` (already supported via `AccessPolicy.orgId`).
 *
 * v2 deferred:
 *   - SAML mock IdP integration test harness
 *   - Canary-deployment policy rollout (org → cohort → user)
 *   - Fleet-wide capability dashboard
 */
@Module({
  imports: [PrismaModule],
  controllers: [FleetController, FleetInternalController, SamlController],
  providers: [
    OrganizationRepository,
    OrganizationAccessService,
    OrganizationMembershipService,
    OrganizationPolicyService,
    RunnerPolicyService,
    OrganizationUsageScopeService,
    SamlService,
  ],
  exports: [OrganizationRepository, OrganizationPolicyService, RunnerPolicyService, SamlService],
})
export class FleetModule {}
