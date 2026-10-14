import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ChatGrantRow } from '../types/consent-request.types';
import { mapGrantRow } from '../utilities/map-consent-rows.utility';

/** "Allow for this chat" grants. Owner-scoped like everything else. */
@Injectable()
export class ChatConsentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(input: {
    userId: string;
    conversationId: string;
    targetKey: string;
    toolName: string;
    now: Date;
  }): Promise<boolean> {
    const row = await this.prisma.pluginChatConsent.findFirst({
      where: {
        userId: input.userId,
        conversationId: input.conversationId,
        targetKey: input.targetKey,
        toolName: input.toolName,
        expiresAt: { gt: input.now },
      },
      select: { id: true },
    });
    return row !== null;
  }

  /** A stored grant for a DESTRUCTIVE tool counts only when the user passed the second confirmation. */
  async hasConfirmedDestructive(installId: string, toolName: string): Promise<boolean> {
    const row = await this.prisma.pluginToolConsent.findFirst({
      where: { installId, toolName, confirmedDestructive: true, level: 'DESTRUCTIVE' },
      select: { id: true },
    });
    return row !== null;
  }

  async listActive(userId: string, now: Date, limit: number): Promise<ChatGrantRow[]> {
    const rows = await this.prisma.pluginChatConsent.findMany({
      where: { userId, expiresAt: { gt: now } },
      orderBy: { grantedAt: 'desc' },
      take: limit,
    });
    return rows.map(mapGrantRow);
  }

  async revoke(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.pluginChatConsent.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }
}
