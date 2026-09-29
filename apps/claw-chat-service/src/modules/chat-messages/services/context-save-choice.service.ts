import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { ContextSaveStatus } from '../../../common/enums';
import { type Prisma } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ContextSaveClient } from '../clients/context-save.client';
import { CONTEXT_SAVE_FAILURE_ERRORS } from '../constants/save-intent.constants';
import { type ContextSaveChoiceDto } from '../dto/context-save-choice.dto';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import type { ContextSaveRecord } from '../types/context-save.types';
import { contextPackDeepLink } from '../utilities/context-save-links.utility';

/**
 * The user's answer on the "which pack?" card (ADR-133): add the waiting text
 * to the pack they picked, or to a new pack. Owner-checked through the thread;
 * the pack itself is owner-checked again by memory-service. The card's state
 * lives on the answer's `metadata.contextSave`, claimed atomically so a double
 * click saves once.
 */
@Injectable()
export class ContextSaveChoiceService {
  private readonly logger = new Logger(ContextSaveChoiceService.name);

  constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly threads: ChatThreadsRepository,
    private readonly client: ContextSaveClient,
  ) {}

  async choose(
    userId: string,
    messageId: string,
    dto: ContextSaveChoiceDto,
  ): Promise<ContextSaveRecord> {
    const { metadata, record } = await this.loadPending(userId, messageId, dto);
    const pending = record.pending;
    if (pending === undefined) throw this.notPending();
    const claimed = await this.messages.transitionContextSave(
      messageId,
      ContextSaveStatus.NEEDS_PACK_CHOICE,
      {
        ...metadata,
        contextSave: { ...record, status: ContextSaveStatus.SAVING },
      } as Prisma.InputJsonValue,
    );
    if (!claimed) throw this.notPending();
    const result =
      dto.packId === undefined
        ? await this.client.createPack({
            userId,
            sourceMessageId: pending.sourceMessageId,
            name: pending.suggestedName,
            content: pending.content,
          })
        : await this.client.addToPack({
            userId,
            packId: dto.packId,
            sourceMessageId: pending.sourceMessageId,
            content: pending.content,
          });
    const next: ContextSaveRecord = result.ok
      ? this.saved(
          record,
          result.value.id,
          result.value.name || this.optionName(record, dto.packId),
          dto.packId === undefined,
        )
      : { ...record, status: ContextSaveStatus.NEEDS_PACK_CHOICE, packFailure: result.reason };
    await this.messages.updateMetadata(messageId, {
      ...metadata,
      contextSave: next,
    } as Prisma.InputJsonValue);
    this.logger.log(
      `choose: message=${messageId} pack=${dto.packId ?? 'new'} ok=${String(result.ok)}`,
    );
    if (!result.ok) {
      const error = CONTEXT_SAVE_FAILURE_ERRORS[result.reason];
      throw new BusinessException('The context pack could not be saved', error.code, error.status);
    }
    return next;
  }

  private async loadPending(
    userId: string,
    messageId: string,
    dto: ContextSaveChoiceDto,
  ): Promise<{ metadata: Record<string, unknown>; record: ContextSaveRecord }> {
    const message = await this.messages.findById(messageId);
    const thread = message === null ? null : await this.threads.findById(message.threadId);
    // One answer for "no such message" and "someone else's": never confirm
    // another user's message exists.
    if (message === null || thread === null || thread.userId !== userId) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }
    const metadata = (message.metadata ?? {}) as Record<string, unknown>;
    const record = metadata['contextSave'] as ContextSaveRecord | undefined;
    if (record?.status !== ContextSaveStatus.NEEDS_PACK_CHOICE || record.pending === undefined) {
      throw this.notPending();
    }
    if (
      dto.packId !== undefined &&
      !record.pending.options.some((option) => option.id === dto.packId)
    ) {
      throw new BusinessException(
        'That pack was not offered for this save',
        'CONTEXT_SAVE_UNKNOWN_PACK',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { metadata, record };
  }

  private saved(
    record: ContextSaveRecord,
    packId: string,
    name: string,
    created: boolean,
  ): ContextSaveRecord {
    const { pending: _pending, packFailure: _failure, ...rest } = record;
    return {
      ...rest,
      status: ContextSaveStatus.SAVED,
      pack: { id: packId, name, created, link: contextPackDeepLink(packId) },
    };
  }

  private optionName(record: ContextSaveRecord, packId: string | undefined): string {
    return (
      record.pending?.options.find((option) => option.id === packId)?.name ??
      record.pending?.suggestedName ??
      ''
    );
  }

  private notPending(): BusinessException {
    return new BusinessException(
      'This save is not waiting for a pack',
      'CONTEXT_SAVE_NOT_PENDING',
      HttpStatus.CONFLICT,
    );
  }
}
