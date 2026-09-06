import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AdminUserSubscriptionStatistics, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AdminUserParamDto, adminUserParamSchema } from '../dto/admin-user-billing.dto';
import { AdminUserBillingService } from '../services/admin-user-billing.service';

@Controller('admin/billing/users')
@RequirePermissions(Permission.ADMIN_PLANS_MANAGE)
export class AdminUserBillingController {
  constructor(private readonly billing: AdminUserBillingService) {}

  @Get(':userId/subscription')
  async getSubscriptionStatistics(
    @Param(new ZodValidationPipe(adminUserParamSchema)) params: AdminUserParamDto,
  ): Promise<AdminUserSubscriptionStatistics> {
    return this.billing.getSubscriptionStatistics(params.userId);
  }
}
