import { Injectable, Logger } from '@nestjs/common';
import { ChatMessagesRepository } from '../../chat-messages/repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { EntityNotFoundException } from '../../../common/errors';
import { SortOrder } from '../../../common/enums';
import { ThreadOrigin } from '../../../generated/prisma';
import { type PaginatedResult } from '../../../common/types';
import { type CodingAgentMessage, type CodingAgentThread } from '../types/coding-agent-chats.types';
import { type ListCodingAgentChatsQueryDto } from '../dto/list-coding-agent-chats-query.dto';

/**
 * What the coding agent did, for a person to read afterwards.
 *
 * Read-only by construction, not by convention: this service exposes no way to
 * create a thread, post a message or edit one, so a future controller cannot
 * accidentally offer one. A run belongs to the agent that produced it, and a
 * reply typed into a transcript from the web would have no run to reach.
 *
 * Every read is pinned to `ThreadOrigin.CODING_AGENT` as well as to the user.
 * The origin filter is what keeps these out of the web chat list; pinning it
 * again here is what stops this endpoint becoming a second way to read the
 * user's ordinary conversations.
 */
@Injectable()
export class CodingAgentChatsService {
  private readonly logger = new Logger(CodingAgentChatsService.name);

  constructor(
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatMessagesRepository: ChatMessagesRepository,
  ) {}

  async getThreads(
    userId: string,
    query: ListCodingAgentChatsQueryDto,
  ): Promise<PaginatedResult<CodingAgentThread>> {
    const filters = {
      userId,
      origin: ThreadOrigin.CODING_AGENT,
      search: query.search,
    };

    const [threads, total] = await Promise.all([
      this.chatThreadsRepository.findAll(
        filters,
        query.page,
        query.limit,
        query.sortBy,
        query.sortOrder as SortOrder,
      ),
      this.chatThreadsRepository.countAll(filters),
    ]);

    return {
      data: threads,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * One run's messages, oldest first.
   *
   * Ascending because this is a record of what happened rather than a live
   * conversation: a transcript read from the end backwards is the wrong shape
   * for understanding a run.
   */
  async getMessages(
    userId: string,
    threadId: string,
    limit: number,
  ): Promise<readonly CodingAgentMessage[]> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    // One condition covers all three refusals — no such thread, someone else's
    // thread, and a web conversation reached through the agent endpoint — and
    // they answer identically, so this cannot be used to learn which threads
    // exist. `thread?.userId` is undefined for a missing thread, which never
    // equals a real user id.
    if (thread?.userId !== userId || thread.origin !== ThreadOrigin.CODING_AGENT) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }

    this.logger.log(`getMessages: reading coding agent thread ${threadId} for user ${userId}`);
    return this.chatMessagesRepository.findAllByThreadIdAscending(threadId, limit);
  }
}
