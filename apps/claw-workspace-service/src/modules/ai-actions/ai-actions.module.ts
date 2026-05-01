import { Module } from '@nestjs/common';

import { AiActionApprovalQueueController } from './controllers/ai-action-approval-queue.controller';
import { AiActionController } from './controllers/ai-action.controller';
import { AiActionPolicyController } from './controllers/ai-action-policy.controller';
import { AutomationPreferenceController } from './controllers/automation-preference.controller';
import { AiActionApprovalManager } from './managers/ai-action-approval.manager';
import { AiActionDefaultPolicySeederManager } from './managers/ai-action-default-policy-seeder.manager';
import { AiActionExecutionManager } from './managers/ai-action-execution.manager';
import { AiActionPolicyMatcherManager } from './managers/ai-action-policy-matcher.manager';
import { AiActionQueueExpirySweeperManager } from './managers/ai-action-queue-expiry-sweeper.manager';
import { AiActionRiskScorerManager } from './managers/ai-action-risk-scorer.manager';
import { AutoRouterManager } from './managers/auto-router.manager';
import { ModelCatalogResolverManager } from './managers/model-catalog-resolver.manager';
import { AiActionApprovalQueueRepository } from './repositories/ai-action-approval-queue.repository';
import { AiActionPolicyRepository } from './repositories/ai-action-policy.repository';
import { AutomationPreferenceRepository } from './repositories/automation-preference.repository';
import { AiActionApprovalQueueService } from './services/ai-action-approval-queue.service';
import { AiActionPolicyService } from './services/ai-action-policy.service';
import { AutomationPreferenceService } from './services/automation-preference.service';

@Module({
  controllers: [
    AiActionController,
    AiActionPolicyController,
    AiActionApprovalQueueController,
    AutomationPreferenceController,
  ],
  providers: [
    ModelCatalogResolverManager,
    AutoRouterManager,
    AiActionExecutionManager,
    AiActionRiskScorerManager,
    AiActionPolicyMatcherManager,
    AiActionApprovalManager,
    AiActionDefaultPolicySeederManager,
    AiActionQueueExpirySweeperManager,
    AiActionPolicyRepository,
    AiActionApprovalQueueRepository,
    AutomationPreferenceRepository,
    AiActionPolicyService,
    AiActionApprovalQueueService,
    AutomationPreferenceService,
  ],
  exports: [
    AutoRouterManager,
    AiActionExecutionManager,
    AiActionApprovalManager,
    AiActionRiskScorerManager,
    AiActionPolicyMatcherManager,
    ModelCatalogResolverManager,
    AutomationPreferenceService,
    AutomationPreferenceRepository,
  ],
})
export class AiActionsModule {}
