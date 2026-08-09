import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { EntitlementsService } from '../services/entitlements.service';
import { type UserEntitlements } from '../types/entitlements.types';

// Internal read contract consumed by the shared EntitlementsAdapter (chat /
// routing). Not exposed via nginx; @Public for service-to-service calls.
@Controller('internal/users')
@Public()
export class EntitlementsInternalController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get(':id/entitlements')
  async getEntitlements(@Param('id') id: string): Promise<UserEntitlements> {
    return this.entitlementsService.getEnforcedForUser(id);
  }
}
