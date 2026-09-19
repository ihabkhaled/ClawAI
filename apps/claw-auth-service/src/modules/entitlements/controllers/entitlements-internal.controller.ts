import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { EntitlementsService } from '../services/entitlements.service';
import { type UserEntitlements } from '../types/entitlements.types';

// Internal read contract consumed by the shared EntitlementsAdapter (chat /
// routing). @Public for service-to-service calls, then ServiceTokenGuard
// requires the shared INTER_SERVICE_AUTH_TOKEN: this answers what any user may
// do and what their plan is, so it is not for anything that merely reaches the
// service network (TD-035).
@Controller('internal/users')
@Public()
@UseGuards(ServiceTokenGuard)
export class EntitlementsInternalController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  /**
   * `?enforceTrial=false` skips the expired-trial throw and returns the
   * fallback plan's entitlements - for permission and feature checks, which
   * are not billing state. Every other caller keeps the enforced default.
   */
  @Get(':id/entitlements')
  async getEntitlements(
    @Param('id') id: string,
    @Query('enforceTrial') enforceTrial?: string,
  ): Promise<UserEntitlements> {
    return enforceTrial === 'false'
      ? this.entitlementsService.getForUser(id)
      : this.entitlementsService.getEnforcedForUser(id);
  }
}
