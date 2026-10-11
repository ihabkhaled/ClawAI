import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  ADMIN_USAGE_AUDIT_ACTIONS,
  ADMIN_USAGE_EXPORTED_EVENT,
  ADMIN_USAGE_VIEWED_EVENT,
} from '../constants/observability.constants';
import { AuditsService } from '../services/audits.service';
import type { AdminUsageAuditPayload } from '../types/admin-usage-audit.types';

/**
 * Records an administrator opening a user's consumption (which shows the full
 * email address) or exporting the users list. The payload carries the actor id,
 * the target id and the filters only; this consumer copies nothing else, so an
 * email can never reach the audit store through here. A failed write is logged
 * and swallowed: rethrowing would DLQ an event whose read already happened.
 */
@Injectable()
export class AdminUsageAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(AdminUsageAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(ADMIN_USAGE_VIEWED_EVENT, (raw) =>
      this.handle(ADMIN_USAGE_AUDIT_ACTIONS.VIEWED, raw),
    );
    await this.rabbitmq.subscribe(ADMIN_USAGE_EXPORTED_EVENT, (raw) =>
      this.handle(ADMIN_USAGE_AUDIT_ACTIONS.EXPORTED, raw),
    );
    this.logger.log('Subscribed to admin usage read events');
  }

  async handle(action: string, raw: unknown): Promise<void> {
    if (typeof raw !== 'object' || raw === null) {
      return;
    }
    const payload = raw as Partial<AdminUsageAuditPayload>;
    if (typeof payload.actorUserId !== 'string' || payload.actorUserId === '') {
      return;
    }
    try {
      await this.audits.createAuditLog({
        userId: payload.actorUserId,
        action,
        entityType: 'user',
        entityId: payload.targetUserId ?? undefined,
        severity: 'MEDIUM',
        details: { filters: payload.filters ?? {}, at: payload.at },
      });
    } catch (error) {
      this.logger.error(`handle: ${action} audit write failed - ${(error as Error).message}`);
    }
  }
}
