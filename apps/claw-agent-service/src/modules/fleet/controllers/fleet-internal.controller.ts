import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ServiceTokenGuard } from '../../../common/guards/service-token.guard';
import {
  type OrganizationUsageScopeQueryDto,
  organizationUsageScopeQuerySchema,
} from '../dto/organization-usage-scope.dto';
import { OrganizationUsageScopeService } from '../services/organization-usage-scope.service';
import type { OrganizationUsageScope } from '../types/organization-usage-scope.types';

/**
 * Service-to-service organization reads. `@Public()` only lifts the user-JWT
 * guard; the service token is still required, and nginx refuses
 * `/api/v1/internal/*` at the edge.
 */
@Controller('internal/agent/organizations')
@Public()
@UseGuards(ServiceTokenGuard)
export class FleetInternalController {
  constructor(private readonly usageScope: OrganizationUsageScopeService) {}

  @Get(':id/usage-scope')
  async getUsageScope(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(organizationUsageScopeQuerySchema))
    query: OrganizationUsageScopeQueryDto,
  ): Promise<OrganizationUsageScope> {
    return this.usageScope.forAdministrator(id, query.requesterId);
  }
}
