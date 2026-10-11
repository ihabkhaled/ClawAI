import type { UserNotificationKind } from '@claw/shared-types';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import { AuthEmailAdapter } from '../../auth/adapters/auth-email.adapter';
import { WebPushAdapter } from '../adapters/web-push.adapter';
import {
  NOTIFICATION_EMAIL_KIND,
  NOTIFICATION_EMAIL_TITLE_FALLBACK,
  PUSH_MAX_SUBSCRIPTIONS_PER_USER,
} from '../constants/notifications.constants';
import {
  type NotificationListQueryDto,
  type NotificationPreferencesDto,
  type PushSubscriptionDto,
  userNotificationRequestedSchema,
} from '../dto/notifications.dto';
import { UserNotificationsRepository } from '../repositories/user-notifications.repository';
import type {
  NotificationPage,
  NotificationPreferencesView,
  NotificationRecipientRecord,
  NotificationView,
  PushConfigView,
} from '../types/notifications.types';
import { toNotificationView } from '../utilities/notification-view.utility';
import { buildPushMessage } from '../utilities/push-message.utility';

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
    private readonly push: WebPushAdapter,
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
    if (preferences.pushEnabled) {
      await this.sendPush(recipient, request.kind, request.link, request.dedupeKey);
    }
  }

  getPushConfig(): PushConfigView {
    return this.push.getConfig();
  }

  /** Saves this browser for the caller and turns the push channel on: granting permission is the opt-in. */
  async subscribePush(userId: string, subscription: PushSubscriptionDto): Promise<void> {
    if (!this.push.getConfig().enabled) {
      throw new BusinessException(
        'Push notifications are not configured',
        'PUSH_NOT_CONFIGURED',
        HttpStatus.NOT_FOUND,
      );
    }
    const input = {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    };
    const known = await this.notifications.hasSubscription(userId, input.endpoint);
    const count = known ? 0 : await this.notifications.countSubscriptions(userId);
    if (count >= PUSH_MAX_SUBSCRIPTIONS_PER_USER) {
      throw new BusinessException(
        'Too many browsers are subscribed',
        'PUSH_TOO_MANY_BROWSERS',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const saved = await this.notifications.saveSubscription(userId, input);
    if (!saved) {
      throw new BusinessException(
        'This browser subscription belongs to another account',
        'PUSH_ENDPOINT_IN_USE',
        HttpStatus.CONFLICT,
      );
    }
    await this.notifications.savePreferences(userId, { pushEnabled: true });
  }

  /** Forgets one browser. When it was the last, the push channel is switched off with it. */
  async unsubscribePush(userId: string, endpoint: string): Promise<void> {
    await this.notifications.deleteSubscription(userId, endpoint);
    if ((await this.notifications.countSubscriptions(userId)) === 0) {
      await this.notifications.savePreferences(userId, { pushEnabled: false });
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

  /** Best effort, like email: one dead browser must not stop the others. */
  private async sendPush(
    recipient: NotificationRecipientRecord,
    kind: UserNotificationKind,
    link: string,
    dedupeKey: string,
  ): Promise<void> {
    const message = buildPushMessage(recipient.languagePreference, kind, link, dedupeKey);
    const subscriptions = await this.notifications.findSubscriptions(recipient.id);
    // In parallel: one slow or dead browser must not hold up the others (each send has a timeout).
    await Promise.all(
      subscriptions.map(async (subscription) => {
        const outcome = await this.push.send(subscription, message);
        if (outcome === 'GONE') {
          await this.notifications.deleteGoneSubscription(subscription.endpoint);
        } else if (outcome === 'SENT') {
          await this.notifications.touchSubscription(subscription.endpoint);
        }
      }),
    );
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
