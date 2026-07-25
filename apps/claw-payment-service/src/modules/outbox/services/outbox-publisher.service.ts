import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { AppConfig } from '../../../app/config/app.config';
import {
  OUTBOX_DRAIN_BATCH_SIZE,
  OUTBOX_RETRY_BASE_DELAY_MS,
  OUTBOX_RETRY_MAX_DELAY_MS,
} from '../constants/outbox.constants';
import { OutboxRepository } from '../repositories/outbox.repository';

// Drains the transactional outbox onto RabbitMQ.
//
// The writer commits the state change and the outbox row together, so this
// publisher can be as unreliable as the network without ever losing an
// entitlement change: a row that is not published stays PENDING and is retried.
//
// Delivery is therefore AT-LEAST-ONCE. Exactly-once does not exist across a
// database and a broker, so the consumer de-duplicates on the envelope eventId
// instead — that is what the auth inbox is for.
@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly rabbit: RabbitMQService,
  ) {}

  onModuleInit(): void {
    const intervalMs = AppConfig.get().PAYMENT_OUTBOX_POLL_INTERVAL_MS;
    this.timer = setInterval(() => {
      // Fire-and-forget on a timer: a throw here must not take the process
      // down, and the next tick retries whatever failed.
      void this.drain();
    }, intervalMs);
    this.logger.log(`onModuleInit: outbox publisher polling every ${String(intervalMs)}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // A single overlapping run could publish the same row twice, so ticks that
  // arrive while a drain is in flight are skipped rather than queued.
  async drain(nowMs: number = Date.now()): Promise<number> {
    if (this.draining) {
      return 0;
    }
    this.draining = true;
    try {
      const batch = await this.repository.claimBatch(OUTBOX_DRAIN_BATCH_SIZE, new Date(nowMs));
      let published = 0;
      for (const event of batch) {
        published += (await this.publishOne(event)) ? 1 : 0;
      }
      if (published > 0) {
        this.logger.log(`drain: published ${String(published)}/${String(batch.length)} events`);
      }
      return published;
    } catch (error) {
      this.logger.error(`drain: failed — ${(error as Error).message}`);
      return 0;
    } finally {
      this.draining = false;
    }
  }

  private async publishOne(event: {
    id: string;
    pattern: string;
    eventId: string;
    payloadJson: unknown;
    attempts: number;
  }): Promise<boolean> {
    try {
      await this.rabbit.publish(event.pattern, event.payloadJson);
      await this.repository.markPublished(event.id);
      return true;
    } catch {
      const attempts = event.attempts + 1;
      const maxAttempts = AppConfig.get().PAYMENT_OUTBOX_MAX_ATTEMPTS;
      // Exponential backoff, capped: a broker outage must not turn into a hot
      // loop hammering a dead connection.
      const delayMs = Math.min(
        OUTBOX_RETRY_BASE_DELAY_MS * 2 ** (attempts - 1),
        OUTBOX_RETRY_MAX_DELAY_MS,
      );
      // Sanitized machine code only — a broker error string can carry a
      // connection URI with credentials in it.
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
