import { Controller, Get, Param, Query } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import {
  organizationIdParamSchema,
  type UsageBreakdownQueryDto,
  usageBreakdownQuerySchema,
} from '../dto/usage-breakdown-query.dto';
import { UsageAttributionService } from '../services/usage-attribution.service';
import {
  type OrganizationUsageView,
  type UsageBreakdownView,
} from '../types/usage-attribution.types';

/**
 * Usage attribution for the signed-in user (F107) and for organizations they
 * administer (F108). Routed under /api/v1/auth/* because /api/v1/usage already
 * belongs to audit-service. No route takes a user id: ownership is the JWT.
 */
@Controller('auth/me')
export class MeUsageAttributionController {
  constructor(private readonly usage: UsageAttributionService) {}

  @Get('usage/breakdown')
  async getMyBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(usageBreakdownQuerySchema)) query: UsageBreakdownQueryDto,
  ): Promise<UsageBreakdownView> {
    return this.usage.breakdownForUser(user.id, query);
  }

  @Get('organizations/:organizationId/usage')
  async getOrganizationUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId', new ZodValidationPipe(organizationIdParamSchema))
    organizationId: string,
    @Query(new ZodValidationPipe(usageBreakdownQuerySchema)) query: UsageBreakdownQueryDto,
  ): Promise<OrganizationUsageView> {
    return this.usage.breakdownForOrganization(organizationId, user.id, query);
  }
}
