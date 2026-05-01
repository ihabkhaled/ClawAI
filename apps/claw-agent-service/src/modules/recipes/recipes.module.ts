import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { AgentModule } from '../agent/agent.module';
import {
  RecipeRunController,
  RecipeRunDetailController,
} from './controllers/recipe-run.controller';
import { RecipeController } from './controllers/recipe.controller';
import { RecipeEventConsumerManager } from './managers/recipe-event-consumer.manager';
import { RecipeRunnerManager } from './managers/recipe-runner.manager';
import { RecipeTimeoutSweeperManager } from './managers/recipe-timeout-sweeper.manager';
import { RecipeRunRepository } from './repositories/recipe-run.repository';
import { RecipeRepository } from './repositories/recipe.repository';
import { RecipeRunService } from './services/recipe-run.service';
import { RecipeService } from './services/recipe.service';

/**
 * Stream 13 — Recipes module.
 *
 * - CRUD: RecipeController + RecipeService + RecipeRepository
 * - Runs: RecipeRunController + RecipeRunDetailController +
 *         RecipeRunService + RecipeRunRepository
 * - Orchestration: RecipeRunnerManager (sequential, abort-on-fail)
 * - Event bridge: RecipeEventConsumerManager (capability.executed/failed/denied
 *   → advance run)
 *
 * Imports AgentModule to inject CapabilityApprovalManager (the runner
 * proposes invocations through the same approval pipeline as ad-hoc
 * capabilities).
 */
@Module({
  imports: [PrismaModule, AgentModule],
  controllers: [RecipeController, RecipeRunController, RecipeRunDetailController],
  providers: [
    RecipeRepository,
    RecipeRunRepository,
    RecipeService,
    RecipeRunService,
    RecipeRunnerManager,
    RecipeEventConsumerManager,
    RecipeTimeoutSweeperManager,
  ],
  exports: [RecipeService, RecipeRunService],
})
export class RecipesModule {}
