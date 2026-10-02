import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type RuntimeCrawlPagesQueryDto,
  runtimeCrawlPagesQuerySchema,
} from '../dto/runtime-crawl-pages-query.dto';
import { type StartRuntimeCrawlDto, startRuntimeCrawlSchema } from '../dto/start-runtime-crawl.dto';
import { ResearchAccessGuard } from '../guards/research-access.guard';
import { RuntimeCrawlManager } from '../managers/runtime-crawl.manager';
import {
  RUNTIME_CRAWL_LIST_DEFAULT,
  RUNTIME_CRAWL_LIST_MAX,
} from '../constants/runtime-crawl.constants';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type {
  RuntimeCrawlPagesView,
  RuntimeCrawlRunView,
  RuntimeCrawlStartView,
} from '../types/runtime-crawl.types';

/**
 * Crawl and single-page extract for runtime clients (the coding agent).
 *
 * Guard order is the contract: the global PermissionGuard checks
 * RESEARCH_USE, then `ResearchAccessGuard` checks the plan's research
 * unlock, and only then does a pipe, the manager or any repository run.
 * Every read is owner-scoped; another user's run id is a 404.
 */
@Controller('research/crawl/runs')
@RequirePermissions(Permission.RESEARCH_USE)
@UseGuards(ResearchAccessGuard)
export class RuntimeCrawlController {
  constructor(private readonly manager: RuntimeCrawlManager) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(startRuntimeCrawlSchema)) dto: StartRuntimeCrawlDto,
  ): Promise<RuntimeCrawlStartView> {
    return this.manager.start(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ): Promise<RuntimeCrawlRunView[]> {
    const parsed = limit === undefined ? RUNTIME_CRAWL_LIST_DEFAULT : Number.parseInt(limit, 10);
    const safe =
      Number.isFinite(parsed) && parsed > 0 && parsed <= RUNTIME_CRAWL_LIST_MAX
        ? parsed
        : RUNTIME_CRAWL_LIST_DEFAULT;
    return this.manager.listRuns(user.id, safe);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RuntimeCrawlRunView> {
    return this.manager.getRun(user.id, id);
  }

  @Get(':id/pages')
  pages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(runtimeCrawlPagesQuerySchema)) query: RuntimeCrawlPagesQueryDto,
  ): Promise<RuntimeCrawlPagesView> {
    return this.manager.getPages(user.id, id, query);
  }
}
