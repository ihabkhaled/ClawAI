import { EventPattern } from '@claw/shared-types';

import { UserNotificationRequestedConsumer } from '../user-notification-requested.consumer';

describe('UserNotificationRequestedConsumer', () => {
  it('subscribes to the notification request event and passes the payload on', async () => {
    let handler: ((raw: unknown) => Promise<void>) | undefined;
    const rabbit = {
      subscribe: vi.fn().mockImplementation(async (_pattern: string, callback) => {
        handler = callback;
      }),
    };
    const notifications = { receive: vi.fn().mockResolvedValue(undefined) };
    const consumer = new UserNotificationRequestedConsumer(rabbit as never, notifications as never);

    await consumer.onModuleInit();
    await handler?.({ a: 1 });

    expect(rabbit.subscribe).toHaveBeenCalledWith(
      EventPattern.USER_NOTIFICATION_REQUESTED,
      expect.any(Function),
    );
    expect(notifications.receive).toHaveBeenCalledExactlyOnceWith({ a: 1 });
  });

  it('rethrows an infrastructure failure so the broker keeps the message', async () => {
    const notifications = { receive: vi.fn().mockRejectedValue(new Error('db down')) };
    const consumer = new UserNotificationRequestedConsumer({} as never, notifications as never);
    await expect(consumer.handle({})).rejects.toThrow('db down');
  });
});
