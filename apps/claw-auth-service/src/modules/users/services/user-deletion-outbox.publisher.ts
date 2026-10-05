import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { UserDeletionOutboxRepository } from '../repositories/user-deletion-outbox.repository';
import {
  USER_DELETION_OUTBOX_POLL_INTERVAL_MS,
  USER_DELETION_OUTBOX_RETRY_BASE_DELAY_MS,
  USER_DELETION_OUTBOX_RETRY_MAX_DELAY_MS,
  USER_DELETION_OUTBOX_STALE_PUBLISHING_MS,
} from '../constants/user-deletion-outbox.constants';

@Injectable()
export class UserDeletionOutboxPublisher {
  private readonly logger = new Logger(UserDeletionOutboxPublisher.name);

  constructor(
    private readonly repository: UserDeletionOutboxRepository,
    private readonly rabbit: RabbitMQService,
  ) {}

  @Interval(USER_DELETION_OUTBOX_POLL_INTERVAL_MS)
  async scheduledDrain(): Promise<void> {
    await this.drain();
  }

  async drain(nowMs = Date.now()): Promise<number> {
    let events;
    try {
      await this.repository.recoverStalled(
        new Date(nowMs - USER_DELETION_OUTBOX_STALE_PUBLISHING_MS),
      );
      events = await this.repository.claimBatch(new Date(nowMs));
    } catch {
      this.logger.error('drain: outbox storage unavailable');
      return 0;
    }

    let published = 0;
    for (const event of events) {
      if (!event.userId) continue;
      try {
        await this.rabbit.publish(EventPattern.USER_DELETED, {
          eventId: event.eventId,
          userId: event.userId,
          deletedAt: event.deletedAt.toISOString(),
          timestamp: event.deletedAt.toISOString(),
        });
        await this.repository.markPublished(event.id);
        published += 1;
      } catch {
        const attempts = event.attempts;
        const delayMs = Math.min(
          USER_DELETION_OUTBOX_RETRY_BASE_DELAY_MS * 2 ** (attempts - 1),
          USER_DELETION_OUTBOX_RETRY_MAX_DELAY_MS,
        );
        try {
          await this.repository.markFailed(event.id, attempts, new Date(nowMs + delayMs));
        } catch {
          this.logger.error(`publishOne: retry state failed for event=${event.eventId}`);
        }
        this.logger.warn(`publishOne: retry scheduled for event=${event.eventId}`);
      }
    }
    return published;
  }
}
