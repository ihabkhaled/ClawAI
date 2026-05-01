import { Module } from '@nestjs/common';

import { AiActionsModule } from '../ai-actions/ai-actions.module';

import { TriggerRuleController } from './controllers/trigger-rule.controller';
import { WebhookEventConsumer } from './consumers/webhook-event.consumer';
import { SuggestionFactoryManager } from './managers/suggestion-factory.manager';
import { TriggerRuleSeederManager } from './managers/trigger-rule-seeder.manager';
import { SuggestionTriggerRuleRepository } from './repositories/suggestion-trigger-rule.repository';

@Module({
  imports: [AiActionsModule],
  controllers: [TriggerRuleController],
  providers: [
    SuggestionTriggerRuleRepository,
    SuggestionFactoryManager,
    TriggerRuleSeederManager,
    WebhookEventConsumer,
  ],
  exports: [SuggestionFactoryManager],
})
export class SuggestionFactoryModule {}
