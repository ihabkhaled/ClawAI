import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { Roles } from '@claw/shared-auth';
import { Permission, UserRole } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';

import { AutoSuggestRunRepository } from '../repositories/auto-suggest-run.repository';
import { AutoSuggestSchedulerManager } from '../managers/auto-suggest-scheduler.manager';
import { parseAutoSuggestJobType } from '../utilities/job-type.utility';
import type { AutoSuggestJobType } from '../types/auto-suggest.types';
import type { AutoSuggestRun } from '../../../generated/prisma';

@Controller('workspace/auto-suggest')
export class AutoSuggestController {
  constructor(
    private readonly scheduler: AutoSuggestSchedulerManager,
    private readonly runRepo: AutoSuggestRunRepository,
  ) {}

  @Get('runs')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @RequirePermissions(Permission.ADMIN_WORKSPACES_VIEW)
  async listRuns(@Query('limit') limitRaw: string | undefined): Promise<AutoSuggestRun[]> {
    const parsed = limitRaw === undefined ? 20 : Number(limitRaw);
    const limit = Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 20;
    return this.runRepo.listRecent(limit);
  }

  @Post('jobs/:jobType/trigger-now')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async triggerNow(
    @Param('jobType') jobTypeRaw: string,
  ): Promise<{ status: 'STARTED'; jobType: AutoSuggestJobType }> {
    const jobType = parseAutoSuggestJobType(jobTypeRaw);
    void this.scheduler.triggerNow(jobType);
    return { status: 'STARTED', jobType };
  }
}
