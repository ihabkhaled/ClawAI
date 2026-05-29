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
  listJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ): Promise<FetchJob[]> {
    const parsed = limit === undefined ? 20 : Number.parseInt(limit, 10);
    const safe = Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : 20;
    return this.service.listJobs(user.id, safe);
  }

  @Get('jobs/:id')
  getJob(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<FetchJob> {
    return this.service.getJob(id, user.id);
  }
}
