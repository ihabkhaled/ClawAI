import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { EntitlementsService } from '../services/entitlements.service';
import { type UserEntitlements } from '../types/entitlements.types';

// Internal read contract consumed by the shared EntitlementsAdapter (chat /
// routing). Not exposed via nginx; @Public for service-to-service calls.
@Controller('internal/users')
@Public()
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
