import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { EntitlementReconciliationService } from '../services/entitlement-reconciliation.service';

@Injectable()
export class BillingEntitlementReconcileConsumer implements OnModuleInit {
  private readonly logger = new Logger(BillingEntitlementReconcileConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly reconciliation: EntitlementReconciliationService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(
      EventPattern.BILLING_ENTITLEMENT_RECONCILE_REQUESTED,
      async (payload: unknown) => {
        await this.reconciliation.handle(payload);
      },
    );
    this.logger.log(`Subscribed to event: ${EventPattern.BILLING_ENTITLEMENT_RECONCILE_REQUESTED}`);
  }
}
