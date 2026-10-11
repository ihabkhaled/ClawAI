import { Injectable } from '@nestjs/common';

import { UserStatus } from '../../../generated/prisma';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notifications.constants';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  NewNotificationInput,
  NotificationPreferencesView,
  NotificationRecipientRecord,
  NotificationRow,
  PushSubscriptionInput,
} from '../types/notifications.types';

/** Every query is scoped by `userId`: there is no way to read or change another person's row. */
@Injectable()
export class UserNotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** True when this call made the row; false when the (user, dedupe key) pair already existed. */
  async createIfAbsent(input: NewNotificationInput): Promise<boolean> {
    const result = await this.prisma.userNotification.createMany({
      data: [
        {
          userId: input.userId,
          dedupeKey: input.dedupeKey,
          kind: input.kind,
          link: input.link,
          params: input.params,
          readAt: input.readAt,
        },
      ],
      skipDuplicates: true,
    });
    return result.count === 1;
  }

  /** Newest first. Returns one row more than `limit` so the caller knows whether another page exists. */
  async findPage(userId: string, cursor: string | null, limit: number): Promise<NotificationRow[]> {
    return this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor === null ? {} : { cursor: { id: cursor }, skip: 1 }),
      select: { id: true, kind: true, link: true, params: true, readAt: true, createdAt: true },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.userNotification.count({ where: { userId, readAt: null } });
  }

  /** Marks one of this person's notifications read. Returns false if it is not theirs or is already read. */
  async markRead(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.userNotification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count === 1;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async getPreferences(userId: string): Promise<NotificationPreferencesView> {
    const row = await this.prisma.userNotificationPreference.findUnique({
      where: { userId },
      select: { inAppEnabled: true, emailEnabled: true, pushEnabled: true },
    });
    return row ?? DEFAULT_NOTIFICATION_PREFERENCES;
  }

  async savePreferences(
    userId: string,
    patch: Partial<NotificationPreferencesView>,
  ): Promise<NotificationPreferencesView> {
    const row = await this.prisma.userNotificationPreference.upsert({
      where: { userId },
      create: { userId, ...DEFAULT_NOTIFICATION_PREFERENCES, ...patch },
      update: patch,
      select: { inAppEnabled: true, emailEnabled: true, pushEnabled: true },
    });
    return row;
  }

  async findRecipient(userId: string): Promise<NotificationRecipientRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        languagePreference: true,
        status: true,
        emailVerifiedAt: true,
      },
    });
    if (user === null) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      languagePreference: user.languagePreference,
      isActive: user.status === UserStatus.ACTIVE,
      isEmailVerified: user.emailVerifiedAt !== null,
    };
  }

  /**
   * One browser, one row. An endpoint already held by ANOTHER person is taken over only when the
   * caller proves they hold the same subscription (the same auth secret): a browser that signs in
   * as someone else sends the one it already has, while a stranger who learned an endpoint cannot
   * redirect it. Returns false when the endpoint belongs to someone else and the secret differs.
   */
  async saveSubscription(userId: string, input: PushSubscriptionInput): Promise<boolean> {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: input.endpoint },
      select: { userId: true, auth: true },
    });
    if (existing !== null && existing.userId !== userId && existing.auth !== input.auth) {
      return false;
    }
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: { userId, ...input },
      update: { userId, p256dh: input.p256dh, auth: input.auth },
    });
    return true;
  }

  async countSubscriptions(userId: string): Promise<number> {
    return this.prisma.pushSubscription.count({ where: { userId } });
  }

  async hasSubscription(userId: string, endpoint: string): Promise<boolean> {
    return (await this.prisma.pushSubscription.count({ where: { userId, endpoint } })) > 0;
  }

  async findSubscriptions(userId: string): Promise<PushSubscriptionInput[]> {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
    });
  }

  /** Only the caller's own row: another person's endpoint reads as "nothing to remove". */
  async deleteSubscription(userId: string, endpoint: string): Promise<boolean> {
    const result = await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return result.count === 1;
  }

  /** The push service said this subscription is gone; drop it whoever it belonged to. */
  async deleteGoneSubscription(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async touchSubscription(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.updateMany({
      where: { endpoint },
      data: { lastUsedAt: new Date() },
    });
  }
}
