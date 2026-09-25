import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '@claw/shared-auth';
import { Permission, UserRole } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type UpdateFetchStrategyDto,
  updateFetchStrategySchema,
} from '../dto/update-fetch-strategy.dto';
import { FetchStrategyStatusService } from '../services/fetch-strategy-status.service';
import type { FetchStrategyConfig, FetchStrategyKind } from '../../../generated/prisma';

/**
 * Admin-only status/control surface for the pluggable fetch-strategy layer.
 * Registering a new strategy is a code change (an adapter + a provider);
 * ENABLING one already shipped is this endpoint, DB-level, no deploy.
 */
@Controller('research/fetch-strategies')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
export class FetchStrategyController {
  constructor(private readonly service: FetchStrategyStatusService) {}

  @Get()
  list(): Promise<FetchStrategyConfig[]> {
    return this.service.list();
  }

  @Patch(':kind')
  update(
    @Param('kind') kind: FetchStrategyKind,
    @Body(new ZodValidationPipe(updateFetchStrategySchema)) dto: UpdateFetchStrategyDto,
  ): Promise<FetchStrategyConfig> {
    return this.service.update(kind, dto);
  }
}
