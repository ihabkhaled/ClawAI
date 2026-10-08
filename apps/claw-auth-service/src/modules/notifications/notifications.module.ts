import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './controllers/notifications.controller';
import { UserNotificationRequestedConsumer } from './consumers/user-notification-requested.consumer';
import { UserNotificationsRepository } from './repositories/user-notifications.repository';
import { NotificationsService } from './services/notifications.service';

/**
 * In-app and email notifications. AuthModule is imported only for the email adapter it already
 * exports: sending mail stays in one place, in the person's own language.
 */
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, UserNotificationsRepository, UserNotificationRequestedConsumer],
  exports: [NotificationsService],
})
export class NotificationsModule {}
