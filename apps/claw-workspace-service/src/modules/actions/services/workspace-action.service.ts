import { randomUUID } from 'node:crypto';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type WorkspaceActionBulkApprovedPayload,
  type WorkspaceActionEditedPayload,
  type WorkspaceActionStaleBlockedPayload,
} from '@claw/shared-types';
import { WorkspaceActionRepository } from '../repositories/workspace-action.repository';
import { ActionExecutionManager } from '../managers/action-execution.manager';
import { WorkspaceConnectorRepository } from '../../workspace/repositories/workspace-connector.repository';
import { ConnectorAction } from '../../connector-access/enums/connector-action.enum';
import { ConnectorAccessService } from '../../connector-access/services/connector-access.service';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { WorkspaceActionStatus } from '../../../common/enums/workspace-action-status.enum';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspacePermissionLevel } from '../../../common/enums/workspace-permission-level.enum';
import type { Prisma } from '../../../generated/prisma';
import type { CreateActionDraftDto } from '../dto/create-action-draft.dto';
import type { EditActionDto } from '../dto/edit-action.dto';
import type { BulkApproveDto } from '../dto/bulk-approve.dto';
import type { ListActionsQueryDto } from '../dto/list-actions.dto';
import type { RejectActionDto } from '../dto/reject-action.dto';
import type {
  ActionDraftRevision,
  BulkApproveOutcome,
  PaginatedWorkspaceActions,
  WorkspaceActionWithConnector,
} from '../types/action.types';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

/**
 * Statuses that mean "the connector backing this action is not currently
 * reliable for writes". Writes attempted during these states are blocked by
 * the approval service with a clear messageKey.
 */
const STALE_WRITE_BLOCKING_STATUSES: ReadonlySet<WorkspaceConnectorStatus> = new Set([
  WorkspaceConnectorStatus.DEGRADED,
  WorkspaceConnectorStatus.PAUSED,
  WorkspaceConnectorStatus.DISCONNECTED,
  WorkspaceConnectorStatus.PENDING_AUTH,
]);

const APPROVABLE_STATUSES: ReadonlySet<WorkspaceActionStatus> = new Set([
  WorkspaceActionStatus.PENDING_APPROVAL,
  WorkspaceActionStatus.EDITED,
]);

@Injectable()
export class WorkspaceActionService {
  private readonly logger = new Logger(WorkspaceActionService.name);

  constructor(
    private readonly repository: WorkspaceActionRepository,
    private readonly connectorRepository: WorkspaceConnectorRepository,
    private readonly executionManager: ActionExecutionManager,
    private readonly rabbitMQ: RabbitMQService,
    private readonly accessService: ConnectorAccessService,
  ) {}

