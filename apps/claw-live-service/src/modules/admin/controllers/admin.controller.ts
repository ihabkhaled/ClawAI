import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionGuard, RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type OverviewQuery, overviewQuerySchema, runIdParamSchema } from '../dto/admin.dto';
import { AdminOverviewService } from '../services/admin-overview.service';
import type { AdminOverviewView, RunStopView } from '../types/admin.types';

@UseGuards(PermissionGuard)
@RequirePermissions(Permission.ADMIN_LIVE_MANAGE)
@Controller('live/admin')
export class AdminController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get('overview')
  get(
    @Query(new ZodValidationPipe(overviewQuerySchema)) query: OverviewQuery,
  ): Promise<AdminOverviewView> {
    return this.overview.overview(query.days);
  }

  @Post('runs/:runId/stop')
  @HttpCode(HttpStatus.OK)
  stop(
    @Param('runId', new ZodValidationPipe(runIdParamSchema)) runId: string,
  ): Promise<RunStopView> {
    return this.overview.stopRun(runId);
  }
}
