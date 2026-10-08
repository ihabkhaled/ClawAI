import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { NotificationsService } from '../services/notifications.service';

/**
 * Any service can ask auth-service to tell one user something (`user.notification_requested`).
 * Today the producer is threads-service. A malformed event is dropped inside the service; an
 * infrastructure failure is rethrown so the broker keeps the message instead of losing the notice.
 */
@Injectable()
export class UserNotificationRequestedConsumer implements OnModuleInit {
  private readonly logger = new Logger(UserNotificationRequestedConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(EventPattern.USER_NOTIFICATION_REQUESTED, (raw) =>
      this.handle(raw),
    );
    this.logger.log(`Subscribed to event: ${EventPattern.USER_NOTIFICATION_REQUESTED}`);
  }

  async handle(raw: unknown): Promise<void> {
    try {
      await this.notifications.receive(raw);
    } catch (error) {
      this.logger.error('Could not process a notification request');
      throw error;
    }
  }
}
