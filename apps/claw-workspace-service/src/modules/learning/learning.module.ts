import { Module } from '@nestjs/common';

import { AiActionDecisionConsumer } from './consumers/ai-action-decision.consumer';
import { PreferenceClassifierManager } from './managers/preference-classifier.manager';
import { PreferenceUpsertService } from './services/preference-upsert.service';

@Module({
  providers: [PreferenceClassifierManager, PreferenceUpsertService, AiActionDecisionConsumer],
  exports: [PreferenceClassifierManager, PreferenceUpsertService],
})
export class LearningModule {}
