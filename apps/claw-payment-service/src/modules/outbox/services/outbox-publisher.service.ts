import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { AppConfig } from '../../../app/config/app.config';
import { ScheduledJobRunnerService } from '../../scheduled-jobs/services/scheduled-job-runner.service';
import {
  OUTBOX_DRAIN_BATCH_SIZE,
  OUTBOX_DRAIN_JOB_NAME,
  OUTBOX_DRAIN_LOCK_KEY,
  OUTBOX_DRAIN_LOCK_TTL_SECONDS,
  OUTBOX_RETRY_BASE_DELAY_MS,
  OUTBOX_RETRY_MAX_DELAY_MS,
} from '../constants/outbox.constants';
import { OutboxRepository } from '../repositories/outbox.repository';
import type { OutboxPublishCandidate } from '../types/outbox-publisher.types';
import { addOutboxEventId } from '../utilities/outbox-envelope.utility';

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(
    private readonly repository: OutboxRepository,
    private readonly rabbit: RabbitMQService,
    private readonly jobs: ScheduledJobRunnerService,
  ) {}

  @Interval(AppConfig.get().PAYMENT_OUTBOX_POLL_INTERVAL_MS)
  async scheduledDrain(): Promise<void> {
    this.logger.debug('scheduledDrain: interval fired');
    await this.drain();
  }

  async drain(nowMs: number = Date.now()): Promise<number> {
    this.logger.debug(`drain: requested at=${String(nowMs)}`);
    try {
      const published = await this.jobs.run(
        {
          jobName: OUTBOX_DRAIN_JOB_NAME,
          lockKey: OUTBOX_DRAIN_LOCK_KEY,
          lockTtlSeconds: OUTBOX_DRAIN_LOCK_TTL_SECONDS,
        },
        async () => this.drainBatch(nowMs),
      );
      return published ?? 0;
    } catch (error) {
      this.logger.error(`drain: failed — ${(error as Error).message}`);
      return 0;
    }
  }

  private async drainBatch(nowMs: number): Promise<number> {
    const batch = await this.repository.claimBatch(OUTBOX_DRAIN_BATCH_SIZE, new Date(nowMs));
    let published = 0;
    for (const event of batch) {
      published += (await this.publishOne(event)) ? 1 : 0;
    }
    if (published > 0) {
      this.logger.log(`drainBatch: published ${String(published)}/${String(batch.length)} events`);
    }
    return published;
  }

  private async publishOne(event: OutboxPublishCandidate): Promise<boolean> {
    try {
      await this.rabbit.publish(event.pattern, addOutboxEventId(event.payloadJson, event.eventId));
      await this.repository.markPublished(event.id);
      return true;
    } catch {
      const attempts = event.attempts + 1;
      const maxAttempts = AppConfig.get().PAYMENT_OUTBOX_MAX_ATTEMPTS;
      const delayMs = Math.min(
        OUTBOX_RETRY_BASE_DELAY_MS * 2 ** (attempts - 1),
        OUTBOX_RETRY_MAX_DELAY_MS,
      );
      await this.repository.markFailed(
        event.id,
        attempts,
        maxAttempts,
        new Date(Date.now() + delayMs),
        'PUBLISH_FAILED',
      );
      this.logger.error(
        `publishOne: ${event.pattern} attempt=${String(attempts)}/${String(maxAttempts)}`,
      );
      return false;
    }
  }
}
