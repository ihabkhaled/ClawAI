import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type ExecuteSearchDto, executeSearchSchema } from '../dto/execute-search.dto';
import { SearchExecutionService } from '../services/search-execution.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { SearchRun } from '../../../generated/prisma';
import type { SearchExecutionResult } from '../types/search-execution-result.types';

@Controller('research/search')
@RequirePermissions(Permission.RESEARCH_USE)
export class SearchController {
  constructor(private readonly service: SearchExecutionService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  execute(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(executeSearchSchema)) dto: ExecuteSearchDto,
  ): Promise<SearchExecutionResult> {
    return this.service.execute(user.id, dto);
  }

  @Get('runs')
  listRuns(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ): Promise<SearchRun[]> {
    const parsed = limit === undefined ? 20 : Number.parseInt(limit, 10);
    const safe = Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : 20;
    return this.service.listRuns(user.id, safe);
  }

  @Get('runs/:id')
  getRun(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SearchRun> {
    return this.service.getRun(id, user.id);
  }
}
