import type { RabbitMQService } from '@claw/shared-rabbitmq';

import type { ScheduledJobRunnerService } from '../../../scheduled-jobs/services/scheduled-job-runner.service';
import type {
  ScheduledJobCallback,
  ScheduledJobOptions,
} from '../../../scheduled-jobs/types/scheduled-job.types';
import type { OutboxRepository } from '../../repositories/outbox.repository';
import type { OutboxPublishCandidate } from '../../types/outbox-publisher.types';
import { OutboxPublisherService } from '../outbox-publisher.service';

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({
      PAYMENT_OUTBOX_MAX_ATTEMPTS: 10,
      PAYMENT_OUTBOX_POLL_INTERVAL_MS: 5_000,
    }),
  },
}));

type OutboxRepositoryMock = {
  claimBatch: jest.Mock<Promise<OutboxPublishCandidate[]>, [number, Date]>;
  markFailed: jest.Mock<Promise<void>, [string, number, number, Date, string]>;
  markPublished: jest.Mock<Promise<void>, [string]>;
};

type RabbitMock = {
  publish: jest.Mock<Promise<void>, [string, unknown]>;
};

type ScheduledJobsMock = {
  run: jest.Mock<Promise<number | null>, [ScheduledJobOptions, ScheduledJobCallback<number>]>;
};

describe('OutboxPublisherService', () => {
  const event = {
    id: 'outbox-1',
    pattern: 'billing.subscription.activated',
    eventId: 'event-1',
    payloadJson: { subscriptionId: 'subscription-1' },
    attempts: 0,
  };
  let repository: OutboxRepositoryMock;
  let rabbit: RabbitMock;
  let jobs: ScheduledJobsMock;
  let service: OutboxPublisherService;

  beforeEach(() => {
    repository = {
      claimBatch: jest.fn<Promise<OutboxPublishCandidate[]>, [number, Date]>(async () => [event]),
      markFailed: jest.fn<Promise<void>, [string, number, number, Date, string]>(
        async () => {},
      ),
      markPublished: jest.fn<Promise<void>, [string]>(async () => {}),
    };
    rabbit = {
      publish: jest.fn<Promise<void>, [string, unknown]>(async () => {}),
    };
    jobs = {
      run: jest.fn(
        async (
          _options: ScheduledJobOptions,
          callback: ScheduledJobCallback<number>,
        ): Promise<number> => callback(),
      ),
    };
    service = new OutboxPublisherService(
      repository as unknown as OutboxRepository,
      rabbit as unknown as RabbitMQService,
      jobs as unknown as ScheduledJobRunnerService,
    );
  });

  it('publishes a bounded batch under the shared scheduled-job lock', async () => {
    const nowMs = Date.UTC(2026, 6, 26);

    await expect(service.drain(nowMs)).resolves.toBe(1);
    expect(jobs.run).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: 'payment.outbox.drain',
        lockKey: 'locks:payment:outbox-drain',
      }),
      expect.any(Function),
    );
    expect(repository.claimBatch).toHaveBeenCalledWith(50, new Date(nowMs));
    expect(rabbit.publish).toHaveBeenCalledWith(event.pattern, event.payloadJson);
    expect(repository.markPublished).toHaveBeenCalledWith(event.id);
  });

  it('skips without claiming rows when another replica holds the lock', async () => {
    jobs.run.mockResolvedValueOnce(null);

    await expect(service.drain()).resolves.toBe(0);
    expect(repository.claimBatch).not.toHaveBeenCalled();
  });

  it('completes an empty bounded batch without publishing', async () => {
    repository.claimBatch.mockResolvedValueOnce([]);

    await expect(service.drain()).resolves.toBe(0);
    expect(rabbit.publish).not.toHaveBeenCalled();
  });

  it('routes scheduler ticks through the guarded drain path', async () => {
    const drain = jest.spyOn(service, 'drain').mockResolvedValueOnce(0);

    await service.scheduledDrain();
    expect(drain).toHaveBeenCalledTimes(1);
  });

  it('returns failed publishes to the retry path without leaking provider errors', async () => {
    rabbit.publish.mockRejectedValueOnce(new Error('amqp://user:secret@broker'));

    await expect(service.drain()).resolves.toBe(0);
    expect(repository.markFailed).toHaveBeenCalledWith(
      event.id,
      1,
      10,
      expect.any(Date),
      'PUBLISH_FAILED',
    );
  });

  it('contains scheduler failures so the next interval can retry', async () => {
    jobs.run.mockRejectedValueOnce(new Error('redis unavailable'));

    await expect(service.drain()).resolves.toBe(0);
  });
});
