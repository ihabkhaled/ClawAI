import { Module } from '@nestjs/common';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { GeminiRouterAdapter } from './adapters/gemini-router.adapter';
import { LegacyLocalRouterAdapter } from './adapters/legacy-local-router.adapter';
import { OllamaCloudRouterAdapter } from './adapters/ollama-cloud-router.adapter';
import { RoutingController } from './controllers/routing.controller';
import { ConnectorCredentialService } from './services/connector-credential.service';
import { RoutingService } from './services/routing.service';
import { CloudRouterManager } from './managers/cloud-router.manager';
import { RouterTraceService } from './services/router-trace.service';
import { RouterInferenceCoordinatorManager } from './managers/router-inference-coordinator.manager';
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
import { RouterAttemptRepository } from './repositories/router-attempt.repository';
import { RouterConfigurationRepository } from './repositories/router-configuration.repository';
import { RoutingPoliciesRepository } from './repositories/routing-policies.repository';
import { RoutingDecisionsRepository } from './repositories/routing-decisions.repository';
import { RoutingEducationRepository } from './repositories/routing-education.repository';
import { ReplayRunsRepository } from './repositories/replay-runs.repository';
import { ReplayCasesRepository } from './repositories/replay-cases.repository';
import { ModelDeploymentRepository } from './repositories/model-deployment.repository';
import { CloudRouterEligibilityManager } from './managers/cloud-router-eligibility.manager';
import { CloudRouterPromptManager } from './managers/cloud-router-prompt.manager';

@Module({
  imports: [IntelligenceModule, WorkflowsModule],
  controllers: [RoutingController],
  providers: [
    RoutingService,
    RoutingManager,
    // Cloud Smart Router inference layer. Called from handleAuto via
    // RoutingManager (batch 5), after the hard privacy early-return and
    // before the legacy Ollama-assisted rollback path. Every decline path —
    // no eligible deployment, unpublished/disabled configuration, chain
    // exhaustion, or a thrown error — falls through to that rollback path
    // unchanged.
    RouterInferenceCoordinatorManager,
    CloudRouterManager,
    CloudRouterEligibilityManager,
    CloudRouterPromptManager,
    ModelDeploymentRepository,
    RouterTraceService,
    RouterConfigurationRepository,
    RouterAttemptRepository,
    ConnectorCredentialService,
    GeminiRouterAdapter,
    OllamaCloudRouterAdapter,
    LegacyLocalRouterAdapter,
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
