import { Module } from '@nestjs/common';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { RoutingController } from './controllers/routing.controller';
import { RoutingService } from './services/routing.service';
import { RoutingManager } from './managers/routing.manager';
import { OllamaRouterManager } from './managers/ollama-router.manager';
import { PromptBuilderManager } from './managers/prompt-builder.manager';
import { ReplayManager } from './managers/replay.manager';
import { AdaptiveLearningManager } from './managers/adaptive-learning.manager';
import { RouterEducationManager } from './managers/router-education.manager';
import { ComplexityClassifierManager } from './managers/complexity-classifier.manager';
import { CapabilityRouterManager } from './managers/capability-router.manager';
import { ImageDetectionManager } from './managers/image-detection.manager';
import { LlamacppHealthManager } from './managers/llamacpp-health.manager';
import { RoutingPoliciesRepository } from './repositories/routing-policies.repository';
import { RoutingDecisionsRepository } from './repositories/routing-decisions.repository';
import { RoutingEducationRepository } from './repositories/routing-education.repository';
import { ReplayRunsRepository } from './repositories/replay-runs.repository';
import { ReplayCasesRepository } from './repositories/replay-cases.repository';

@Module({
  imports: [IntelligenceModule],
  controllers: [RoutingController],
  providers: [
    RoutingService,
    RoutingManager,
    ReplayManager,
    AdaptiveLearningManager,
    RouterEducationManager,
    OllamaRouterManager,
    PromptBuilderManager,
    ComplexityClassifierManager,
    CapabilityRouterManager,
    ImageDetectionManager,
    LlamacppHealthManager,
    RoutingPoliciesRepository,
    RoutingDecisionsRepository,
    RoutingEducationRepository,
    ReplayRunsRepository,
    ReplayCasesRepository,
  ],
  exports: [RoutingService, RoutingPoliciesRepository],
})
export class RoutingModule {}
