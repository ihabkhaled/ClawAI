import { Module } from '@nestjs/common';

import { AiActionsModule } from '../ai-actions/ai-actions.module';

import { AutoSuggestController } from './controllers/auto-suggest.controller';
import { AutoSuggestOrchestratorManager } from './managers/auto-suggest-orchestrator.manager';
import { AutoSuggestSchedulerManager } from './managers/auto-suggest-scheduler.manager';
import { AutoSuggestRunRepository } from './repositories/auto-suggest-run.repository';
import { SuggestionDeduplicationRepository } from './repositories/suggestion-deduplication.repository';

@Module({
  imports: [AiActionsModule],
  controllers: [AutoSuggestController],
  providers: [
    AutoSuggestOrchestratorManager,
    AutoSuggestSchedulerManager,
    AutoSuggestRunRepository,
    SuggestionDeduplicationRepository,
  ],
  exports: [AutoSuggestOrchestratorManager, AutoSuggestSchedulerManager],
})
export class AutoSuggestModule {}
