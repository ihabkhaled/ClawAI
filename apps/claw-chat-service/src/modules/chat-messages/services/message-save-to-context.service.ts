import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { SaveIntentTarget } from '@claw/shared-utilities';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { ContextSaveStatus, MemoryRecordType } from '../../../common/enums';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ContextSaveClient } from '../clients/context-save.client';
import {
  CONTEXT_SAVE_FAILURE_ERRORS,
  SAVE_PACK_CONTENT_MAX_CHARS,
} from '../constants/save-intent.constants';
import type { SaveMessageToContextDto } from '../dto/save-message-to-context.dto';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import type { ContextSaveRecord } from '../types/context-save.types';
import type { SaveFailureReason } from '../types/save-to-context.types';
import { contextPackDeepLink, memoryDeepLink } from '../utilities/context-save-links.utility';
import { previewOf, savedPackName } from '../utilities/save-confirmation.utility';

/**
 * The deterministic half of "save this to my context" (ADR-134 follow-up).
 *
 * The AI path needs a planner to read the user's words, and a request with no
 * material in the message ("save all info about ClawAI as a context pack")
 * could end with a model saying it cannot save anything. This is the button
 * that never depends on a model: it saves the text of ONE message the user can
 * see, through the same owner-scoped, idempotent memory-service routes, keyed
 * on that message's id so a double click or a retry stores it once.
 */
@Injectable()
export class MessageSaveToContextService {
  private readonly logger = new Logger(MessageSaveToContextService.name);

  constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly threads: ChatThreadsRepository,
    private readonly client: ContextSaveClient,
  ) {}

  async save(
    userId: string,
    messageId: string,
    dto: SaveMessageToContextDto,
  ): Promise<ContextSaveRecord> {
    const message = await this.messages.findById(messageId);
    const thread = message === null ? null : await this.threads.findById(message.threadId);
    // One answer for "no such message" and "someone else's".
    if (message === null || thread === null || thread.userId !== userId) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }
    const content = message.content.trim();
    if (content.length === 0) {
      throw new BusinessException(
        'This message has no text to save',
        'CONTEXT_SAVE_EMPTY_MESSAGE',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (content.length > SAVE_PACK_CONTENT_MAX_CHARS) {
      throw this.failure('LIMIT');
    }
    this.logger.log(
      `save: message=${messageId} target=${dto.target} pack=${dto.packId ?? 'new'} chars=${String(content.length)}`,
    );
    return dto.target === SaveIntentTarget.MEMORY
      ? this.saveMemory(userId, message.threadId, messageId, content)
      : this.savePack(userId, messageId, content, dto.packId);
  }

  private async saveMemory(
    userId: string,
    threadId: string,
    messageId: string,
    content: string,
  ): Promise<ContextSaveRecord> {
    const result = await this.client.saveMemory({
      userId,
      threadId,
      sourceMessageId: messageId,
      type: MemoryRecordType.SUMMARY,
      content,
    });
    if (!result.ok) throw this.failure(result.reason);
    return {
      status: ContextSaveStatus.SAVED,
      memory: {
        id: result.value.id,
        type: MemoryRecordType.SUMMARY,
        preview: previewOf(content),
        link: memoryDeepLink(result.value.id),
      },
    };
  }

  private async savePack(
    userId: string,
    messageId: string,
    content: string,
    packId: string | undefined,
  ): Promise<ContextSaveRecord> {
    const result =
      packId === undefined
        ? await this.client.createPack({
            userId,
            sourceMessageId: messageId,
            name: savedPackName(content),
            content,
          })
        : await this.client.addToPack({ userId, packId, sourceMessageId: messageId, content });
    if (!result.ok) throw this.failure(result.reason);
    return {
      status: ContextSaveStatus.SAVED,
      pack: {
        id: result.value.id,
        name: result.value.name,
        created: packId === undefined,
        link: contextPackDeepLink(result.value.id),
      },
    };
  }

  private failure(reason: SaveFailureReason): BusinessException {
    const error = CONTEXT_SAVE_FAILURE_ERRORS[reason];
    return new BusinessException('The message could not be saved', error.code, error.status);
  }
}
