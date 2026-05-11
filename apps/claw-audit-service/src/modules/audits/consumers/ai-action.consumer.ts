import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { AuditsService } from '../services/audits.service';
import type {
  AiActionAuditEvent,
  AiActionPolicyAuditEvent,
} from '../types/ai-action-audit.types';
import {
  AI_ACTION_EVENT_HANDLERS,
  AI_ACTION_POLICY_EVENT_HANDLERS,
  resolveSeverity,
} from '../constants/ai-action-audit.constants';

@Injectable()
export class AiActionAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(AiActionAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const entry of AI_ACTION_EVENT_HANDLERS) {
      await this.rabbitmq.subscribe(entry.pattern, (raw) =>
        this.handle(entry.action, raw as AiActionAuditEvent),
      );
      this.logger.log(`Subscribed to event: ${entry.pattern}`);
    }
    for (const entry of AI_ACTION_POLICY_EVENT_HANDLERS) {
      await this.rabbitmq.subscribe(entry.pattern, (raw) =>
        this.handlePolicyEvent(entry.action, entry.defaultSeverity, raw as AiActionPolicyAuditEvent),
      );
      this.logger.log(`Subscribed to event: ${entry.pattern}`);
    }
  }

  async handlePolicyEvent(
    action: string,
    severity: string,
    payload: AiActionPolicyAuditEvent,
  ): Promise<void> {
    try {
      await this.audits.createAuditLog({
        userId: payload.actorUserId,
        action,
        entityType: 'ai_action_policy',
        entityId: payload.policyId,
        severity,
        details: {
          policyName: payload.policyName,
          kind: payload.kind,
          priority: payload.priority,
          isActive: payload.isActive,
          isSystemDefault: payload.isSystemDefault,
          before: payload.before,
          after: payload.after,
          at: payload.at,
        },
      });
    } catch (error) {
      this.logger.error(
        `failed to persist policy audit for ${action} policyId=${payload.policyId} — ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  async handle(action: string, payload: AiActionAuditEvent): Promise<void> {
    try {
      await this.audits.createAuditLog({
        userId: payload.actorUserId ?? payload.userId,
        action,
        entityType: 'ai_action_queue',
        entityId: payload.queueId,
        severity: resolveSeverity(payload.riskLabel),
        details: {
          actionKind: payload.actionKind,
          provider: payload.provider,
          connectorId: payload.connectorId ?? null,
          riskScore: payload.riskScore,
          riskLabel: payload.riskLabel,
          matchedPolicyId: payload.matchedPolicyId ?? null,
          matchedPolicyName: payload.matchedPolicyName ?? null,
          sourceObjectId: payload.sourceObjectId ?? null,
          reason: payload.reason ?? null,
          reasonCode: payload.reasonCode ?? null,
          editedPayloadKeys: payload.editedPayloadKeys ?? null,
          occurredAt: payload.occurredAt,
        },
      });
    } catch (error) {
      this.logger.error(
        `failed to persist audit for ${action} queueId=${payload.queueId} — ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }
}
