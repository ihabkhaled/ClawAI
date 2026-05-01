import { Injectable, Logger } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { RecipeRunRepository } from '../repositories/recipe-run.repository';
import { RecipeRunnerManager } from '../managers/recipe-runner.manager';
import type { RecipeRun, RecipeRunStep } from '../../../generated/prisma';
import type { StartRunDto } from '../dto/start-run.dto';

/**
 * Stream 13 — Public service for recipe runs. Thin wrapper around the
 * RecipeRunnerManager + repository for read paths.
 */
@Injectable()
export class RecipeRunService {
  private readonly logger = new Logger(RecipeRunService.name);

  constructor(
    private readonly runRepo: RecipeRunRepository,
    private readonly runner: RecipeRunnerManager,
  ) {}

  async start(userId: string, recipeId: string, dto: StartRunDto): Promise<RecipeRun> {
    this.logger.debug(`start: userId=${userId} recipeId=${recipeId}`);
    return this.runner.start(userId, recipeId, dto);
  }

  async cancel(userId: string, runId: string): Promise<RecipeRun> {
    this.logger.debug(`cancel: userId=${userId} runId=${runId}`);
    return this.runner.cancel(userId, runId);
  }

  async getRunWithSteps(
    userId: string,
    runId: string,
  ): Promise<RecipeRun & { steps: RecipeRunStep[] }> {
    this.logger.debug(`getRunWithSteps: userId=${userId} runId=${runId}`);
    const run = await this.runRepo.findRunWithSteps(runId, userId);
    if (run === null) {
      throw new EntityNotFoundException('RecipeRun', runId);
    }
    return run;
  }

  async listRunsForRecipe(
    userId: string,
    recipeId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: RecipeRun[]; total: number; page: number; pageSize: number }> {
    this.logger.debug(`listRunsForRecipe: userId=${userId} recipeId=${recipeId}`);
    const { data, total } = await this.runRepo.listRunsForRecipe(
      recipeId,
      userId,
      page,
      pageSize,
    );
    return { data, total, page, pageSize };
  }
}
