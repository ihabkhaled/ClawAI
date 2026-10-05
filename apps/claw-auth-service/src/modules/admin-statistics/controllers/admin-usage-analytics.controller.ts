import { Controller, Get, Query } from '@nestjs/common';
import { type AdminUsageAnalytics, Permission } from '@claw/shared-types';

import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import {
  type AdminUsageAnalyticsQueryDto,
  adminUsageAnalyticsQuerySchema,
} from '../dto/admin-usage-analytics.dto';
import { AdminUsageAnalyticsService } from '../services/admin-usage-analytics.service';

/**
 * Platform-wide usage for the admin Observability page: tokens over time, USD
 * (provider cost, integer micro-USD) today, models, top users, top tools.
 *
 * Admin role AND `ADMIN_USAGE_VIEW`, the same gate as the per-user panel.
 * Routed under the already-proxied `/api/v1/admin` prefix. Self-service usage
 * (`/usage/me`) is a different controller and is untouched.
 */
@Controller('admin/usage-analytics')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_USAGE_VIEW)
export class AdminUsageAnalyticsController {
  constructor(private readonly analytics: AdminUsageAnalyticsService) {}

  @Get()
  async getOverview(
    @Query(new ZodValidationPipe(adminUsageAnalyticsQuerySchema))
    query: AdminUsageAnalyticsQueryDto,
  ): Promise<AdminUsageAnalytics> {
    return this.analytics.getOverview(query);
  }
}
