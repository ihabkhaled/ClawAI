import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { AiActionKind, AiActionPrivacyClass } from '../../../common/enums/ai-action-kind.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma';
import { AiActionApprovalManager } from '../../ai-actions/managers/ai-action-approval.manager';
import { PLAN_MAX_SUBTASKS_DEFAULT } from '../constants/ticket-planning.constants';
import type { DecomposeDraft, FanoutResult } from '../types/decompose-fanout.types';

/**
 * Stream 41 v1.x — given an APPROVED DECOMPOSE queue entry, fan out N
 * `CREATE_TICKET` queue entries (one per subtask) with parent linkage in
 * `metadata.parentDecomposeQueueId`. Each child is its own approval entry
 * (so user can re-edit per-subtask before it actually creates the ticket).
 */
@Injectable()
export class DecomposeFanoutManager {
  private readonly logger = new Logger(DecomposeFanoutManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly approval: AiActionApprovalManager,
  ) {}

  async fanout(input: { queueId: string; userId: string }): Promise<FanoutResult> {
    const queueEntry = await this.prisma.aiActionApprovalQueue.findUnique({
      where: { id: input.queueId },
    });
    if (queueEntry === null || queueEntry.userId !== input.userId) {
      throw new BusinessException(
        'workspace.decompose.queueNotFound',
        'AI_ACTION_QUEUE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    if (queueEntry.actionKind !== AiActionKind.DECOMPOSE) {
      throw new BusinessException(
        'workspace.decompose.wrongKind',
        'AI_ACTION_NOT_DECOMPOSE',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (queueEntry.status !== 'APPROVED' && queueEntry.status !== 'AUTO_APPROVED') {
      throw new BusinessException(
        'workspace.decompose.notApproved',
        'AI_ACTION_NOT_APPROVED',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const draftPayload = (queueEntry.editedPayload ?? queueEntry.draftPayload) as Prisma.JsonValue;
    const parsed = this.parseDraft(draftPayload);
    if (parsed === null || parsed.subtasks === undefined) {
      throw new BusinessException(
        'workspace.decompose.malformed',
        'DECOMPOSE_PAYLOAD_MALFORMED',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const subtasks = parsed.subtasks;
    const cap = PLAN_MAX_SUBTASKS_DEFAULT;
    const allowed = subtasks.slice(0, cap);
    const skipped = subtasks.length - allowed.length;
    const createdQueueIds: string[] = [];
    for (const [index, subtask] of allowed.entries()) {
      try {
        const result = await this.approval.enqueueSuggestion({
          userId: input.userId,
          connectorId: queueEntry.connectorId,
          actionKind: 'CREATE_TICKET',
          provider:
            queueEntry.provider !== null
              ? (queueEntry.provider as unknown as WorkspaceProvider)
              : null,
          draftPayload: {
            title: subtask.title,
            description: subtask.descriptionDraft,
            estimateTshirt: subtask.estimateTshirt,
            estimateConfidence: subtask.estimateConfidence,
            dependencies: subtask.dependencies,
            parentDecomposeQueueId: input.queueId,
            subtaskIndex: index,
            privacyClass: AiActionPrivacyClass.INTERNAL,
          },
          generatedBy: { mode: 'AUTO', source: 'decompose_fanout' },
          sourceObjectId: queueEntry.sourceObjectId,
        });
        createdQueueIds.push(result.queueId);
      } catch (error) {
        this.logger.warn(
          `fanout: failed for subtask ${String(index)} — ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    this.logger.log(
      `fanout: parentQueueId=${input.queueId} created=${String(createdQueueIds.length)} skipped=${String(skipped)}`,
    );
    return { parentQueueId: input.queueId, createdQueueIds, skippedCount: skipped };
  }

  private parseDraft(payload: unknown): DecomposeDraft | null {
    if (typeof payload !== 'object' || payload === null) return null;
    const draft = payload as DecomposeDraft;
    if (!Array.isArray(draft.subtasks) || draft.subtasks.length === 0) return null;
    return draft;
  }
}
