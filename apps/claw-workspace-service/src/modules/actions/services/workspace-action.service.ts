import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { WorkspaceActionRepository } from '../repositories/workspace-action.repository';
import { ActionExecutionManager } from '../managers/action-execution.manager';
import { WorkspaceConnectorRepository } from '../../workspace/repositories/workspace-connector.repository';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { WorkspaceActionStatus } from '../../../common/enums/workspace-action-status.enum';
import { WorkspacePermissionLevel } from '../../../common/enums/workspace-permission-level.enum';
import type { Prisma } from '../../../generated/prisma';
import type { CreateActionDraftDto } from '../dto/create-action-draft.dto';
import type { ListActionsQueryDto } from '../dto/list-actions.dto';
import type { RejectActionDto } from '../dto/reject-action.dto';
import type {
  PaginatedWorkspaceActions,
  WorkspaceActionWithConnector,
} from '../types/action.types';

@Injectable()
export class WorkspaceActionService {
  private readonly logger = new Logger(WorkspaceActionService.name);

  constructor(
    private readonly repository: WorkspaceActionRepository,
    private readonly connectorRepository: WorkspaceConnectorRepository,
    private readonly executionManager: ActionExecutionManager,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async createDraft(
    userId: string,
    dto: CreateActionDraftDto,
  ): Promise<WorkspaceActionWithConnector> {
    const connector = await this.connectorRepository.findById(dto.connectorId);
    if (connector === null) {
      throw new EntityNotFoundException('WorkspaceConnector', dto.connectorId);
    }
    if (connector.userId !== userId) {
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
    this.assertPendingAndNotExpired(action);

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
    this.assertPendingAndNotExpired(action);

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

  private assertPendingAndNotExpired(action: WorkspaceActionWithConnector): void {
    if (action.status !== WorkspaceActionStatus.PENDING_APPROVAL) {
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
