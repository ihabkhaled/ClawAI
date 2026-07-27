import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type BillingDashboardQuery,
  billingDashboardQuerySchema,
  type PriceVersionCountsQuery,
  priceVersionCountsQuerySchema,
} from '../dto/billing-dashboard.dto';
import { BillingDashboardService } from '../services/billing-dashboard.service';
import {
  type BillingDashboardView,
  type PriceVersionSubscriberCount,
} from '../types/billing-dashboard.types';

@Controller('admin/billing/dashboard')
@RequirePermissions(Permission.ADMIN_PLANS_MANAGE)
export class BillingDashboardController {
  constructor(private readonly dashboard: BillingDashboardService) {}

  @Get()
  async getDashboard(
    @Query(new ZodValidationPipe(billingDashboardQuerySchema))
    query: BillingDashboardQuery,
  ): Promise<BillingDashboardView> {
    return this.dashboard.getDashboard(query.days);
  }

  @Get('price-version-counts')
  async getPriceVersionSubscriberCounts(
    @Query(new ZodValidationPipe(priceVersionCountsQuerySchema))
    query: PriceVersionCountsQuery,
  ): Promise<PriceVersionSubscriberCount[]> {
    return this.dashboard.getPriceVersionSubscriberCounts(query.planId);
  }
}
