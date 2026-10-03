import { HttpStatus } from '@nestjs/common';

import { type ChatThread } from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ORCHESTRATION_THREAD_TITLE_CONTENT_CHARS } from '../constants/orchestration-thread.constants';
import { type OrchestrationThreadRequest } from '../types/orchestration-thread.types';

/** `Label: first fifty characters`, the title every orchestration thread gets. */
export function orchestrationThreadTitle(label: string, content: string | undefined): string {
  return `${label}: ${(content ?? '').slice(0, ORCHESTRATION_THREAD_TITLE_CONTENT_CHARS)}`;
}

/**
 * The ONE way an orchestration surface obtains its thread.
 *
 * Seven lab managers and three service methods each carried their own copy. The copies
 * drifted: the labs trusted a caller-supplied `threadId` without an ownership check, and
 * none could attach context packs, so a feature added to normal chat's thread (packs,
 * memory) never reached a lab. Everything chat does with a thread now happens here, once.
 */
export async function resolveOrchestrationThread(
  repository: ChatThreadsRepository,
  userId: string,
  request: OrchestrationThreadRequest,
): Promise<ChatThread> {
  if (request.threadId !== undefined && request.threadId.length > 0) {
    const existing = await repository.findById(request.threadId);
    if (existing === null || existing === undefined) {
      throw new EntityNotFoundException('ChatThread', request.threadId);
    }
    if (existing.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this thread',
        'FORBIDDEN_THREAD_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
    return existing;
  }
  return repository.create({
    userId,
    title: request.title,
    routingMode: request.routingMode,
    ...(request.contextPackIds !== undefined && request.contextPackIds.length > 0
      ? { contextPackIds: request.contextPackIds }
      : {}),
  });
}
