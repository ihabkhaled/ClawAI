import { Module } from '@nestjs/common';
import { RoutingController } from './controllers/routing.controller';
import { RoutingService } from './services/routing.service';
import { RoutingManager } from './managers/routing.manager';
import { OllamaRouterManager } from './managers/ollama-router.manager';
import { PromptBuilderManager } from './managers/prompt-builder.manager';
import { ReplayManager } from './managers/replay.manager';
import { AdaptiveLearningManager } from './managers/adaptive-learning.manager';
import { ComplexityClassifierManager } from './managers/complexity-classifier.manager';
import { RoutingPoliciesRepository } from './repositories/routing-policies.repository';
import { RoutingDecisionsRepository } from './repositories/routing-decisions.repository';
import { ReplayRunsRepository } from './repositories/replay-runs.repository';
import { ReplayCasesRepository } from './repositories/replay-cases.repository';

@Module({
  controllers: [RoutingController],
  providers: [
    RoutingService,
    RoutingManager,
    ReplayManager,
    AdaptiveLearningManager,
    OllamaRouterManager,
    PromptBuilderManager,
    ComplexityClassifierManager,
    RoutingPoliciesRepository,
    RoutingDecisionsRepository,
    ReplayRunsRepository,
    ReplayCasesRepository,
  ],
  exports: [RoutingService],
})
export class RoutingModule {}
