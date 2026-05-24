import { Injectable } from '@nestjs/common';
import type { ChatMessageContextReceipt } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { bundleToInputJson } from '../../../common/utilities/context-receipt-json.utility';
import type { WriteContextReceiptInput } from '../types/context-receipt.types';

@Injectable()
export class ContextReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: WriteContextReceiptInput): Promise<ChatMessageContextReceipt> {
    const payloadJson = bundleToInputJson(input.bundle);
    return this.prisma.chatMessageContextReceipt.upsert({
      where: { messageId: input.messageId },
      update: { payloadJson, threadId: input.threadId, userId: input.userId },
      create: {
        messageId: input.messageId,
        threadId: input.threadId,
        userId: input.userId,
        payloadJson,
      },
    });
  }

  async findByMessageId(messageId: string): Promise<ChatMessageContextReceipt | null> {
    return this.prisma.chatMessageContextReceipt.findUnique({ where: { messageId } });
  }

  async findByThreadId(threadId: string, limit = 50): Promise<ChatMessageContextReceipt[]> {
    return this.prisma.chatMessageContextReceipt.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
