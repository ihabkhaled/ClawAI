import { EventPattern, FeedbackType, type ThreadGenerationFailedPayload } from '@claw/shared-types';

import { ThreadGenerationFailedConsumer } from '../thread-generation-failed.consumer';

const payload: ThreadGenerationFailedPayload = {
  jobId: 'job-1',
  correlationId: 'corr-1',
  errorCode: 'GENERATION_FAILED',
  ownerId: 'owner-1',
  failedStage: 'JUDGE',
  attemptCount: 3,
  failureSummary: 'Generation did not pass consensus and reviews in three rounds',
  sourceSnapshotHash: 'b'.repeat(64),
  budgetCloseStatus: 'RELEASED',
  roles: [],
  queuedAt: '2026-10-07T10:00:00.000Z',
  startedAt: '2026-10-07T10:00:05.000Z',
  failedAt: '2026-10-07T10:04:00.000Z',
};

describe('ThreadGenerationFailedConsumer', () => {
  it('subscribes to the failure event', async () => {
    const rabbitmq = { subscribe: vi.fn().mockResolvedValue(undefined) };
    const consumer = new ThreadGenerationFailedConsumer(rabbitmq as never, {} as never);

    await consumer.onModuleInit();

    expect(rabbitmq.subscribe).toHaveBeenCalledWith(
      EventPattern.THREAD_GENERATION_FAILED,
      expect.any(Function),
    );
  });

  it('opens one bug ticket keyed on the job', async () => {
    const feedback = {
      createSystemTicket: vi
        .fn()
        .mockResolvedValue({ id: 't1', ticketNumber: 'FB-1', created: true }),
    };
    const consumer = new ThreadGenerationFailedConsumer({} as never, feedback as never);

    await consumer.handle(payload);

    expect(feedback.createSystemTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        externalKey: 'threads-generation:job-1',
        type: FeedbackType.BUG_REPORT,
        title: expect.stringContaining('JUDGE'),
        contentMarkdown: expect.stringContaining('| Failed stage | JUDGE |'),
      }),
    );
  });

  it('does not throw when the ticket cannot be opened', async () => {
    const feedback = { createSystemTicket: vi.fn().mockRejectedValue(new Error('mongo down')) };
    const consumer = new ThreadGenerationFailedConsumer({} as never, feedback as never);

    await expect(consumer.handle(payload)).resolves.toBeUndefined();
  });
});
