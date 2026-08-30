import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CROSS_THREAD_CANDIDATE_LIMIT,
  CROSS_THREAD_CANDIDATE_SCAN_LIMIT,
  CROSS_THREAD_MESSAGES_PER_THREAD,
} from '../constants/cross-thread-retrieval.constants';
import {
  type CrossThreadCandidate,
  type CrossThreadMessageRow,
} from '../types/cross-thread-retrieval.types';

/**
 * Reads a user's OTHER conversations.
 *
 * Every method here takes `userId` and filters on it, and that is not
 * defensive style — it is the entire security boundary of this feature. A
 * cross-thread query that forgets its owner filter does not return slightly
 * wrong results; it returns another customer's conversation. There is no
 * method on this class that can be called without a userId, and none that
 * accepts a thread id without also proving ownership in the same WHERE clause.
 */
@Injectable()
export class CrossThreadRetrievalRepository {
  private readonly logger = new Logger(CrossThreadRetrievalRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stage 1 — which of the user's other threads are worth reading.
   *
   * Searches message CONTENT, not just thread titles. Title-only ranking was
   * the first implementation and it measured badly the moment it met a real
   * thread: a title is auto-derived from the opening turn, is often absent, and
   * can be renamed to anything, so a conversation that spent forty turns on
   * MERIDIAN-88 could carry a title that never mentions it. The evidence that a
   * thread is about something is in the thread.
   *
   * Archived threads are excluded — archiving is the user saying "I am done
   * with this", and quietly resurrecting it as context contradicts that.
   * Deleted threads cannot appear: messages cascade on delete, so a removed
   * conversation leaves nothing for retrieval to find.
   */
  async findCandidateThreads(
    userId: string,
    excludeThreadId: string,
    terms: readonly string[],
  ): Promise<CrossThreadCandidate[]> {
    if (terms.length === 0) return [];
    const hits = await this.prisma.chatMessage.findMany({
      where: {
        thread: { userId, isArchived: false, id: { not: excludeThreadId } },
        role: { in: ['USER', 'ASSISTANT'] },
        OR: terms.map((term) => ({
          content: { contains: term, mode: 'insensitive' as const },
        })),
      },
      orderBy: { createdAt: 'desc' },
      take: CROSS_THREAD_CANDIDATE_SCAN_LIMIT,
      select: {
        threadId: true,
        createdAt: true,
        thread: { select: { title: true, updatedAt: true } },
      },
    });

    const byThread = new Map<string, CrossThreadCandidate>();
    for (const hit of hits) {
      const existing = byThread.get(hit.threadId);
      if (existing === undefined) {
        byThread.set(hit.threadId, {
          threadId: hit.threadId,
          title: hit.thread.title,
          updatedAt: hit.thread.updatedAt,
          matchingMessageCount: 1,
        });
        continue;
      }
      existing.matchingMessageCount += 1;
    }

    const candidates = [...byThread.values()]
      .sort((a, b) => b.matchingMessageCount - a.matchingMessageCount)
      .slice(0, CROSS_THREAD_CANDIDATE_LIMIT);
    this.logger.debug(
      `findCandidateThreads: ${String(candidates.length)} candidates from ${String(hits.length)} hits for user=${userId}`,
    );
    return candidates;
  }

  /**
   * Stage 2 — recent messages from threads already proven to belong to the user.
   *
   * The ownership filter is repeated here rather than trusted from stage 1. The
   * thread ids arrive as an array from a caller, and a caller is exactly the
   * place a bug can substitute an id; re-proving ownership in the same query
   * costs one join condition and removes the whole class of mistake.
   */
  async findMessagesForThreads(
    userId: string,
    threadIds: readonly string[],
  ): Promise<CrossThreadMessageRow[]> {
    if (threadIds.length === 0) return [];
    const rows = await this.prisma.chatMessage.findMany({
      where: {
        threadId: { in: [...threadIds] },
        thread: { userId },
        role: { in: ['USER', 'ASSISTANT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: CROSS_THREAD_MESSAGES_PER_THREAD * threadIds.length,
      select: {
        id: true,
        threadId: true,
        role: true,
        content: true,
        createdAt: true,
        thread: { select: { title: true } },
      },
    });
    return rows.map((row) => ({
      messageId: row.id,
      threadId: row.threadId,
      threadTitle: row.thread.title,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
    }));
  }
}
