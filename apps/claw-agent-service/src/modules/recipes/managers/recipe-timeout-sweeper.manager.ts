import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import {
  RECIPE_RUN_HARD_WALL_CLOCK_MS_DEFAULT,
  RECIPE_RUN_TIMEOUT_SWEEP_INTERVAL_MS,
} from '../../../common/constants/recipe.constants';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RecipeRunnerManager } from './recipe-runner.manager';

/**
 * Stream 13 v2 — wall-clock timeout sweeper. Runs every minute and
 * times out any RecipeRun whose `startedAt` is older than the configured
 * hard cap (default 10 minutes). The runner itself handles the
 * transition; this manager just decides when.
 */
@Injectable()
export class RecipeTimeoutSweeperManager {
  private readonly logger = new Logger(RecipeTimeoutSweeperManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: RecipeRunnerManager,
  ) {}

  @Interval(RECIPE_RUN_TIMEOUT_SWEEP_INTERVAL_MS)
  async sweep(): Promise<void> {
    const cutoff = new Date(Date.now() - RECIPE_RUN_HARD_WALL_CLOCK_MS_DEFAULT);
    const stale = await this.prisma.recipeRun.findMany({
      where: { status: 'RUNNING', startedAt: { lt: cutoff } },
      select: { id: true },
    });
    if (stale.length === 0) return;
    this.logger.warn(`sweep: ${String(stale.length)} run(s) past hard wall-clock cap`);
    for (const r of stale) {
      try {
        await this.runner.timeOut(r.id);
      } catch (error) {
        this.logger.error(`sweep: timeOut failed for ${r.id}: ${(error as Error).message}`);
      }
    }
  }
}
