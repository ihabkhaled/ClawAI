import type { UserNotificationKind } from '@claw/shared-types';
import { Injectable, Logger } from '@nestjs/common';

import { AuthEmailAdapter } from '../../auth/adapters/auth-email.adapter';
import {
  NOTIFICATION_EMAIL_KIND,
  NOTIFICATION_EMAIL_TITLE_FALLBACK,
} from '../constants/notifications.constants';
import {
  type NotificationListQueryDto,
  type NotificationPreferencesDto,
  userNotificationRequestedSchema,
} from '../dto/notifications.dto';
import { UserNotificationsRepository } from '../repositories/user-notifications.repository';
import type {
  NotificationPage,
  NotificationPreferencesView,
  NotificationRecipientRecord,
  NotificationView,
} from '../types/notifications.types';
import { toNotificationView } from '../utilities/notification-view.utility';

/**
 * Notifications for the signed-in person and the delivery of new ones.
 *
 * Delivery order matters: the row is written FIRST, because its (user, dedupe key) pair is what
 * makes a redelivered event harmless. Email is sent only by the call that created the row, so a
 * replay never emails twice. A person who turned in-app off still gets the row (it guards
 * against duplicates) but it is stored already read, so it never lights the bell.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notifications: UserNotificationsRepository,
    private readonly email: AuthEmailAdapter,
  ) {}

  /** Handles one `user.notification_requested` event. A malformed or unknown-recipient event is dropped. */
  async receive(raw: unknown): Promise<void> {
    const parsed = userNotificationRequestedSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn('Dropped a notification request that failed validation');
      return;
    }
    const request = parsed.data;
    const recipient = await this.notifications.findRecipient(request.userId);
    if (recipient?.isActive !== true) {
      this.logger.warn('Dropped a notification request for a missing or inactive account');
      return;
    }
    const preferences = await this.notifications.getPreferences(recipient.id);
    const created = await this.notifications.createIfAbsent({
      userId: recipient.id,
      dedupeKey: request.dedupeKey,
      kind: request.kind,
      link: request.link,
      params: request.params,
      readAt: preferences.inAppEnabled ? null : new Date(),
    });
    if (!created) {
      return;
    }
    if (preferences.emailEnabled && recipient.isEmailVerified) {
      await this.sendEmail(recipient, request.kind, request.params, request.link);
    }
  }

  async getPage(userId: string, query: NotificationListQueryDto): Promise<NotificationPage> {
    const rows = await this.notifications.findPage(userId, query.cursor ?? null, query.limit);
    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const items = pageRows.flatMap((row): NotificationView[] => {
      const view = toNotificationView(row);
      return view === null ? [] : [view];
    });
    return {
      items,
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
      unreadCount: await this.notifications.countUnread(userId),
    };
  }

  async markRead(userId: string, id: string): Promise<{ unreadCount: number }> {
    await this.notifications.markRead(userId, id);
    return { unreadCount: await this.notifications.countUnread(userId) };
  }

  async markAllRead(userId: string): Promise<{ unreadCount: number }> {
    await this.notifications.markAllRead(userId);
    return { unreadCount: 0 };
  }

  getPreferences(userId: string): Promise<NotificationPreferencesView> {
    return this.notifications.getPreferences(userId);
  }

  updatePreferences(
    userId: string,
    patch: NotificationPreferencesDto,
  ): Promise<NotificationPreferencesView> {
    return this.notifications.savePreferences(userId, patch);
  }

  /** Best effort: a mail failure must not undo the notification the person can already see. */
  private async sendEmail(
    recipient: NotificationRecipientRecord,
    kind: UserNotificationKind,
    params: Record<string, string>,
    link: string,
  ): Promise<void> {
    try {
      const title = params['title'];
      await this.email.sendThreadNotification(
        {
          email: recipient.email,
          locale: recipient.languagePreference,
          firstName: recipient.firstName,
        },
        NOTIFICATION_EMAIL_KIND[kind],
        title === undefined || title.length === 0 ? NOTIFICATION_EMAIL_TITLE_FALLBACK : title,
        link,
      );
    } catch {
      this.logger.warn('A notification email could not be sent');
    }
  }
}
