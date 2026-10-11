import { vi } from 'vitest';
import { EventPattern } from '@claw/shared-types';
import { type RabbitMQService } from '@claw/shared-rabbitmq';

import { type ModelRateClient } from '../../clients/model-rate.client';
import { ModelCostPublishedConsumer } from '../model-cost-published.consumer';

async function subscribeAndGetHandler(invalidate: ReturnType<typeof vi.fn>) {
  let handler: ((payload: unknown) => Promise<void>) | undefined;
  const rabbit = {
    subscribe: vi.fn(async (_pattern: EventPattern, fn: (payload: unknown) => Promise<void>) => {
      handler = fn;
    }),
  };
  const consumer = new ModelCostPublishedConsumer(
    rabbit as unknown as RabbitMQService,
    { invalidate } as unknown as ModelRateClient,
  );
  await consumer.onModuleInit();
  return { handler: handler as (payload: unknown) => Promise<void>, rabbit };
}

describe('ModelCostPublishedConsumer', () => {
  it('subscribes to the cost-published event and invalidates by modelKey', async () => {
    const invalidate = vi.fn().mockResolvedValue(undefined);
    const { handler, rabbit } = await subscribeAndGetHandler(invalidate);

    await handler({ provider: 'OPENAI', modelKey: 'gpt-4o', version: 2 });

    expect(rabbit.subscribe).toHaveBeenCalledWith(
      EventPattern.ROUTING_MODEL_COST_PUBLISHED,
      expect.any(Function),
    );
    expect(invalidate).toHaveBeenCalledWith('OPENAI', 'gpt-4o');
  });

  it('ignores a malformed payload', async () => {
    const invalidate = vi.fn();
    const { handler } = await subscribeAndGetHandler(invalidate);

    await handler({ nope: true });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
