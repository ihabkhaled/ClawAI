import { EventPattern } from '@claw/shared-types';

import { ThreadGenerationEventsConsumer } from '../thread-generation-events.consumer';

function build() {
  const handlers = new Map<string, (raw: unknown) => Promise<void>>();
  const rabbit = {
    subscribe: vi.fn().mockImplementation(async (pattern: string, handler) => {
      handlers.set(pattern, handler);
    }),
  };
  const notifications = {
    notifyReady: vi.fn().mockResolvedValue(undefined),
    notifyFailed: vi.fn().mockResolvedValue(undefined),
  };
  const consumer = new ThreadGenerationEventsConsumer(rabbit as never, notifications as never);
  return { consumer, handlers, notifications };
}

describe('ThreadGenerationEventsConsumer', () => {
  it('subscribes to both end-of-job events', async () => {
    const { consumer, handlers } = build();
    await consumer.onModuleInit();
    expect([...handlers.keys()].sort()).toEqual(
      [EventPattern.THREAD_GENERATION_COMPLETED, EventPattern.THREAD_GENERATION_FAILED].sort(),
    );
  });

  it('turns a completed event into a ready notice', async () => {
    const { consumer, handlers, notifications } = build();
    await consumer.onModuleInit();
    await handlers.get(EventPattern.THREAD_GENERATION_COMPLETED)?.({
      jobId: 'job-1',
      correlationId: 'c',
      ownerId: 'owner-1',
    });
    expect(notifications.notifyReady).toHaveBeenCalledExactlyOnceWith('job-1', 'owner-1');
  });

  it('turns a failed event into a failure notice', async () => {
    const { consumer, handlers, notifications } = build();
    await consumer.onModuleInit();
    await handlers.get(EventPattern.THREAD_GENERATION_FAILED)?.({
      jobId: 'job-2',
      ownerId: 'owner-2',
    });
    expect(notifications.notifyFailed).toHaveBeenCalledExactlyOnceWith('job-2', 'owner-2');
  });

  it('rethrows so the broker keeps a message it could not turn into a notice', async () => {
    const { consumer, notifications } = build();
    notifications.notifyReady.mockRejectedValue(new Error('down'));
    await expect(
      consumer.onCompleted({ jobId: 'j', correlationId: 'c', ownerId: 'o' }),
    ).rejects.toThrow('down');
  });
});
