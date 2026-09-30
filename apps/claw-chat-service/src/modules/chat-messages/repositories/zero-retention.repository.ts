import { Inject, Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ZERO_RETENTION_REDACTED_CONTENT } from '../constants/zero-retention.constants';
import type {
  ZeroRetentionPrismaPort,
  ZeroRetentionTurnFilter,
} from '../types/zero-retention.types';
import { redactZeroRetentionMetadata } from '../utilities/zero-retention.utility';

/**
 * Strips the content out of one finished turn's messages.
 *
 * The rows themselves stay: provider, model, token counts and latency are
 * usage, not content, and the thread keeps its shape. Billing never reads
 * these rows (the chokepoint records usage to billing directly), so a purge
 * cannot move a single token of anyone's balance.
 */
@Injectable()
export class ZeroRetentionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: ZeroRetentionPrismaPort) {}

  /** Redacts every message of the turn and answers how many rows it touched. */
  async redactTurn(filter: ZeroRetentionTurnFilter): Promise<number> {
    const rows = await this.prisma.chatMessage.findMany({
      where: this.where(filter),
      select: { id: true, metadata: true },
    });
    for (const row of rows) {
      await this.prisma.chatMessage.update({
        where: { id: row.id },
        data: {
          content: ZERO_RETENTION_REDACTED_CONTENT,
          originalContent: null,
          metadata: redactZeroRetentionMetadata(row.metadata),
        },
      });
    }
    return rows.length;
  }

  private where(filter: ZeroRetentionTurnFilter): Prisma.ChatMessageWhereInput {
    // A run: the prompt, every tool record and the answer all carry its id.
    // A chat turn: the prompt, plus the answer or error row naming it as source.
    return 'runId' in filter
      ? {
          threadId: filter.threadId,
          metadata: { path: ['runtimeV2', 'runId'], equals: filter.runId },
        }
      : {
          threadId: filter.threadId,
          OR: [
            { id: filter.userMessageId },
            { metadata: { path: ['sourceMessageId'], equals: filter.userMessageId } },
          ],
        };
  }
}
