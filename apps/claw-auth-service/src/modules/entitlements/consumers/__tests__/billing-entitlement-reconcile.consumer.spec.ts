import { Test } from '@nestjs/testing';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { EntitlementReconciliationService } from '../../services/entitlement-reconciliation.service';
import { BillingEntitlementReconcileConsumer } from '../billing-entitlement-reconcile.consumer';

describe('BillingEntitlementReconcileConsumer', () => {
  const rabbitmq = {
    subscribe: jest.fn(),
  };
  const reconciliation = {
    handle: jest.fn(),
  };
  let consumer: BillingEntitlementReconcileConsumer;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        BillingEntitlementReconcileConsumer,
        { provide: RabbitMQService, useValue: rabbitmq },
        { provide: EntitlementReconciliationService, useValue: reconciliation },
      ],
    }).compile();
    consumer = module.get(BillingEntitlementReconcileConsumer);
  });

  it('subscribes the reconcile request to the authoritative payment lookup', async () => {
    await consumer.onModuleInit();
    expect(rabbitmq.subscribe).toHaveBeenCalledWith(
      EventPattern.BILLING_ENTITLEMENT_RECONCILE_REQUESTED,
      expect.any(Function),
    );

    const handler = rabbitmq.subscribe.mock.calls[0]?.[1];
    const payload = { eventId: 'event-1' };
    await handler(payload);
    expect(reconciliation.handle).toHaveBeenCalledWith(payload);
  });
});
