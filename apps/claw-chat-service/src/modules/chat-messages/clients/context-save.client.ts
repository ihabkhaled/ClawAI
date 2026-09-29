import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  SAVE_FROM_CHAT_TIMEOUT_MS,
  SAVE_LIMIT_ERROR_CODES,
  SAVE_MEMORY_FROM_CHAT_PATH,
  SAVE_PACK_FROM_CHAT_PATH,
  SAVE_PLAN_ERROR_CODES,
} from '../constants/save-to-context.constants';
import {
  ADD_ITEM_FROM_CHAT_SUFFIX,
  CONTEXT_PACKS_INTERNAL_PATH,
  PACK_OPTIONS_FOR_CHAT_PATH,
} from '../constants/save-intent.constants';
import type {
  SaveFailureReason,
  SaveMemoryFromChatResponse,
  SavePackFromChatResponse,
  SaveServiceErrorBody,
} from '../types/save-to-context.types';
import type { AddItemFromChatResponse, ChatPackOptionResponse } from '../types/context-save.types';
import type { ContextSaveCallResult } from '../types/context-save-client.types';

/**
 * Every memory-service call a chat save makes (service token; memory-service
 * scopes each by `userId` and checks pack ownership). Shared by the AI path
 * (ADR-133) and the keyword fallback, so there is one HTTP client, not two.
 * Never throws: a failure is a typed reason the caller can put in the chat.
 */
@Injectable()
export class ContextSaveClient {
  private readonly logger = new Logger(ContextSaveClient.name);

  async saveMemory(args: {
    userId: string;
    threadId: string;
    sourceMessageId: string;
    type: string;
    content: string;
  }): Promise<ContextSaveCallResult<{ id: string; content: string; created: boolean }>> {
    const response = await this.post<SaveMemoryFromChatResponse>(SAVE_MEMORY_FROM_CHAT_PATH, {
      userId: args.userId,
      type: args.type,
      content: args.content,
      sourceThreadId: args.threadId,
      sourceMessageId: args.sourceMessageId,
    });
    const memory = response.data.memory;
    return response.ok && memory !== undefined
      ? {
          ok: true,
          value: {
            id: memory.id,
            content: memory.content,
            created: response.data.created === true,
          },
        }
      : { ok: false, reason: this.failureReason(response.data) };
  }

  async createPack(args: {
    userId: string;
    sourceMessageId: string;
    name: string;
    content: string;
  }): Promise<ContextSaveCallResult<{ id: string; name: string; created: boolean }>> {
    const response = await this.post<SavePackFromChatResponse>(SAVE_PACK_FROM_CHAT_PATH, args);
    const packId = response.data.packId;
    return response.ok && packId !== undefined
      ? {
          ok: true,
          value: {
            id: packId,
            name: response.data.name ?? args.name,
            created: response.data.created === true,
          },
        }
      : { ok: false, reason: this.failureReason(response.data) };
  }

  async addToPack(args: {
    userId: string;
    packId: string;
    sourceMessageId: string;
    content: string;
  }): Promise<ContextSaveCallResult<{ id: string; name: string }>> {
    const response = await this.post<AddItemFromChatResponse>(
      `${CONTEXT_PACKS_INTERNAL_PATH}/${encodeURIComponent(args.packId)}${ADD_ITEM_FROM_CHAT_SUFFIX}`,
      { userId: args.userId, content: args.content, sourceMessageId: args.sourceMessageId },
    );
    return response.ok && response.data.packId !== undefined
      ? { ok: true, value: { id: response.data.packId, name: response.data.name ?? '' } }
      : { ok: false, reason: this.failureReason(response.data) };
  }

  /** The user's packs, newest first; empty on any failure (the save still works). */
  async listPacks(userId: string): Promise<ChatPackOptionResponse[]> {
    const response = await this.post<ChatPackOptionResponse[]>(PACK_OPTIONS_FOR_CHAT_PATH, {
      userId,
    });
    return response.ok && Array.isArray(response.data) ? response.data : [];
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
