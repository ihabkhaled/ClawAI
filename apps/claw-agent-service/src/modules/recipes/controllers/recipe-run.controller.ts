import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ListRunsQueryDto,
  listRunsQuerySchema,
  type StartRunDto,
  startRunSchema,
} from '../dto/start-run.dto';
import { RecipeRunService } from '../services/recipe-run.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { RecipeRun, RecipeRunStep } from '../../../generated/prisma';

@Controller('agent/recipes')
export class RecipeRunController {
  constructor(private readonly service: RecipeRunService) {}

  @Post(':id/runs')
  @HttpCode(HttpStatus.CREATED)
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(startRunSchema)) dto: StartRunDto,
  ): Promise<RecipeRun> {
    return this.service.start(user.id, id, dto);
  }

  @Get(':id/runs')
  async listRuns(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') recipeId: string,
    @Query(new ZodValidationPipe(listRunsQuerySchema)) query: ListRunsQueryDto,
  ): Promise<{ data: RecipeRun[]; total: number; page: number; pageSize: number }> {
    return this.service.listRunsForRecipe(user.id, recipeId, query.page, query.pageSize);
  }
}

@Controller('agent/recipe-runs')
export class RecipeRunDetailController {
  constructor(private readonly service: RecipeRunService) {}

  @Get(':id')
  async getRunDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RecipeRun & { steps: RecipeRunStep[] }> {
    return this.service.getRunWithSteps(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<RecipeRun> {
    return this.service.cancel(user.id, id);
  }
}
