import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  UserNotificationKind,
  type UserNotificationRequestedPayload,
} from '@claw/shared-types';
import { Injectable, Logger } from '@nestjs/common';

import { PublicationsRepository } from '../repositories/publications.repository';
import type { PublishedPublication } from '../types/publication.types';
import type { NotificationPublicationTarget } from '../types/thread-notification.types';
import {
  notificationTitle,
  publicLink,
  reviewLink,
} from '../utilities/thread-notification.utility';

/**
 * Tells the owner about the three moments they wait for: the draft is ready, it failed, it is
 * live. It only asks auth-service to notify; where and how the person is told is that service's
 * business. A notice for someone else's publication is never sent.
 */
@Injectable()
export class ThreadNotificationService {
  private readonly logger = new Logger(ThreadNotificationService.name);

  constructor(
    private readonly publications: PublicationsRepository,
    private readonly rabbit: RabbitMQService,
  ) {}

  async notifyReady(jobId: string, ownerId: string): Promise<void> {
    const target = await this.ownedTarget(jobId, ownerId);
    if (!target) return;
    await this.send({
      dedupeKey: `thread-ready:${jobId}`,
      userId: ownerId,
      kind: UserNotificationKind.THREAD_READY_FOR_REVIEW,
      link: reviewLink(target.id),
      params: {},
    });
  }

  async notifyFailed(jobId: string, ownerId: string): Promise<void> {
    const target = await this.ownedTarget(jobId, ownerId);
    await this.send({
      dedupeKey: `thread-failed:${jobId}`,
      userId: ownerId,
      kind: UserNotificationKind.THREAD_FAILED,
      link: target ? reviewLink(target.id) : '/threads',
      params: {},
    });
  }

  async notifyPublished(ownerId: string, published: PublishedPublication): Promise<void> {
    await this.send({
      // Unpublishing and approving again is a new event the owner wants to hear about.
      dedupeKey: `thread-published:${published.id}:${published.publishedAt.getTime()}`,
      userId: ownerId,
      kind: UserNotificationKind.THREAD_PUBLISHED,
      link: publicLink(published.slug),
      params: { title: notificationTitle(published.title) },
    });
  }

  private async ownedTarget(
    jobId: string,
    ownerId: string,
  ): Promise<NotificationPublicationTarget | null> {
    const target = await this.publications.findByGenerationJobId(jobId);
    if (target?.ownerId === ownerId) return target;
    this.logger.warn(`No publication of this owner for generation job ${jobId}`);
    return null;
  }

  private async send(payload: UserNotificationRequestedPayload): Promise<void> {
    await this.rabbit.publishConfirmed(EventPattern.USER_NOTIFICATION_REQUESTED, payload);
  }
}
