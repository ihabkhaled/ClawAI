import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type FetchRequestDto, fetchRequestSchema } from '../dto/fetch-request.dto';
import { FetchService } from '../services/fetch.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { FetchJob } from '../../../generated/prisma';
import type { FetchResult } from '../types/fetch.types';

// POST /research/fetch is the ACTION endpoint the compare ResearchEnricher
// (and the in-chat research selector) calls when the user picks Search+Fetch
// or Search+Extract — stays on RESEARCH_USE. The GET jobs endpoints back
// the standalone Research UI's history view (admin observability) and are
// method-overridden to ADMIN_SYSTEM_VIEW.
@Controller('research/fetch')
@RequirePermissions(Permission.RESEARCH_USE)
export class FetchController {
  constructor(private readonly service: FetchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  fetch(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(fetchRequestSchema)) dto: FetchRequestDto,
  ): Promise<FetchResult> {
    return this.service.fetchPage(user.id, dto);
  }

  @Get('jobs')
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  listJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ): Promise<FetchJob[]> {
    const parsed = limit === undefined ? 20 : Number.parseInt(limit, 10);
    const safe = Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : 20;
    return this.service.listJobs(user.id, safe);
  }

  @Get('jobs/:id')
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  getJob(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<FetchJob> {
    return this.service.getJob(id, user.id);
  }
}
