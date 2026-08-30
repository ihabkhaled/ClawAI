import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { type ContextReceipt, EventPattern, type RetrievalBundle } from '@claw/shared-types';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { inputJsonToBundle } from '../../../common/utilities/context-receipt-json.utility';
import { ContextReceiptRepository } from '../repositories/context-receipt.repository';

@Injectable()
export class ContextReceiptService {
  private readonly logger = new Logger(ContextReceiptService.name);

  constructor(
    private readonly repo: ContextReceiptRepository,
    private readonly rabbit: RabbitMQService,
  ) {}

  async write(
    messageId: string,
    threadId: string,
    userId: string,
    bundle: RetrievalBundle,
  ): Promise<void> {
    // A receipt carrying a conversation summary is never empty, even with no
    // memories and no pack items: the conversation summary IS the answer to
    // "what was the model given". Skipping on the old three-way emptiness test
    // meant every ordinary chat turn — the overwhelming majority, which use no
    // memories and no packs — wrote no receipt at all, so the one surface that
    // could have shown a hundred-message thread being sent as one message
    // never existed for the threads that needed it. ADR-086.
    if (
      bundle.conversation === undefined &&
      bundle.memories.length === 0 &&
      bundle.packItems.length === 0 &&
      bundle.warnings.length === 0
    ) {
      this.logger.debug(`write: skipping empty receipt for messageId=${messageId}`);
      return;
    }
    this.logger.debug(
      `write: messageId=${messageId} memories=${String(bundle.memories.length)} ` +
        `packItems=${String(bundle.packItems.length)} ` +
        `messages=${String(bundle.conversation?.includedMessageIds.length ?? 0)}/` +
        `${String(bundle.conversation?.totalThreadMessages ?? 0)}`,
    );
    try {
      await this.repo.upsert({ messageId, threadId, userId, bundle });
      void this.rabbit.publish(EventPattern.CONTEXT_RECEIPT_WRITTEN, {
        messageId,
        threadId,
        userId,
        memoryCount: bundle.memories.length,
        packItemCount: bundle.packItems.length,
        tokenBudgetUsed: bundle.tokenBudgetUsed,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`write: failed to persist receipt — ${msg}`);
    }
  }

  async getByMessageId(messageId: string, userId: string): Promise<ContextReceipt> {
    const row = await this.repo.findByMessageId(messageId);
    if (!row) {
      throw new EntityNotFoundException('ChatMessageContextReceipt', messageId);
    }
    if (row.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this receipt',
        'FORBIDDEN_RECEIPT_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
    const bundle = inputJsonToBundle(row.payloadJson);
    return {
      ...bundle,
      messageId: row.messageId,
      threadId: row.threadId,
      userId: row.userId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
