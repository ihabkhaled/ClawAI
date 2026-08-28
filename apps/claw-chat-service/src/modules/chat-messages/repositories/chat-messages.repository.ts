import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ChatMessage, type MessageRole, type Prisma } from '../../../generated/prisma';
import { type CreateMessageData } from '../types/chat-messages.types';

@Injectable()
export class ChatMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMessageData): Promise<ChatMessage> {
    return this.prisma.chatMessage.create({ data });
  }

  async createUserMessageWithinDailyLimit(
    userId: string,
    data: CreateMessageData,
    limit: number | null,
  ): Promise<ChatMessage | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`message:${userId}`}, 0))`;
      if (limit !== null) {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        const count = await transaction.chatMessage.count({
          where: { role: 'USER', createdAt: { gte: start }, thread: { userId } },
        });
        if (count >= limit) return null;
      }
      return transaction.chatMessage.create({ data });
    });
  }

  async findById(id: string): Promise<ChatMessage | null> {
    return this.prisma.chatMessage.findUnique({ where: { id } });
  }

  async findByThreadId(threadId: string, page: number, limit: number): Promise<ChatMessage[]> {
    const skip = (page - 1) * limit;
    return this.prisma.chatMessage.findMany({
      where: { threadId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Every message in a thread matching a term, newest first.
   *
   * Returns ids and a snippet rather than whole messages: the caller is
   * building a jump-to list, and shipping the full bodies of a hundred matches
   * to render a dozen one-line previews is wasted on both sides.
   *
   * Case-insensitive `contains`, matching how thread-level search already
   * works. That is a sequential scan over the thread's rows — acceptable
   * because it is scoped to one thread, unlike the cross-thread search, which
   * is the one that will need an index first.
   */
  async searchByThreadId(
    threadId: string,
    term: string,
    take: number,
  ): Promise<Array<{ id: string; role: MessageRole; content: string; createdAt: Date }>> {
    return this.prisma.chatMessage.findMany({
      where: { threadId, content: { contains: term, mode: 'insensitive' } },
      select: { id: true, role: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * The whole thread in conversation order.
   *
   * Ascending, unpaginated, and capped by the caller — a published snapshot has
   * to be the complete transcript in the order it happened, and paging it would
   * risk publishing a conversation with a hole in the middle.
   */
  async findAllByThreadIdAscending(threadId: string, take: number): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  async countByThreadId(threadId: string): Promise<number> {
    return this.prisma.chatMessage.count({ where: { threadId } });
  }

  async findRecentByThreadId(threadId: string, limit: number): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { threadId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateFeedback(id: string, feedback: string | null): Promise<ChatMessage> {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { feedback },
    });
  }

  /**
   * Drops every message in the thread created after the given instant.
   *
   * Used when a prompt is edited and re-run: the answers below it were replies
   * to a question that no longer exists, and leaving them would attach an
   * answer to something nobody asked.
   *
   * Compares on `createdAt` rather than on an ordering column because there is
   * none. A same-millisecond sibling would survive, which in practice cannot
   * happen — an assistant reply is seconds behind the prompt it answers.
   */
  async deleteCreatedAfter(threadId: string, createdAt: Date): Promise<number> {
    const result = await this.prisma.chatMessage.deleteMany({
      where: { threadId, createdAt: { gt: createdAt } },
    });
    return result.count;
  }

  /**
   * Replaces a message's text, keeping the first version.
   *
   * `originalContent` is written only when it is still null, so a second edit
   * does not lose the text as first sent.
   */
  async replaceContent(id: string, content: string, originalContent: string | null): Promise<void> {
    await this.prisma.chatMessage.update({
      where: { id },
      data: {
        content,
        editedAt: new Date(),
        ...(originalContent === null ? {} : { originalContent }),
      },
    });
  }

  async deleteByThreadId(threadId: string): Promise<number> {
    const result = await this.prisma.chatMessage.deleteMany({ where: { threadId } });
    return result.count;
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.chatMessage.delete({ where: { id } });
  }

  async updateMetadata(id: string, metadata: Prisma.InputJsonValue): Promise<void> {
    await this.prisma.chatMessage.update({ where: { id }, data: { metadata } });
  }
}
