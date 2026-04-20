import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type ExecuteResearchDto, executeResearchSchema } from '../dto/execute-research.dto';
import { ResearchManager } from '../managers/research.manager';
import { ResearchService } from '../services/research.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { ResearchRun } from '../../../generated/prisma';

@Controller('research/runs')
export class ResearchController {
  constructor(
    private readonly manager: ResearchManager,
    private readonly service: ResearchService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  run(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(executeResearchSchema)) dto: ExecuteResearchDto,
  ): Promise<ResearchRun> {
    return this.manager.run(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ): Promise<ResearchRun[]> {
    const parsed = limit === undefined ? 20 : Number.parseInt(limit, 10);
    const safe = Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : 20;
    return this.manager.listRuns(user.id, safe);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<ResearchRun> {
    return this.service.getRunOrThrow(id, user.id);
  }
}
