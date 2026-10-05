import { describe, expect, it, vi } from 'vitest';
import { EventPattern } from '@claw/shared-types';
import { AccountDeletionConsumer } from '../account-deletion.consumer';

describe('Thread Generation AccountDeletionConsumer', () => {
  it('subscribes to user deletion and applies its payload', async () => {
    let handler: ((event: unknown) => Promise<void>) | undefined;
    const rabbit = {
      subscribe: vi.fn(async (_pattern: string, callback: (event: unknown) => Promise<void>) => {
        handler = callback;
      }),
    };
    const accountDeletion = { handle: vi.fn() };
    const consumer = new AccountDeletionConsumer(rabbit as never, accountDeletion as never);

    await consumer.onModuleInit();
    await handler?.({ eventId: 'event-1' });

    expect(rabbit.subscribe).toHaveBeenCalledWith(EventPattern.USER_DELETED, expect.any(Function));
    expect(accountDeletion.handle).toHaveBeenCalledWith({ eventId: 'event-1' });
  });

  it('rethrows failures so RabbitMQ retries the durable event', async () => {
    const rabbit = { subscribe: vi.fn() };
    const accountDeletion = { handle: vi.fn().mockRejectedValue(new Error('storage failure')) };
    const consumer = new AccountDeletionConsumer(rabbit as never, accountDeletion as never);
    await consumer.onModuleInit();
    const callback = rabbit.subscribe.mock.calls[0]?.[1] as (event: unknown) => Promise<void>;

    await expect(callback({ eventId: 'event-1' })).rejects.toThrow(
      'Account deletion processing failed',
    );
  });
});
