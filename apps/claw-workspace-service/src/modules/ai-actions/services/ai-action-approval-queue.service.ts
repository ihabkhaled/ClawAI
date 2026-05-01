import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AiActionQueueStatus } from '../../../common/enums/ai-action-queue-status.enum';
import { AiActionRiskLabel } from '../../../common/enums/ai-action-risk-label.enum';
import { RISK_LEVEL_ORDER } from '../constants/ai-action-policy.constants';
import { AiActionApprovalQueueRepository } from '../repositories/ai-action-approval-queue.repository';
import type {
  ApproveQueueInput,
  BulkApproveInput,
  BulkApproveResult,
  EditAndApproveQueueInput,
  QueueListFilters,
  RejectQueueInput,
} from '../types/ai-action-policy.types';
import type { AiActionApprovalQueue, Prisma } from '../../../generated/prisma';

@Injectable()
export class AiActionApprovalQueueService {
  private readonly logger = new Logger(AiActionApprovalQueueService.name);

  constructor(
    private readonly repo: AiActionApprovalQueueRepository,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async list(userId: string, filters: QueueListFilters): Promise<AiActionApprovalQueue[]> {
    return this.repo.list({ ...filters, userId });
  }

  async getById(id: string, userId: string): Promise<AiActionApprovalQueue> {
    const row = await this.repo.findByIdAndUser(id, userId);
    if (row === null) throw new NotFoundException({ messageKey: 'QUEUE_ENTRY_NOT_FOUND' });
    return row;
  }

  async approve(input: ApproveQueueInput): Promise<AiActionApprovalQueue> {
    const row = await this.assertActionable(input.queueId, input.userId);
    const updated = await this.repo.updateStatus(row.id, AiActionQueueStatus.APPROVED);
    void this.publish(EventPattern.AI_ACTION_APPROVED, this.eventPayload(updated, input.userId));
    return updated;
  }

  async reject(input: RejectQueueInput): Promise<AiActionApprovalQueue> {
    const row = await this.assertActionable(input.queueId, input.userId);
    if (this.requiresReason(row) && input.reason.length < 10) {
      throw new BadRequestException({ messageKey: 'REJECTION_REASON_REQUIRED' });
    }
    const updated = await this.repo.updateStatus(row.id, AiActionQueueStatus.REJECTED, {
      rejectionReason: input.reason,
    });
    void this.publish(EventPattern.AI_ACTION_REJECTED, {
      ...this.eventPayload(updated, input.userId),
      reason: input.reason,
    });
    return updated;
  }

  async editAndApprove(input: EditAndApproveQueueInput): Promise<AiActionApprovalQueue> {
    const row = await this.assertActionable(input.queueId, input.userId);
    const updated = await this.repo.updateStatus(row.id, AiActionQueueStatus.APPROVED, {
      editedPayload: input.editedPayload as Prisma.InputJsonValue,
    });
    void this.publish(EventPattern.AI_ACTION_EDITED, {
      ...this.eventPayload(updated, input.userId),
      editedPayloadKeys: Object.keys(input.editedPayload),
    });
    void this.publish(EventPattern.AI_ACTION_APPROVED, this.eventPayload(updated, input.userId));
    return updated;
  }

  async bulkApprove(input: BulkApproveInput): Promise<BulkApproveResult> {
    const approvedIds: string[] = [];
    const rejectedIds: string[] = [];
    const reasons = new Map<string, string>();
    for (const id of input.queueIds) {
      const outcome = await this.bulkApproveOne(id, input.userId);
      if (outcome.approved) {
        approvedIds.push(id);
        continue;
      }
      rejectedIds.push(id);
      reasons.set(id, outcome.reason);
    }
    return { approvedIds, rejectedIds, reasons: Object.fromEntries(reasons) };
  }

  private async bulkApproveOne(
    id: string,
    userId: string,
  ): Promise<{ approved: true } | { approved: false; reason: string }> {
    try {
      const row = await this.repo.findByIdAndUser(id, userId);
      if (row === null) return { approved: false, reason: 'NOT_FOUND' };
      if (this.isCriticalRisk(row)) {
        return { approved: false, reason: 'CRITICAL_RISK_REQUIRES_INDIVIDUAL_REVIEW' };
      }
      if (!this.isPending(row)) {
        return { approved: false, reason: `STATUS_NOT_PENDING_${row.status}` };
      }
      const updated = await this.repo.updateStatus(row.id, AiActionQueueStatus.APPROVED);
      void this.publish(EventPattern.AI_ACTION_APPROVED, this.eventPayload(updated, userId));
      return { approved: true };
    } catch (error) {
      return { approved: false, reason: error instanceof Error ? error.message : 'UNKNOWN' };
    }
  }

  private async assertActionable(queueId: string, userId: string): Promise<AiActionApprovalQueue> {
    const row = await this.repo.findById(queueId);
    if (row === null) throw new NotFoundException({ messageKey: 'QUEUE_ENTRY_NOT_FOUND' });
    if (row.userId !== userId) throw new ForbiddenException({ messageKey: 'QUEUE_ENTRY_FORBIDDEN' });
    if (!this.isPending(row)) {
      throw new BadRequestException({ messageKey: 'QUEUE_ENTRY_NOT_PENDING' });
    }
    return row;
  }

  private isPending(row: AiActionApprovalQueue): boolean {
    return row.status === AiActionQueueStatus.PENDING_APPROVAL;
  }

  private requiresReason(row: AiActionApprovalQueue): boolean {
    const order = RISK_LEVEL_ORDER[row.riskLabel as AiActionRiskLabel];
    return order >= RISK_LEVEL_ORDER[AiActionRiskLabel.HIGH];
  }

  private isCriticalRisk(row: AiActionApprovalQueue): boolean {
    return row.riskLabel === AiActionRiskLabel.CRITICAL;
  }

  private eventPayload(row: AiActionApprovalQueue, actorUserId: string): Record<string, unknown> {
    return {
      queueId: row.id,
      userId: row.userId,
      actorUserId,
      connectorId: row.connectorId,
      provider: row.provider,
      actionKind: row.actionKind,
      riskScore: row.riskScore,
      riskLabel: row.riskLabel,
      matchedPolicyId: row.matchedPolicyId,
      occurredAt: new Date().toISOString(),
    };
  }

  private async publish(pattern: EventPattern, payload: unknown): Promise<void> {
    try {
      await this.rabbitmq.publish(pattern, payload);
    } catch (error) {
      this.logger.warn(
        `failed to publish ${pattern} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
