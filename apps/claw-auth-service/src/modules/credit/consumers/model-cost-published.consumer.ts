import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { ModelRateClient } from '../clients/model-rate.client';
import { modelCostPublishedEventSchema } from '../schemas/model-cost-published-event.schema';

/**
 * Busts auth's cached copy of a model's price the moment routing-service
 * publishes a new one.
 *
 * Without this, a repricing takes up to PAYG_RATE_CACHE_TTL_SECONDS to reach
 * the meter, and for those five minutes the platform bills the OLD rate on a
 * model whose price an administrator has just corrected — under-billing on a
 * rise, over-billing on a cut. Over-billing is the one this exists to prevent:
 * it is a refund conversation, not a rounding error.
 *
 * The payload is validated. A malformed event drops a cache entry at worst, so
 * the failure mode is one extra HTTP hop rather than a bad price.
 */
@Injectable()
export class ModelCostPublishedConsumer implements OnModuleInit {
  private readonly logger = new Logger(ModelCostPublishedConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly rates: ModelRateClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(EventPattern.ROUTING_MODEL_COST_PUBLISHED, async (payload) => {
      await this.handle(payload);
    });
    this.logger.log(`Subscribed to event: ${EventPattern.ROUTING_MODEL_COST_PUBLISHED}`);
  }

  private async handle(payload: unknown): Promise<void> {
    const parsed = modelCostPublishedEventSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn('handle: ignoring a model-cost event that failed schema check');
      return;
    }
    await this.rates.invalidate(parsed.data.provider, parsed.data.model);
  }
}
