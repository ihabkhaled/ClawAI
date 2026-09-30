import { Module } from '@nestjs/common';

import { AgentOrganizationClient } from './clients/agent-organization.client';
import { MeUsageAttributionController } from './controllers/me-usage-attribution.controller';
import { UsageAttributionRepository } from './repositories/usage-attribution.repository';
import { UsageAttributionService } from './services/usage-attribution.service';

/** F107/F108 — where usage went, per user and per administered organization. */
@Module({
  controllers: [MeUsageAttributionController],
  providers: [UsageAttributionRepository, UsageAttributionService, AgentOrganizationClient],
})
export class UsageAttributionModule {}
