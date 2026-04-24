import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type WorkspaceActionBulkApprovedPayload,
  type WorkspaceActionEditedPayload,
  type WorkspaceActionStaleBlockedPayload,
} from '@claw/shared-types';

import { AuditsService } from '../services/audits.service';

/**
 * Audits the Stream 02 approval center lifecycle events that aren't already
 * covered by the base AuditEventManager (drafted / approved / rejected /
 * executed / failed).
 */
@Injectable()
export class WorkspaceActionAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(WorkspaceActionAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const entries: Array<[string, (raw: unknown) => Promise<void>]> = [
      [
        EventPattern.WORKSPACE_ACTION_EDITED,
        (raw) => this.handleEdited(raw as WorkspaceActionEditedPayload),
      ],
      [
        EventPattern.WORKSPACE_ACTION_BULK_APPROVED,
        (raw) => this.handleBulkApproved(raw as WorkspaceActionBulkApprovedPayload),
      ],
      [
        EventPattern.WORKSPACE_ACTION_STALE_BLOCKED,
        (raw) => this.handleStaleBlocked(raw as WorkspaceActionStaleBlockedPayload),
      ],
    ];
    for (const [pattern, handler] of entries) {
      await this.rabbitmq.subscribe(pattern, handler);
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  async handleEdited(payload: WorkspaceActionEditedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: payload.actorUserId,
      action: 'ACTION_EDITED',
      entityType: 'workspace_action',
      entityId: payload.actionId,
      severity: 'LOW',
      details: {
        connectorId: payload.connectorId,
        provider: payload.provider,
        actionType: payload.actionType,
        previousVersion: payload.previousVersion,
        newVersion: payload.newVersion,
      },
    });
  }

  async handleBulkApproved(payload: WorkspaceActionBulkApprovedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: payload.actorUserId,
      action: 'ACTION_BULK_APPROVED',
      entityType: 'workspace_action',
      entityId: payload.bulkGroupId,
      severity: 'MEDIUM',
      details: {
        bulkGroupId: payload.bulkGroupId,
        actionIds: payload.actionIds,
        total: payload.total,
      },
    });
  }

  async handleStaleBlocked(payload: WorkspaceActionStaleBlockedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: payload.userId,
      action: 'ACTION_STALE_BLOCKED',
      entityType: 'workspace_action',
      entityId: payload.actionId,
      severity: 'MEDIUM',
      details: {
        connectorId: payload.connectorId,
        provider: payload.provider,
        connectorStatus: payload.connectorStatus,
        reason: payload.reason,
      },
    });
  }
}
