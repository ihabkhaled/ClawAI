import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { ContextSaveStatus } from '../../../common/enums';
import { type ChatMessage, type Prisma } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ContextSaveClient } from '../clients/context-save.client';
import { CONTEXT_SAVE_FAILURE_ERRORS } from '../constants/save-intent.constants';
import { type ContextSaveChoiceDto } from '../dto/context-save-choice.dto';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import type { ContextSaveCallResult } from '../types/context-save-client.types';
import type { SaveFailureReason } from '../types/save-to-context.types';
import type { ContextSaveRecord } from '../types/context-save.types';
import { contextPackDeepLink } from '../utilities/context-save-links.utility';
import { contextSaveOf, isSavingAbandoned } from '../utilities/context-save-record.utility';

/**
 * The user's answer on the "which pack?" card (ADR-134): add the waiting text
 * to the pack they picked, or to a new pack. Owner-checked through the thread;
 * the pack itself is owner-checked again by memory-service. The card's state
 * lives on the answer's `metadata.contextSave`, claimed atomically so a double
 * click saves once. The record never stays SAVING: a throw after the claim puts
 * it back to NEEDS_PACK_CHOICE, and a claim older than CONTEXT_SAVE_SAVING_STALE_MS
 * (the process died) is taken over by the next choice.
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
    const waiting = await this.claim(messageId, metadata, record);
    let outcome: { next: ContextSaveRecord; failure?: SaveFailureReason };
    try {
      outcome = await this.store(userId, messageId, metadata, record, waiting, dto);
    } catch (error: unknown) {
      await this.release(messageId, metadata, waiting);
      throw error;
    }
    this.logger.log(
      `choose: message=${messageId} pack=${dto.packId ?? 'new'} ok=${String(outcome.failure === undefined)}`,
    );
    if (outcome.failure !== undefined) {
      const error = CONTEXT_SAVE_FAILURE_ERRORS[outcome.failure];
      throw new BusinessException('The context pack could not be saved', error.code, error.status);
    }
    return outcome.next;
  }

  /** Claims the record (SAVING, stamped) and returns it as it stands if the save goes back to waiting. */
  private async claim(
    messageId: string,
    metadata: Record<string, unknown>,
    record: ContextSaveRecord,
  ): Promise<ContextSaveRecord> {
    const abandoned = isSavingAbandoned(record);
    const claimed = await this.messages.transitionContextSave(
      messageId,
      abandoned ? ContextSaveStatus.SAVING : ContextSaveStatus.NEEDS_PACK_CHOICE,
      {
        ...metadata,
        contextSave: {
          ...record,
          status: ContextSaveStatus.SAVING,
          savingSince: new Date().toISOString(),
        },
      } as Prisma.InputJsonValue,
      abandoned ? record.savingSince : undefined,
    );
    if (!claimed) throw this.notPending();
    const { savingSince: _since, ...unclaimed } = record;
    return { ...unclaimed, status: ContextSaveStatus.NEEDS_PACK_CHOICE };
  }

  /** Saves the waiting text, stores the resulting record, and reports the failure if there was one. */
  private async store(
    userId: string,
    messageId: string,
    metadata: Record<string, unknown>,
    record: ContextSaveRecord,
    waiting: ContextSaveRecord,
    dto: ContextSaveChoiceDto,
  ): Promise<{ next: ContextSaveRecord; failure?: SaveFailureReason }> {
    const pending = record.pending;
    if (pending === undefined) throw this.notPending();
    const result: ContextSaveCallResult<{ id: string; name: string }> =
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
          waiting,
          result.value.id,
          result.value.name || this.optionName(record, dto.packId),
          dto.packId === undefined,
        )
      : { ...waiting, packFailure: result.reason };
    await this.messages.updateMetadata(messageId, {
      ...metadata,
      contextSave: next,
    } as Prisma.InputJsonValue);
    return result.ok ? { next } : { next, failure: result.reason };
  }

  /** Puts a claimed record back after an unexpected throw; best effort, never hides the error. */
  private async release(
    messageId: string,
    metadata: Record<string, unknown>,
    waiting: ContextSaveRecord,
  ): Promise<void> {
    try {
      await this.messages.updateMetadata(messageId, {
        ...metadata,
        contextSave: waiting,
      } as Prisma.InputJsonValue);
      this.logger.warn(`choose: message=${messageId} threw after the claim — released`);
    } catch (error: unknown) {
      this.logger.error(
        `choose: message=${messageId} could not be released; it recovers after the stale-claim window: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
    const record = this.waitingRecord(message);
    if (
      dto.packId !== undefined &&
      !record.pending?.options.some((option) => option.id === dto.packId)
    ) {
      throw new BusinessException(
        'That pack was not offered for this save',
        'CONTEXT_SAVE_UNKNOWN_PACK',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { metadata, record };
  }

  /** The record, if it is waiting for a pack (or its claim was abandoned); otherwise a 409. */
  private waitingRecord(message: Pick<ChatMessage, 'metadata'>): ContextSaveRecord {
    const record = contextSaveOf(message);
    if (record?.pending === undefined) throw this.notPending();
    if (record.status !== ContextSaveStatus.NEEDS_PACK_CHOICE && !isSavingAbandoned(record)) {
      throw this.notPending();
    }
    return record;
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
