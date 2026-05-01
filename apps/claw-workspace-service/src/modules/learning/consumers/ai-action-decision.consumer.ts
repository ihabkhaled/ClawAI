import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { PreferenceClassifierManager } from '../managers/preference-classifier.manager';
import { PreferenceUpsertService } from '../services/preference-upsert.service';
import type { AiActionDecisionEvent } from '../types/learning.types';

@Injectable()
export class AiActionDecisionConsumer implements OnModuleInit {
  private readonly logger = new Logger(AiActionDecisionConsumer.name);

  private readonly subscriptions: Array<{ pattern: EventPattern; decision: AiActionDecisionEvent['decision'] }> = [
    { pattern: EventPattern.AI_ACTION_APPROVED, decision: 'APPROVED' },
    { pattern: EventPattern.AI_ACTION_AUTO_APPROVED, decision: 'AUTO_APPROVED' },
    { pattern: EventPattern.AI_ACTION_REJECTED, decision: 'REJECTED' },
    { pattern: EventPattern.AI_ACTION_EDITED, decision: 'EDITED' },
  ];

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly classifier: PreferenceClassifierManager,
    private readonly upsertService: PreferenceUpsertService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const { pattern, decision } of this.subscriptions) {
      await this.rabbitmq.subscribe(pattern, async (raw) => {
        await this.handle({ ...(raw as AiActionDecisionEvent), decision });
      });
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  async handle(event: AiActionDecisionEvent): Promise<void> {
    this.logger.debug(
      `handle: queueId=${event.queueId} userId=${event.userId} decision=${event.decision}`,
    );
    if (event.userId.length === 0) {
      this.logger.warn(`handle: skipping event without userId queueId=${event.queueId}`);
      return;
    }
    try {
      const proposed = this.classifier.classify(event);
      if (proposed.length === 0) {
        return;
      }
      const result = await this.upsertService.upsertAll(event.userId, proposed);
      this.logger.log(
        `handle: queueId=${event.queueId} upserted=${String(result.upsertedCount)} skipped=${String(result.skippedCount)}`,
      );
      void this.rabbitmq.publish(EventPattern.MEMORY_PREFERENCE_UPSERTED, {
        userId: event.userId,
        actionKind: event.actionKind,
        upsertedCount: result.upsertedCount,
        sourceQueueId: event.queueId,
        occurredAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `handle: failed for queueId=${event.queueId} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
