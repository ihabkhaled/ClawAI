import { Controller, Get, Param } from '@nestjs/common';
import {
  type AdminUserPlanOverview,
  type AdminUserUsageStatistics,
  Permission,
} from '@claw/shared-types';

import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import {
  type AdminUserStatisticsParamDto,
  adminUserStatisticsParamSchema,
} from '../dto/admin-user-statistics.dto';
import { AdminUserPlanService } from '../services/admin-user-plan.service';
import { AdminUserStatisticsService } from '../services/admin-user-statistics.service';

/**
 * Per-user consumption for the admin users page.
 *
 * Gated on `ADMIN_USAGE_VIEW`, NOT on the `ADMIN_USERS_MANAGE` that gates the
 * page this is opened from. The two are separate on purpose: managing accounts
 * and reading what they spent are different powers, and the platform already
 * models that split. The consequence the frontend must honour is that the
 * button opening this panel has to be gated on THIS permission — gating it on
 * the parent page's would hand a user-manager without usage access a control
 * that 403s on every click. The model-costs page learned this the same way.
 *
 * Routed under the already-proxied `/api/v1/admin` prefix, so no nginx change.
 */
@Controller('admin/users')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_USAGE_VIEW)
export class AdminUserStatisticsController {
  constructor(
    private readonly statistics: AdminUserStatisticsService,
    private readonly plans: AdminUserPlanService,
  ) {}

  @Get(':userId/usage-statistics')
  async getUsageStatistics(
    @Param(new ZodValidationPipe(adminUserStatisticsParamSchema))
    params: AdminUserStatisticsParamDto,
  ): Promise<AdminUserUsageStatistics> {
    return this.statistics.getUsageForUser(params.userId);
  }

  // Overrides the controller's ADMIN_USAGE_VIEW (RolesGuard resolves permissions
  // with getAllAndOverride, so the handler wins). Plan, grant and trial are
  // subscription facts, not usage, and payment-service gates the other half of
  // this same modal on ADMIN_PLANS_MANAGE. Gating the two halves differently
  // would make the modal half-load for anyone holding only one of them.
  @RequirePermissions(Permission.ADMIN_PLANS_MANAGE)
  @Get(':userId/plan-overview')
  async getPlanOverview(
    @Param(new ZodValidationPipe(adminUserStatisticsParamSchema))
    params: AdminUserStatisticsParamDto,
  ): Promise<AdminUserPlanOverview> {
    return this.plans.getPlanOverview(params.userId);
  }
}
