import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type ChatShare,
  type ChatShareMessage,
  ChatShareSafetyStatus,
  ChatShareStatus,
  ChatShareVisibility,
  type Prisma,
} from '../../../generated/prisma';
import { type PublishableSnapshotMessage } from '../types/chat-shares.types';
import type { PublicChatDiscoveryRow, SitemapCursor } from '../types/chat-share-discovery.types';

@Injectable()
export class ChatSharesRepository {
  private readonly logger = new Logger(ChatSharesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByThreadId(threadId: string): Promise<ChatShare | null> {
    this.logger.debug(`findByThreadId: ${threadId}`);
    return this.prisma.chatShare.findUnique({ where: { threadId } });
  }

  /**
   * Resolves a share for the PUBLIC endpoint.
   *
   * The status and visibility filters are in the WHERE clause, not applied to
   * the result afterwards. A revoked or private share is therefore
   * indistinguishable from one that never existed — the query simply returns
   * nothing, and a caller cannot learn that an identifier was once valid.
   */
  async findPublicByShareId(
    publicShareId: string,
  ): Promise<(ChatShare & { messages: ChatShareMessage[] }) | null> {
    this.logger.debug('findPublicByShareId');
    return this.prisma.chatShare.findFirst({
      where: {
        publicShareId,
        status: ChatShareStatus.ACTIVE,
        visibility: {
          in: [ChatShareVisibility.PUBLIC_UNLISTED, ChatShareVisibility.PUBLIC_INDEXED],
        },
      },
      include: { messages: { orderBy: { sequence: 'asc' } } },
    });
  }

  /**
   * Replaces a share's published messages and bumps its version, atomically.
   *
   * Delete-then-insert inside ONE transaction is what makes a refresh safe: a
   * reader either sees the whole previous snapshot or the whole new one, never
   * a half-replaced transcript mixing two versions of the conversation.
   */
  async replaceSnapshot(
    shareId: string,
    messages: PublishableSnapshotMessage[],
    shareData: Prisma.ChatShareUpdateInput,
  ): Promise<ChatShare> {
    this.logger.debug(`replaceSnapshot: share=${shareId} messages=${String(messages.length)}`);
    return this.prisma.$transaction(async (tx) => {
      await tx.chatShareMessage.deleteMany({ where: { chatShareId: shareId } });
      if (messages.length > 0) {
        await tx.chatShareMessage.createMany({
          data: messages.map((message) => ({
            chatShareId: shareId,
            publicMessageId: message.publicMessageId,
            sequence: message.sequence,
            role: message.role,
            content: message.content,
            providerLabel: message.providerLabel,
            modelLabel: message.modelLabel,
            originalCreatedAt: message.originalCreatedAt,
          })),
        });
      }
      return tx.chatShare.update({ where: { id: shareId }, data: shareData });
    });
  }

  async create(data: Prisma.ChatShareCreateInput): Promise<ChatShare> {
    this.logger.debug(`create: thread=${String(data.threadId)}`);
    return this.prisma.chatShare.create({ data });
  }

  async update(id: string, data: Prisma.ChatShareUpdateInput): Promise<ChatShare> {
    this.logger.debug(`update: ${id}`);
    return this.prisma.chatShare.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    this.logger.debug(`deleteById: ${id}`);
    await this.prisma.chatShare.delete({ where: { id } });
  }

  /**
   * The sitemap feed.
   *
   * Selects only the two fields a sitemap entry needs. Keyset-paginated on
   * updatedAt rather than OFFSET so the query stays flat as the table grows and
   * never loads every public share into memory.
   */
  async listIndexable(
    contentLocale: string,
    limit: number,
    cursor: SitemapCursor | null,
  ): Promise<PublicChatDiscoveryRow[]> {
    this.logger.debug(`listIndexable: limit=${String(limit)}`);
    return this.prisma.chatShare.findMany({
      where: {
        status: ChatShareStatus.ACTIVE,
        visibility: ChatShareVisibility.PUBLIC_INDEXED,
        safetyStatus: ChatShareSafetyStatus.APPROVED,
        indexEligible: true,
        contentLocale,
        ...(cursor === null
          ? {}
          : {
              OR: [
                { updatedAt: { lt: cursor.updatedAt } },
                { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
              ],
            }),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        publicShareId: true,
        contentLocale: true,
        title: true,
        description: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  async countIndexable(contentLocale: string): Promise<number> {
    return this.prisma.chatShare.count({
      where: {
        status: ChatShareStatus.ACTIVE,
        visibility: ChatShareVisibility.PUBLIC_INDEXED,
        safetyStatus: ChatShareSafetyStatus.APPROVED,
        indexEligible: true,
        contentLocale,
      },
    });
  }

  /**
   * Revokes every share attached to a thread.
   *
   * Called when a thread is deleted. Revoking rather than deleting keeps the
   * identifier permanently spent, so it can never be reissued and resolve to
   * different content later.
   */
  async revokeForThread(threadId: string): Promise<number> {
    this.logger.debug(`revokeForThread: ${threadId}`);
    const result = await this.prisma.chatShare.updateMany({
      where: { threadId, status: ChatShareStatus.ACTIVE },
      data: {
        status: ChatShareStatus.REVOKED,
        visibility: ChatShareVisibility.PRIVATE,
        adsEligible: false,
        indexEligible: false,
        revokedAt: new Date(),
      },
    });
    return result.count;
  }
}
