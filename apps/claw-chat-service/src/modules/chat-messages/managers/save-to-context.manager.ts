import { Injectable, Logger } from '@nestjs/common';
import {
  detectSaveToContextIntent,
  type SaveIntentMemoryType,
  SaveIntentTarget,
} from '@claw/shared-utilities';
import type { ChatMessage } from '../../../generated/prisma';
import { ContextSaveClient } from '../clients/context-save.client';
import type { SaveToContextOutcome } from '../types/save-to-context.types';
import { previewOf, savedPackName } from '../utilities/save-confirmation.utility';
import { previousMessageText } from '../utilities/save-intent.utility';

/**
 * "Save this as memory / remember this / add this to my context pack" typed
 * in a chat (owner feature 11). Deterministic, so it works on every model:
 * the command is recognised by `detectSaveToContextIntent` (13 locales), the
 * text is saved through memory-service's owner-scoped, idempotent
 * `save-from-chat` routes keyed on the user message id, and the caller
 * replies with a confirmation instead of calling a model.
 */
@Injectable()
export class SaveToContextManager {
  private readonly logger = new Logger(SaveToContextManager.name);

  constructor(private readonly client: ContextSaveClient = new ContextSaveClient()) {}

  /** Null when the turn is not a save command — the normal chat path runs. */
  async trySave(
    userId: string,
    threadId: string,
    messages: readonly ChatMessage[],
  ): Promise<SaveToContextOutcome | null> {
    const lastUser = [...messages].reverse().find((message) => message.role === 'USER');
    if (lastUser === undefined) return null;
    const intent = detectSaveToContextIntent(lastUser.content);
    if (intent === null) return null;

    const content =
      intent.content.length > 0 ? intent.content : previousMessageText(messages, lastUser);
    if (content.length === 0) {
      this.logger.log(`trySave: thread=${threadId} save command with nothing to save — asking`);
      return { kind: 'ASK' };
    }
    this.logger.log(
      `trySave: thread=${threadId} target=${intent.target} type=${intent.memoryType} chars=${String(content.length)}`,
    );
    return intent.target === SaveIntentTarget.CONTEXT_PACK
      ? this.savePack(userId, lastUser.id, content)
      : this.saveMemory(userId, threadId, lastUser.id, intent.memoryType, content);
  }

  private async saveMemory(
    userId: string,
    threadId: string,
    messageId: string,
    memoryType: SaveIntentMemoryType,
    content: string,
  ): Promise<SaveToContextOutcome> {
    const result = await this.client.saveMemory({
      userId,
      threadId,
      sourceMessageId: messageId,
      type: memoryType,
      content,
    });
    return result.ok
      ? {
          kind: 'MEMORY',
          memoryId: result.value.id,
          memoryType,
          size: result.value.content.length,
          preview: previewOf(content),
          created: result.value.created,
        }
      : { kind: 'FAILED', reason: result.reason };
  }

  private async savePack(
    userId: string,
    messageId: string,
    content: string,
  ): Promise<SaveToContextOutcome> {
    const name = savedPackName(content);
    const result = await this.client.createPack({
      userId,
      sourceMessageId: messageId,
      name,
      content,
    });
    return result.ok
      ? {
          kind: 'PACK',
          packId: result.value.id,
          name: result.value.name,
          size: content.length,
          created: result.value.created,
        }
      : { kind: 'FAILED', reason: result.reason };
  }
}