  async createDraft(
    userId: string,
    dto: CreateActionDraftDto,
  ): Promise<WorkspaceActionWithConnector> {
    const connector = await this.connectorRepository.findById(dto.connectorId);
    if (connector === null) {
      throw new EntityNotFoundException('WorkspaceConnector', dto.connectorId);
    }
    // v3 round 6 — replace the ad-hoc owner check with the per-connector
    // RBAC service. Owner always passes; explicit grantees with
    // AI_ACTIONS or FULL also pass. Anyone else gets 403.
    const canPropose = await this.accessService.can(
      userId,
      connector.id,
      ConnectorAction.PROPOSE_AI_ACTION,
    );
    if (!canPropose) {
      throw new BusinessException('workspace.action.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    const needsWrite =
      connector.permissionLevel === WorkspacePermissionLevel.WRITE ||
      connector.permissionLevel === WorkspacePermissionLevel.ADMIN;
    if (!needsWrite) {
      throw new BusinessException(
        'workspace.action.insufficient_permission',
        'INSUFFICIENT_PERMISSION',
        HttpStatus.FORBIDDEN,
      );
    }

    const expiresAt = new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000);
    const action = await this.repository.create({
      userId,
      connector: { connect: { id: dto.connectorId } },
      actionType: dto.actionType,
      payload: dto.payload as Prisma.InputJsonValue,
      expiresAt,
    });

    void this.publishEvent(EventPattern.WORKSPACE_ACTION_DRAFTED, {
      actionId: action.id,
      userId,
      connectorId: dto.connectorId,
      provider: connector.provider,
      actionType: dto.actionType,
    });
    this.logger.log(`Action drafted: ${action.id} (${dto.actionType})`);

    const result = await this.repository.findById(action.id);
    if (result === null) {
      throw new EntityNotFoundException('WorkspaceAction', action.id);
    }
    return result;
  }

  async listActions(
    userId: string,
    query: ListActionsQueryDto,
  ): Promise<PaginatedWorkspaceActions> {
    return this.repository.findAllByUser(userId, query);
  }

  async getAction(id: string, userId: string): Promise<WorkspaceActionWithConnector> {
    const action = await this.repository.findById(id);
    if (action === null) {
      throw new EntityNotFoundException('WorkspaceAction', id);
    }
    if (action.userId !== userId) {
      throw new BusinessException('workspace.action.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    return action;
  }

  async approve(id: string, userId: string): Promise<WorkspaceActionWithConnector> {
    const action = await this.getAction(id, userId);
    this.assertApprovableAndNotExpired(action);
    await this.assertConnectorWritable(action);

    const approved = await this.repository.update(id, {
      status: WorkspaceActionStatus.EXECUTING,
      reviewedAt: new Date(),
      reviewedBy: userId,
    });

    void this.publishEvent(EventPattern.WORKSPACE_ACTION_APPROVED, {
      actionId: id,
      userId,
      reviewedBy: userId,
    });

    void this.runExecution(approved, userId);
    return approved;
  }

  async reject(
    id: string,
    userId: string,
    dto: RejectActionDto,
  ): Promise<WorkspaceActionWithConnector> {
    const action = await this.getAction(id, userId);
    this.assertApprovableAndNotExpired(action);

    const rejected = await this.repository.update(id, {
      status: WorkspaceActionStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedBy: userId,
      rejectionReason: dto.reason,
    });

    void this.publishEvent(EventPattern.WORKSPACE_ACTION_REJECTED, {
      actionId: id,
      userId,
      reviewedBy: userId,
      reason: dto.reason,
    });
    return rejected;
  }

  async editDraft(
    id: string,
    userId: string,
    dto: EditActionDto,
  ): Promise<WorkspaceActionWithConnector> {
    const action = await this.getAction(id, userId);
    this.assertEditable(action);

    const history = this.pushDraftRevision(action, userId, dto);
    const edited = await this.repository.update(id, {
      payload: dto.payload as Prisma.InputJsonValue,
      status: WorkspaceActionStatus.EDITED,
      draftHistory: history as Prisma.InputJsonValue,
    });

    const payload: WorkspaceActionEditedPayload = {
      actionId: id,
      userId,
      actorUserId: userId,
      connectorId: action.connectorId,
      provider: action.connector.provider as WorkspaceProvider,
      actionType: action.actionType,
      previousVersion: history.length - 1,
      newVersion: history.length,
      timestamp: new Date().toISOString(),
    };
    void this.publishEvent(EventPattern.WORKSPACE_ACTION_EDITED, { ...payload });

    return edited;
  }

  async bulkApprove(userId: string, dto: BulkApproveDto): Promise<BulkApproveOutcome> {
    const actions = await this.repository.findManyByIds(dto.actionIds, userId);
    const bulkGroupId = randomUUID();
    const approvedIds: string[] = [];
    const blockedIds: string[] = [];
    const blockedReasons: Record<string, string> = {};

    for (const action of actions) {
      const blockMessage = this.describeBlocker(action);
      if (blockMessage !== null) {
        blockedIds.push(action.id);
        blockedReasons[action.id] = blockMessage;
        continue;
      }
      await this.repository.update(action.id, {
        status: WorkspaceActionStatus.EXECUTING,
        reviewedAt: new Date(),
        reviewedBy: userId,
        bulkGroupId,
      });
      approvedIds.push(action.id);
      void this.publishEvent(EventPattern.WORKSPACE_ACTION_APPROVED, {
        actionId: action.id,
        userId,
        reviewedBy: userId,
      });
      const refreshed = await this.repository.findById(action.id);
      if (refreshed !== null) {
        void this.runExecution(refreshed, userId);
      }
    }

    const payload: WorkspaceActionBulkApprovedPayload = {
      bulkGroupId,
      actionIds: approvedIds,
      actorUserId: userId,
      total: approvedIds.length,
      timestamp: new Date().toISOString(),
    };
    void this.publishEvent(EventPattern.WORKSPACE_ACTION_BULK_APPROVED, { ...payload });

    return {
      bulkGroupId,
      approvedActionIds: approvedIds,
      blockedActionIds: blockedIds,
      blockedReasons,
    };
  }

  private assertApprovableAndNotExpired(action: WorkspaceActionWithConnector): void {
    if (!APPROVABLE_STATUSES.has(action.status as WorkspaceActionStatus)) {
      throw new BusinessException(
        'workspace.action.not_pending',
        'ACTION_NOT_PENDING',
        HttpStatus.CONFLICT,
      );
    }
    if (action.expiresAt !== null && action.expiresAt < new Date()) {
      throw new BusinessException('workspace.action.expired', 'ACTION_EXPIRED', HttpStatus.GONE);
    }
  }

  private assertEditable(action: WorkspaceActionWithConnector): void {
    if (!APPROVABLE_STATUSES.has(action.status as WorkspaceActionStatus)) {
      throw new BusinessException(
        'workspace.action.not_editable',
        'ACTION_NOT_EDITABLE',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async assertConnectorWritable(action: WorkspaceActionWithConnector): Promise<void> {
    const status = action.connector.status as WorkspaceConnectorStatus;
    if (!STALE_WRITE_BLOCKING_STATUSES.has(status)) {
      return;
    }
    const payload: WorkspaceActionStaleBlockedPayload = {
      actionId: action.id,
      userId: action.userId,
      connectorId: action.connectorId,
      provider: action.connector.provider as WorkspaceProvider,
      connectorStatus: status,
      reason: `Connector is ${status} — resolve before approving writes`,
      timestamp: new Date().toISOString(),
    };
    await this.publishEvent(EventPattern.WORKSPACE_ACTION_STALE_BLOCKED, { ...payload });
    throw new BusinessException(
      'workspace.action.source_stale',
      'SOURCE_STALE',
      HttpStatus.CONFLICT,
    );
  }

  private describeBlocker(action: WorkspaceActionWithConnector): string | null {
    if (!APPROVABLE_STATUSES.has(action.status as WorkspaceActionStatus)) {
      return `Action is ${action.status}, cannot approve`;
    }
    if (action.expiresAt !== null && action.expiresAt < new Date()) {
      return 'Action has expired';
    }
    const status = action.connector.status as WorkspaceConnectorStatus;
    if (STALE_WRITE_BLOCKING_STATUSES.has(status)) {
      return `Connector is ${status} — resolve before approving writes`;
    }
    return null;
  }

  private pushDraftRevision(
    action: WorkspaceActionWithConnector,
    userId: string,
    dto: EditActionDto,
  ): ActionDraftRevision[] {
    const previous = this.readDraftHistory(action);
    const nextVersion = previous.length + 1;
    const revision: ActionDraftRevision = {
      version: nextVersion,
      editedAt: new Date().toISOString(),
      editedBy: userId,
      payload: action.payload as Record<string, unknown>,
      reason: dto.editReason,
    };
    return [...previous, revision];
  }

  private readDraftHistory(action: WorkspaceActionWithConnector): ActionDraftRevision[] {
    const raw = action.draftHistory;
    if (Array.isArray(raw)) {
      return raw as ActionDraftRevision[];
    }
    return [];
  }

  private async runExecution(action: WorkspaceActionWithConnector, userId: string): Promise<void> {
    try {
      const result = await this.executionManager.execute(action);
      await this.storeExecutionResult(action, userId, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution error';
      this.logger.error(`Action execution failed for ${action.id}: ${message}`);
      try {
        await this.storeFailure(action, userId, message);
      } catch (storeError) {
        this.logger.error(
          `Failed to store error for action ${action.id}: ${storeError instanceof Error ? storeError.message : 'unknown'}`,
        );
      }
    }
  }

  private async storeExecutionResult(
    action: WorkspaceActionWithConnector,
    userId: string,
    result: { success: boolean; url?: string; errorMessage?: string },
  ): Promise<void> {
    if (result.success) {
      await this.repository.update(action.id, {
        status: WorkspaceActionStatus.EXECUTED,
        executedAt: new Date(),
        result: result as Prisma.InputJsonValue,
      });
      void this.publishEvent(EventPattern.WORKSPACE_ACTION_EXECUTED, {
        actionId: action.id,
        userId,
        provider: action.connector.provider,
        actionType: action.actionType,
        externalUrl: result.url,
      });
    } else {
      await this.storeFailure(action, userId, result.errorMessage ?? 'Unknown error');
    }
  }

  private async storeFailure(
    action: WorkspaceActionWithConnector,
    userId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.repository.update(action.id, {
      status: WorkspaceActionStatus.FAILED,
      errorMessage,
    });
    void this.publishEvent(EventPattern.WORKSPACE_ACTION_FAILED, {
      actionId: action.id,
      userId,
      provider: action.connector.provider,
      actionType: action.actionType,
      errorMessage,
    });
  }

  private async publishEvent(
    pattern: EventPattern,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.rabbitMQ.publish(pattern, { ...payload, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(
        `Failed to publish ${pattern}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
