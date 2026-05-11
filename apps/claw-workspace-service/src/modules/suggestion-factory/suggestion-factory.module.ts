import { Module } from '@nestjs/common';

import { AiActionsModule } from '../ai-actions/ai-actions.module';

import { TriggerRuleController } from './controllers/trigger-rule.controller';
import { WebhookEventConsumer } from './consumers/webhook-event.consumer';
import { SuggestionFactoryRateLimiterManager } from './managers/suggestion-factory-rate-limiter.manager';
import { SuggestionFactoryManager } from './managers/suggestion-factory.manager';
import { TriggerRuleSeederManager } from './managers/trigger-rule-seeder.manager';
import { SuggestionTriggerRuleRepository } from './repositories/suggestion-trigger-rule.repository';
import { SuggestionTriggerRuleService } from './services/suggestion-trigger-rule.service';

@Module({
  imports: [AiActionsModule],
  controllers: [TriggerRuleController],
  providers: [
    SuggestionTriggerRuleRepository,
    SuggestionTriggerRuleService,
    SuggestionFactoryManager,
    SuggestionFactoryRateLimiterManager,
    TriggerRuleSeederManager,
    WebhookEventConsumer,
  ],
  exports: [SuggestionFactoryManager],
})
export class SuggestionFactoryModule {}
