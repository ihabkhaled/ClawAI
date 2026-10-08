import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type ThreadGenerationCompletedPayload,
  type ThreadGenerationFailedPayload,
} from '@claw/shared-types';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { ThreadNotificationService } from '../services/thread-notification.service';

/**
 * Turns generation-service's two end-of-job events into owner notifications. A failure to send
 * is rethrown so the broker keeps the message; a job with no publication of this owner is logged
 * and dropped, because retrying cannot make it appear.
 */
@Injectable()
export class ThreadGenerationEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(ThreadGenerationEventsConsumer.name);

  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly notifications: ThreadNotificationService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.subscribe(EventPattern.THREAD_GENERATION_COMPLETED, (raw) =>
      this.onCompleted(raw as ThreadGenerationCompletedPayload),
    );
    await this.rabbit.subscribe(EventPattern.THREAD_GENERATION_FAILED, (raw) =>
      this.onFailed(raw as ThreadGenerationFailedPayload),
    );
  }

  async onCompleted(payload: ThreadGenerationCompletedPayload): Promise<void> {
    try {
      await this.notifications.notifyReady(payload.jobId, payload.ownerId);
    } catch (error) {
      this.logger.error(`Could not notify about completed Threads job ${payload.jobId}`);
      throw error;
    }
  }

  async onFailed(payload: ThreadGenerationFailedPayload): Promise<void> {
    try {
      await this.notifications.notifyFailed(payload.jobId, payload.ownerId);
    } catch (error) {
      this.logger.error(`Could not notify about failed Threads job ${payload.jobId}`);
      throw error;
    }
  }
}
