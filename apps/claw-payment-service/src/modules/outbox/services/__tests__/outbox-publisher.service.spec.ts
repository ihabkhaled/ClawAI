import { type Mock, vi } from 'vitest';
import type { RabbitMQService } from '@claw/shared-rabbitmq';

import type { ScheduledJobRunnerService } from '../../../scheduled-jobs/services/scheduled-job-runner.service';
import type {
  ScheduledJobCallback,
  ScheduledJobOptions,
} from '../../../scheduled-jobs/types/scheduled-job.types';
import type { OutboxRepository } from '../../repositories/outbox.repository';
import type { OutboxPublishCandidate } from '../../types/outbox-publisher.types';
import { OutboxPublisherService } from '../outbox-publisher.service';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({
      PAYMENT_OUTBOX_MAX_ATTEMPTS: 10,
      PAYMENT_OUTBOX_POLL_INTERVAL_MS: 5_000,
    }),
  },
}));

type OutboxRepositoryMock = {
  claimBatch: Mock<(limit: number, now: Date) => Promise<OutboxPublishCandidate[]>>;
  markFailed: Mock<
    (id: string, attempts: number, maxAttempts: number, retryAt: Date, errorCode: string) =>
      Promise<void>
  >;
  markPublished: Mock<(id: string) => Promise<void>>;
};

type RabbitMock = {
  publish: Mock<(pattern: string, payload: unknown) => Promise<void>>;
};

type ScheduledJobsMock = {
  run: Mock<
    (options: ScheduledJobOptions, callback: ScheduledJobCallback<number>) =>
      Promise<number | null>
  >;
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
      claimBatch: vi.fn<(limit: number, now: Date) => Promise<OutboxPublishCandidate[]>>(async () => [event]),
      markFailed: vi.fn<
        (
          id: string,
          attempts: number,
          maxAttempts: number,
          retryAt: Date,
          errorCode: string,
        ) => Promise<void>
      >(async () => {}),
      markPublished: vi.fn<(id: string) => Promise<void>>(async () => {}),
    };
    rabbit = {
      publish: vi.fn<(pattern: string, payload: unknown) => Promise<void>>(async () => {}),
    };
    jobs = {
      run: vi.fn(
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
    expect(rabbit.publish).toHaveBeenCalledWith(event.pattern, {
      ...event.payloadJson,
      eventId: event.eventId,
    });
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
    const drain = vi.spyOn(service, 'drain').mockResolvedValueOnce(0);

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
