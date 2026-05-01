import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import type { AiActionApprovalQueue, AiActionQueueStatus } from '../../../generated/prisma';

const APPROVED_STATUSES: ReadonlySet<AiActionQueueStatus> = new Set([
  'APPROVED',
  'AUTO_APPROVED',
] as AiActionQueueStatus[]);

/**
 * Stream 41 — pre-handoff queue-entry validation. Throws BusinessException
 * with stable code so the controller stays throw-free.
 */
export function assertImplPromptReadyForHandoff(
  queueEntry: AiActionApprovalQueue | null,
  expectedUserId: string,
): asserts queueEntry is AiActionApprovalQueue {
  if (queueEntry === null) {
    throw new BusinessException(
      'workspace.implPrompt.queueNotFound',
      'AI_ACTION_QUEUE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
  if (queueEntry.userId !== expectedUserId) {
    throw new BusinessException(
      'workspace.implPrompt.notOwner',
      'AI_ACTION_QUEUE_NOT_OWNER',
      HttpStatus.FORBIDDEN,
    );
  }
  if (queueEntry.actionKind !== 'IMPL_PROMPT') {
    throw new BusinessException(
      'workspace.implPrompt.wrongActionKind',
      'AI_ACTION_NOT_IMPL_PROMPT',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  if (!APPROVED_STATUSES.has(queueEntry.status)) {
    throw new BusinessException(
      'workspace.implPrompt.notApproved',
      'AI_ACTION_NOT_APPROVED',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export function extractBriefOrThrow(queueEntry: AiActionApprovalQueue): string {
  const payload = (queueEntry.editedPayload ?? queueEntry.draftPayload) as { brief?: string };
  const brief = typeof payload.brief === 'string' ? payload.brief : '';
  if (brief.length === 0) {
    throw new BusinessException(
      'workspace.implPrompt.emptyBrief',
      'IMPL_PROMPT_EMPTY_BRIEF',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  return brief;
}

export function assertHandoffOwner(handoffUserId: string, expectedUserId: string): void {
  if (handoffUserId !== expectedUserId) {
    throw new BusinessException(
      'workspace.implPrompt.notOwner',
      'AI_ACTION_QUEUE_NOT_OWNER',
      HttpStatus.FORBIDDEN,
    );
  }
}
