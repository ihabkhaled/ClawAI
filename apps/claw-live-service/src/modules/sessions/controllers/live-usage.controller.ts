import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { BillingService } from '../../billing/services/billing.service';
import type { LiveUsageView } from '../../billing/types/live-billing.types';

@Controller('live/usage')
export class LiveUsageController {
  constructor(private readonly billing: BillingService) {}

  /** This month's free seconds, the per-minute price and the grace length (active policy). */
  @Get()
  usage(@CurrentUser() user: AuthenticatedUser): Promise<LiveUsageView> {
    return this.billing.usage(user.id);
  }
}
