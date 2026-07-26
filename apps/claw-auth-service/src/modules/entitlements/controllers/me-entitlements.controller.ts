import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { EntitlementsService } from '../services/entitlements.service';
import { type UserEntitlements } from '../types/entitlements.types';
import { UsageViewService } from '../services/usage-view.service';
import { type UserUsageView } from '../types/usage-view.types';

// Auth-guarded self-lookup the frontend uses to render the user's plan, daily
// quota meter and allowed-model list (/plan, /usage). Distinct from the @Public
// /internal/users/:id/entitlements that downstream services consume. Routed via
// nginx under the already-exposed /api/v1/auth/* prefix.
@Controller('auth/me')
export class MeEntitlementsController {
  constructor(
    private readonly entitlementsService: EntitlementsService,
    private readonly usageView: UsageViewService,
  ) {}

  @Get('entitlements')
  async getMyEntitlements(@CurrentUser() user: AuthenticatedUser): Promise<UserEntitlements> {
    return this.entitlementsService.getForUser(user.id);
  }

  // Day/week/month token windows plus metered-feature allowances. Read-only:
  // opening the billing page must never consume quota.
  @Get('usage')
  async getMyUsage(@CurrentUser() user: AuthenticatedUser): Promise<UserUsageView> {
    return this.usageView.getForUser(user.id);
  }
}
