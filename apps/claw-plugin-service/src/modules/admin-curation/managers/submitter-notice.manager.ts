import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern, UserNotificationKind } from '@claw/shared-types';

import { SERVER_DECIDED_LINK } from '../constants/curation.constants';
import { type ServerDecisionNotice } from '../types/curation.types';

/**
 * Tells the person who registered a server what the admin decided, through auth-service's notification
 * pipeline (in-app, email, push). Best effort: a broker failure is logged without the content and never
 * undoes the decision. The event carries a kind and short params; the words are chosen from the kind.
 */
@Injectable()
export class SubmitterNoticeManager {
  private readonly logger = new Logger(SubmitterNoticeManager.name);

  constructor(private readonly rabbit: RabbitMQService) {}

  async approved(notice: ServerDecisionNotice): Promise<void> {
    await this.send(UserNotificationKind.MCP_SERVER_APPROVED, 'mcp-server-approved', notice, {
      title: notice.serverName,
    });
  }

  async rejected(notice: ServerDecisionNotice): Promise<void> {
    await this.send(UserNotificationKind.MCP_SERVER_REJECTED, 'mcp-server-rejected', notice, {
      title: notice.serverName,
      excerpt: notice.reason ?? '',
    });
  }

  private async send(
    kind: UserNotificationKind,
    prefix: string,
    notice: ServerDecisionNotice,
    params: Record<string, string>,
  ): Promise<void> {
    try {
      await this.rabbit.publishConfirmed(EventPattern.USER_NOTIFICATION_REQUESTED, {
        dedupeKey: `${prefix}:${notice.serverId}:${String(notice.decidedAt.getTime())}`,
        userId: notice.ownerUserId,
        kind,
        link: SERVER_DECIDED_LINK,
        params,
      });
    } catch (error: unknown) {
      this.logger.warn(
        `send: a ${kind} notification could not be sent - ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
