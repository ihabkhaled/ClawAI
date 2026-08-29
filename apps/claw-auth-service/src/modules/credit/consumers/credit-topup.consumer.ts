import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { CREDIT_TOPUP_PATTERNS } from '../constants/credit-topup-inbox.constants';
import { CreditTopupInboxService } from '../services/credit-topup-inbox.service';

/**
 * Subscribes auth to the two money-moving credit patterns.
 *
 * BOOT ORDERING IS LOAD-BEARING. `claw.events` is a topic exchange and queues
 * are asserted by the CONSUMER at boot, so a routing key with no bound queue is
 * discarded silently. If payment-service drains a top-up event before this has
 * ever subscribed, the money is taken, the outbox row is marked published, and
 * nothing reaches a DLQ. auth-service must be healthy before payment-service
 * starts.
 */
@Injectable()
export class CreditTopupConsumer implements OnModuleInit {
  private readonly logger = new Logger(CreditTopupConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly inbox: CreditTopupInboxService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const pattern of CREDIT_TOPUP_PATTERNS) {
      await this.rabbitmq.subscribe(pattern, async (payload: unknown) => {
        await this.inbox.handle(pattern, payload);
      });
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }
}
