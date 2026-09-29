import { Injectable, Logger } from '@nestjs/common';
import {
  detectSaveToContextIntent,
  type SaveIntentMemoryType,
  SaveIntentTarget,
} from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import type { ChatMessage } from '../../../generated/prisma';
import {
  SAVE_FROM_CHAT_TIMEOUT_MS,
  SAVE_LIMIT_ERROR_CODES,
  SAVE_MEMORY_FROM_CHAT_PATH,
  SAVE_PACK_FROM_CHAT_PATH,
  SAVE_PLAN_ERROR_CODES,
} from '../constants/save-to-context.constants';
import type {
  SaveFailureReason,
  SaveMemoryFromChatResponse,
  SavePackFromChatResponse,
  SaveServiceErrorBody,
  SaveToContextOutcome,
} from '../types/save-to-context.types';
import { previewOf, savedPackName } from '../utilities/save-confirmation.utility';

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
      intent.content.length > 0 ? intent.content : this.previousContent(messages, lastUser);
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

  /** "save this" on its own means the message right before it. */
  private previousContent(messages: readonly ChatMessage[], command: ChatMessage): string {
    const index = messages.findIndex((message) => message.id === command.id);
    const before = messages.slice(0, Math.max(index, 0)).reverse();
    return before.find((message) => message.content.trim().length > 0)?.content.trim() ?? '';
  }

  private async saveMemory(
    userId: string,
    threadId: string,
    messageId: string,
    memoryType: SaveIntentMemoryType,
    content: string,
  ): Promise<SaveToContextOutcome> {
    const response = await this.post<SaveMemoryFromChatResponse>(SAVE_MEMORY_FROM_CHAT_PATH, {
      userId,
      type: memoryType,
      content,
      sourceThreadId: threadId,
      sourceMessageId: messageId,
    });
    return !response.ok || response.data.memory === undefined ? { kind: 'FAILED', reason: this.failureReason(response.data) } : {
      kind: 'MEMORY',
      memoryId: response.data.memory.id,
      memoryType,
      size: response.data.memory.content.length,
      preview: previewOf(content),
      created: response.data.created === true,
    };
  }

  private async savePack(
    userId: string,
    messageId: string,
    content: string,
  ): Promise<SaveToContextOutcome> {
    const name = savedPackName(content);
    const response = await this.post<SavePackFromChatResponse>(SAVE_PACK_FROM_CHAT_PATH, {
      userId,
      name,
      content,
      sourceMessageId: messageId,
    });
    return !response.ok || response.data.packId === undefined ? { kind: 'FAILED', reason: this.failureReason(response.data) } : {
      kind: 'PACK',
      packId: response.data.packId,
      name: response.data.name ?? name,
      size: content.length,
      created: response.data.created === true,
    };
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; data: T & SaveServiceErrorBody }> {
    try {
      const response = await httpRequest<T & SaveServiceErrorBody>({
        url: `${AppConfig.get().MEMORY_SERVICE_URL}${path}`,
        method: 'POST',
        headers: { Authorization: buildInterServiceAuthHeader() },
        body,
        timeoutMs: SAVE_FROM_CHAT_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(`post: ${path} failed status=${String(response.status)}`);
      }
      return response;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`post: ${path} threw — ${msg}`);
      return { ok: false, status: 0, data: {} as T & SaveServiceErrorBody };
    }
  }

  private failureReason(body: SaveServiceErrorBody | undefined): SaveFailureReason {
    const code = body?.code ?? body?.error?.code ?? '';
    if (SAVE_PLAN_ERROR_CODES.has(code)) return 'PLAN';
    return SAVE_LIMIT_ERROR_CODES.has(code) ? 'LIMIT' : 'UNAVAILABLE';
  }
}
