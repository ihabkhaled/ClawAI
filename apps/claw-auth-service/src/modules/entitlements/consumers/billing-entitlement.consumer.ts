import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import {
  ENTITLEMENT_GRANTING_PATTERNS,
  ENTITLEMENT_REVOKING_PATTERNS,
} from '../constants/entitlement-inbox.constants';
import { EntitlementInboxService } from '../services/entitlement-inbox.service';

@Injectable()
export class BillingEntitlementConsumer implements OnModuleInit {
  private readonly logger = new Logger(BillingEntitlementConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly inbox: EntitlementInboxService,
  ) {}

  async onModuleInit(): Promise<void> {
    const patterns = [...ENTITLEMENT_GRANTING_PATTERNS, ...ENTITLEMENT_REVOKING_PATTERNS];
    for (const pattern of patterns) {
      await this.rabbitmq.subscribe(pattern, async (payload: unknown) => {
        await this.inbox.handle(pattern, payload);
      });
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }
}
