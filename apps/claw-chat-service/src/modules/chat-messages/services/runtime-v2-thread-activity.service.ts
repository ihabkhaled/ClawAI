import { Injectable } from '@nestjs/common';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { MessageRole } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import {
  RUNTIME_V2_ACTIVITY_READ_CURSOR,
  RUNTIME_V2_RUN_NOT_FOUND_CODE,
  RUNTIME_V2_THREAD_INACTIVE,
} from '../constants/runtime-v2-thread-activity.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import { runtimeV2MessageMetadataSchema } from '../types/runtime-v2-run.types';
import type { RuntimeV2ThreadActivity } from '../types/runtime-v2-thread-activity.types';

/**
 * Answers "is a Runtime V2 run still going on this thread?" (F095).
 *
 * The coding agent used to guess: an unanswered prompt under ten minutes old
 * counted as live. The run store knows. A run is bound to the user message
 * that started it (`metadata.runtimeV2`), so the newest user message names the
 * only run that can still be live, and the store's own terminal flag says
 * whether it is.
 */
@Injectable()
export class RuntimeV2ThreadActivityService {
  constructor(
    private readonly threads: ChatThreadsRepository,
    private readonly messages: ChatMessagesRepository,
    private readonly store: RuntimeV2Store,
  ) {}

  async getActiveRun(ownerId: string, threadId: string): Promise<RuntimeV2ThreadActivity> {
    const thread = await this.threads.findById(threadId);
    // Missing and someone else's answer identically, so this cannot be used to
    // learn which thread ids exist.
    if (thread?.userId !== ownerId) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }

    const prompt = await this.messages.findLatestByThreadIdAndRole(threadId, MessageRole.USER);
    if (prompt === null) return RUNTIME_V2_THREAD_INACTIVE;
    const metadata = runtimeV2MessageMetadataSchema.safeParse(prompt.metadata);
    // The newest turn was an ordinary chat turn, so no run can be live.
    if (!metadata.success) return RUNTIME_V2_THREAD_INACTIVE;

    const { runId, generation } = metadata.data.runtimeV2;
    try {
      const binding = await this.store.resolveBinding({
        ownerId,
        threadId,
        runId,
        generation,
        ttlSeconds: RUNTIME_V2_ACTIVE_TTL_SECONDS,
      });
      const page = await this.store.readEvents({
        ...binding,
        after: RUNTIME_V2_ACTIVITY_READ_CURSOR,
      });
      return page.terminal
        ? RUNTIME_V2_THREAD_INACTIVE
        : { active: true, runId, startedAt: prompt.createdAt.toISOString() };
    } catch (error) {
      if (error instanceof BusinessException && error.code === RUNTIME_V2_RUN_NOT_FOUND_CODE) {
        return RUNTIME_V2_THREAD_INACTIVE;
      }
      throw error;
    }
  }
}
