import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import {
  ADMIN_USAGE_EXPORTED_EVENT,
  ADMIN_USAGE_LISTED_EVENT,
  ADMIN_USAGE_VIEWED_EVENT,
} from '../constants/admin-usage-explorer.constants';
import { type AdminUsageAuditPayload } from '../types/admin-usage-explorer.types';

/**
 * Leaves a trail when an administrator reads a user's consumption (which shows
 * the full email address) or exports the list.
 *
 * The payload carries the actor id, the target id and the filters, never an
 * email. Publishing is best effort: a broker hiccup is logged and must not
 * turn a read-only admin screen into an outage. audit-service writes the row
 * (`ADMIN_USER_USAGE_VIEWED` / `ADMIN_USER_USAGE_EXPORTED` / `ADMIN_USER_USAGE_LISTED`).
 */
@Injectable()
export class AdminUsageAuditService {
  private readonly logger = new Logger(AdminUsageAuditService.name);

  constructor(private readonly rabbitmq: RabbitMQService) {}

  async recordViewed(
    actorUserId: string,
    targetUserId: string,
    filters: AdminUsageAuditPayload['filters'],
  ): Promise<void> {
    await this.publish(ADMIN_USAGE_VIEWED_EVENT, {
      actorUserId,
      targetUserId,
      at: new Date().toISOString(),
      filters,
    });
  }

  async recordExported(
    actorUserId: string,
    filters: AdminUsageAuditPayload['filters'],
  ): Promise<void> {
    await this.publish(ADMIN_USAGE_EXPORTED_EVENT, {
      actorUserId,
      targetUserId: null,
      at: new Date().toISOString(),
      filters,
    });
  }

  /** Any page of users (list or user leaderboard): many emails shown at once. */
  async recordListed(
    actorUserId: string,
    filters: AdminUsageAuditPayload['filters'],
  ): Promise<void> {
    await this.publish(ADMIN_USAGE_LISTED_EVENT, {
      actorUserId,
      targetUserId: null,
      at: new Date().toISOString(),
      filters,
    });
  }

  private async publish(pattern: string, payload: AdminUsageAuditPayload): Promise<void> {
    try {
      await this.rabbitmq.publish(pattern, payload);
    } catch (error) {
      this.logger.error(`publish: ${pattern} failed - ${(error as Error).message}`);
    }
  }
}
