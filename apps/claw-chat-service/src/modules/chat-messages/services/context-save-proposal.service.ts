import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { ContextSaveProposal } from '@claw/shared-types';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { ContextSaveStatus, MemoryRecordType } from '../../../common/enums';
import { type Prisma } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ContextSaveClient } from '../clients/context-save.client';
import {
  CONTEXT_SAVE_FAILURE_ERRORS,
  CONTEXT_SAVE_UNEXPECTED_FAILURE,
} from '../constants/save-intent.constants';
import { type ContextSaveProposalConfirmDto } from '../dto/context-save-proposal-confirm.dto';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import type { ContextSaveRecord } from '../types/context-save.types';
import type {
  ContextSaveConfirmOutcome,
  ContextSavePartOutcome,
} from '../types/context-save-proposal.types';
import { contextPackDeepLink, memoryDeepLink } from '../utilities/context-save-links.utility';
import {
  contextSaveOf,
  isContextSaveSettled,
  isSavingAbandoned,
} from '../utilities/context-save-record.utility';
import { previewOf } from '../utilities/save-confirmation.utility';

/**
 * The user's answer on a save proposal (ADR-168): confirm the (edited) form, or
 * dismiss it. Owner-checked through the thread; the pack is owner-checked again
 * by memory-service. The card's state lives on the answer's `metadata.contextSave`
 * and is claimed atomically (PROPOSED to SAVING), so a double click or a second
 * tab saves once.
 *
 * A record never stays SAVING: anything that throws after the claim puts it
 * back to PROPOSED (keeping the half that already went through), and a SAVING
 * record whose claim is older than CONTEXT_SAVE_SAVING_STALE_MS (the process
 * died) is taken over by the next confirm.
 */
@Injectable()
export class ContextSaveProposalService {
  private readonly logger = new Logger(ContextSaveProposalService.name);

  constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly threads: ChatThreadsRepository,
    private readonly client: ContextSaveClient,
  ) {}

  async confirm(
    userId: string,
    messageId: string,
    dto: ContextSaveProposalConfirmDto,
  ): Promise<ContextSaveRecord> {
    const { metadata, record, threadId } = await this.load(userId, messageId);
    // A second confirm after the save went through returns the saved record
    // without saving again. A dismissed (or failed) one is final.
    if (record.status === ContextSaveStatus.SAVED) return record;
    const proposal = this.confirmable(record);
    const abandoned = isSavingAbandoned(record);
    const claimed = await this.messages.transitionContextSave(
      messageId,
      abandoned ? ContextSaveStatus.SAVING : ContextSaveStatus.PROPOSED,
      this.withRecord(metadata, {
        ...record,
        status: ContextSaveStatus.SAVING,
        savingSince: new Date().toISOString(),
      }),
      abandoned ? record.savingSince : undefined,
    );
    if (!claimed) return this.afterLostClaim(userId, messageId);
    // What a retry still has to save: the abandoned claim may have saved a half.
    const saved: ContextSaveRecord = this.withoutClaim(record);
    let outcome: ContextSaveConfirmOutcome;
    try {
      outcome = await this.save(userId, threadId, messageId, record, proposal, dto, saved);
      await this.messages.updateMetadata(messageId, this.withRecord(metadata, outcome.record));
    } catch (error: unknown) {
      await this.release(messageId, metadata, record, saved, proposal, dto);
      throw error;
    }
    this.logger.log(
      `confirm: message=${messageId} status=${outcome.record.status} error=${outcome.record.proposalError ?? 'none'}`,
    );
    if (outcome.failure !== undefined && outcome.nothingSaved) {
      const error = CONTEXT_SAVE_FAILURE_ERRORS[outcome.failure];
      throw new BusinessException('The save could not be completed', error.code, error.status);
    }
    return outcome.record;
  }

  /** The proposal a confirm may act on: PROPOSED, or a SAVING claim that was abandoned. */
  private confirmable(record: ContextSaveRecord): ContextSaveProposal {
    const waiting = record.status === ContextSaveStatus.PROPOSED || isSavingAbandoned(record);
    if (isContextSaveSettled(record) || !waiting || record.proposal === undefined) {
      throw this.notProposed();
    }
    return record.proposal;
  }

  async dismiss(userId: string, messageId: string): Promise<ContextSaveRecord> {
    const { metadata, record } = await this.load(userId, messageId);
    if (record.status !== ContextSaveStatus.PROPOSED) return record;
    const {
      proposal: _proposal,
      proposalError: _error,
      memoryFailure: _memoryFailure,
      packFailure: _packFailure,
      ...rest
    } = record;
    // A half that already went through stays saved: dismissing only drops the
    // unsaved remainder, so the card settles as SAVED, never DISMISSED.
    const halfSaved = record.memory !== undefined || record.pack !== undefined;
    const dismissed: ContextSaveRecord = {
      ...rest,
      status: halfSaved ? ContextSaveStatus.SAVED : ContextSaveStatus.DISMISSED,
    };
    const claimed = await this.messages.transitionContextSave(
      messageId,
      ContextSaveStatus.PROPOSED,
      this.withRecord(metadata, dismissed),
    );
    if (claimed) return dismissed;
    // Lost the race to a confirm or another dismiss: report what is stored now.
    return (await this.load(userId, messageId)).record;
  }

  /**
   * Puts a claimed record back after an unexpected throw, keeping any half that
   * was already saved. Best effort: it must never hide the original error.
   */
  private async release(
    messageId: string,
    metadata: Record<string, unknown>,
    record: ContextSaveRecord,
    saved: ContextSaveRecord,
    proposal: ContextSaveProposal,
    dto: ContextSaveProposalConfirmDto,
  ): Promise<void> {
    // Done also when an earlier confirm already saved the half: it must not be
    // re-offered or marked failed because THIS attempt did not save it.
    const memoryDone = dto.memory === null || saved.memory !== undefined;
    const packDone = dto.pack === null || saved.pack !== undefined;
    const outcome = this.settle(
      record,
      saved,
      proposal,
      dto,
      { done: memoryDone, failure: memoryDone ? undefined : CONTEXT_SAVE_UNEXPECTED_FAILURE },
      { done: packDone, failure: packDone ? undefined : CONTEXT_SAVE_UNEXPECTED_FAILURE },
    );
    try {
      await this.messages.updateMetadata(messageId, this.withRecord(metadata, outcome.record));
      this.logger.warn(`confirm: message=${messageId} threw after the claim — released`);
    } catch (error: unknown) {
      this.logger.error(
        `confirm: message=${messageId} could not be released; it recovers after the stale-claim window: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async save(
    userId: string,
    threadId: string,
    messageId: string,
    record: ContextSaveRecord,
    proposal: ContextSaveProposal,
    dto: ContextSaveProposalConfirmDto,
    saved: ContextSaveRecord,
  ): Promise<ContextSaveConfirmOutcome> {
    const sourceMessageId = record.sourceMessageId ?? messageId;
    const memory = await this.saveMemoryPart(userId, threadId, sourceMessageId, dto, saved);
    const pack = await this.savePackPart(userId, sourceMessageId, dto, saved);
    return this.settle(record, saved, proposal, dto, memory, pack);
  }

  /** The record to store once both halves have been tried. */
  private settle(
    record: ContextSaveRecord,
    saved: ContextSaveRecord,
    proposal: ContextSaveProposal,
    dto: ContextSaveProposalConfirmDto,
    memory: ContextSavePartOutcome,
    pack: ContextSavePartOutcome,
  ): ContextSaveConfirmOutcome {
    const failure = memory.failure ?? pack.failure;
    const {
      proposal: _proposal,
      proposalError: _error,
      savingSince: _since,
      memoryFailure: _memoryFailure,
      packFailure: _packFailure,
      ...clean
    } = saved;
    if (memory.done && pack.done) {
      return { record: { ...clean, status: ContextSaveStatus.SAVED }, nothingSaved: false };
    }
    return {
      record: {
        ...clean,
        status: ContextSaveStatus.PROPOSED,
        proposal: this.retryProposal(proposal, dto, memory, pack),
        ...this.failureFields(memory, pack),
      },
      failure,
      nothingSaved: saved.memory === record.memory && saved.pack === record.pack,
    };
  }

  /**
   * Back to PROPOSED with what the user edited, minus the half that already went
   * through (null), so a retry saves only the rest.
   */
  private retryProposal(
    proposal: ContextSaveProposal,
    dto: ContextSaveProposalConfirmDto,
    memory: ContextSavePartOutcome,
    pack: ContextSavePartOutcome,
  ): ContextSaveProposal {
    return {
      ...proposal,
      memory: memory.done ? null : dto.memory,
      pack: pack.done || dto.pack === null ? null : this.packFromRequest(proposal, dto.pack),
    };
  }

  /** Which half failed (`memoryFailure` / `packFailure`) and the stable code of the first failure. */
  private failureFields(
    memory: ContextSavePartOutcome,
    pack: ContextSavePartOutcome,
  ): Partial<ContextSaveRecord> {
    const failure = memory.failure ?? pack.failure;
    return {
      ...(memory.failure === undefined ? {} : { memoryFailure: memory.failure }),
      ...(pack.failure === undefined ? {} : { packFailure: pack.failure }),
      ...(failure === undefined
        ? {}
        : { proposalError: CONTEXT_SAVE_FAILURE_ERRORS[failure].code }),
    };
  }

  private async saveMemoryPart(
    userId: string,
    threadId: string,
    sourceMessageId: string,
    dto: ContextSaveProposalConfirmDto,
    saved: ContextSaveRecord,
  ): Promise<ContextSavePartOutcome> {
    // Already saved by an earlier confirm: never saved twice, whatever the client sent.
    if (dto.memory === null || saved.memory !== undefined) return { done: true };
    const result = await this.client.saveMemory({
      userId,
      threadId,
      sourceMessageId,
      type: dto.memory.type,
      content: dto.memory.text,
    });
    if (!result.ok) return { done: false, failure: result.reason };
    saved.memory = {
      id: result.value.id,
      type: MemoryRecordType[dto.memory.type],
      preview: previewOf(dto.memory.text),
      link: memoryDeepLink(result.value.id),
    };
    return { done: true };
  }

  private async savePackPart(
    userId: string,
    sourceMessageId: string,
    dto: ContextSaveProposalConfirmDto,
    saved: ContextSaveRecord,
  ): Promise<ContextSavePartOutcome> {
    const pack = dto.pack;
    if (pack === null || saved.pack !== undefined) return { done: true };
    const result =
      pack.packId === null
        ? await this.client.createPack({
            userId,
            sourceMessageId,
            name: pack.newPackName ?? '',
            content: pack.content,
          })
        : await this.client.addToPack({
            userId,
            packId: pack.packId,
            sourceMessageId,
            content: pack.content,
          });
    if (!result.ok) return { done: false, failure: result.reason };
    saved.pack = {
      id: result.value.id,
      name: result.value.name || (pack.newPackName ?? ''),
      created: pack.packId === null,
      link: contextPackDeepLink(result.value.id),
    };
    return { done: true };
  }

  private packFromRequest(
    proposal: ContextSaveProposal,
    pack: NonNullable<ContextSaveProposalConfirmDto['pack']>,
  ): NonNullable<ContextSaveProposal['pack']> {
    return {
      source: proposal.pack?.source ?? 'USER_TEXT',
      content: pack.content,
      packId: pack.packId,
      packName: proposal.options.find((option) => option.id === pack.packId)?.name ?? null,
      newPackName: pack.newPackName,
    };
  }

  /** The stored record without the claim bookkeeping, as the starting point of a save. */
  private withoutClaim(record: ContextSaveRecord): ContextSaveRecord {
    const { savingSince: _since, ...rest } = record;
    return rest;
  }

  private async afterLostClaim(userId: string, messageId: string): Promise<ContextSaveRecord> {
    const { record } = await this.load(userId, messageId);
    if (record.status === ContextSaveStatus.SAVED) return record;
    throw this.notProposed();
  }

  private async load(
    userId: string,
    messageId: string,
  ): Promise<{ metadata: Record<string, unknown>; record: ContextSaveRecord; threadId: string }> {
    const message = await this.messages.findById(messageId);
    const thread = message === null ? null : await this.threads.findById(message.threadId);
    // One answer for "no such message" and "someone else's": never confirm
    // another user's message exists.
    if (message === null || thread === null || thread.userId !== userId) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }
    const record = contextSaveOf(message);
    if (record === undefined) throw this.notProposed();
    return {
      metadata: (message.metadata ?? {}) as Record<string, unknown>,
      record,
      threadId: message.threadId,
    };
  }

  private withRecord(
    metadata: Record<string, unknown>,
    record: ContextSaveRecord,
  ): Prisma.InputJsonValue {
    return { ...metadata, contextSave: record } as Prisma.InputJsonValue;
  }

  private notProposed(): BusinessException {
    return new BusinessException(
      'This save is not waiting for confirmation',
      'CONTEXT_SAVE_NOT_PENDING',
      HttpStatus.CONFLICT,
    );
  }
}
