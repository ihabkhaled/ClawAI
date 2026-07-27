import { EventPattern } from '@claw/shared-types';

import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { EntitlementInboxService } from '../services/entitlement-inbox.service';
import { BillingEntitlementConsumer } from '../consumers/billing-entitlement.consumer';

describe('BillingEntitlementConsumer', () => {
  let rabbit: { subscribe: jest.Mock };
  let inbox: { handle: jest.Mock };
  let consumer: BillingEntitlementConsumer;

  beforeEach(() => {
    rabbit = { subscribe: jest.fn() };
    inbox = { handle: jest.fn() };
    consumer = new BillingEntitlementConsumer(
      rabbit as unknown as RabbitMQService,
      inbox as unknown as EntitlementInboxService,
    );
  });

  it('subscribes applied downgrades through the durable entitlement inbox', async () => {
    await consumer.onModuleInit();

    const subscription = rabbit.subscribe.mock.calls.find(
      ([pattern]) => pattern === EventPattern.BILLING_SUBSCRIPTION_DOWNGRADED,
    );
    expect(subscription).toBeDefined();

    const handler = subscription?.[1] as (payload: unknown) => Promise<void>;
    const payload = { eventId: 'event-1' };
    await handler(payload);
    expect(inbox.handle).toHaveBeenCalledWith(
      EventPattern.BILLING_SUBSCRIPTION_DOWNGRADED,
      payload,
    );
  });
});
