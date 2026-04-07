import { Injectable, Logger } from "@nestjs/common";
import { AppConfig } from "../../../app/config/app.config";
import { httpRequest } from "../../../common/utilities";
import { THREAD_CONTEXT_LIMIT } from "../../../common/constants";
import { type ChatMessage } from "../../../generated/prisma";
import { type ThreadSettings } from "../types/execution.types";
import {
  type AssembledContext,
  type FileChunkResponse,
  type MemoryRecordResponse,
  type ContextPackResponse,
} from "../types/context.types";

const MEMORY_FETCH_LIMIT = 20;
const APPROX_CHARS_PER_TOKEN = 4;

@Injectable()
export class ContextAssemblyManager {
  private readonly logger = new Logger(ContextAssemblyManager.name);

  async assemble(
    userId: string,
    threadMessages: ChatMessage[],
    threadSettings?: ThreadSettings,
    contextPackIds?: string[],
    fileIds?: string[],
  ): Promise<AssembledContext> {
    const recentMessages = threadMessages.slice(-THREAD_CONTEXT_LIMIT);

    const [memories, contextPackItems, fileChunks] = await Promise.all([
      this.fetchMemories(userId),
      this.fetchContextPackItems(contextPackIds ?? []),
      this.fetchFileChunks(fileIds ?? []),
    ]);

    const tokenBudget = threadSettings?.maxTokens ?? 4096;

    return {
      systemPrompt: threadSettings?.systemPrompt ?? null,
      threadMessages: recentMessages,
      memories,
      contextPackItems,
      fileChunks,
      tokenBudget,
    };
  }

  buildPromptString(context: AssembledContext): string {
    const parts: string[] = [];

    if (context.systemPrompt) {
      parts.push(`SYSTEM: ${context.systemPrompt}`);
    }

    if (context.memories.length > 0) {
      const memoryBlock = context.memories
        .map((m) => `[${m.type}] ${m.content}`)
        .join("\n");
      parts.push(`USER CONTEXT (memories):\n${memoryBlock}`);
    }

    if (context.contextPackItems.length > 0) {
      const packBlock = context.contextPackItems
        .map((item) => item.content ?? "")
        .filter((c) => c.length > 0)
        .join("\n");
      if (packBlock) {
        parts.push(`CONTEXT PACK:\n${packBlock}`);
      }
    }

    if (context.fileChunks.length > 0) {
      const fileBlock = context.fileChunks
        .map((chunk) => chunk.content)
        .join("\n");
      parts.push(`FILE CONTENT:\n${fileBlock}`);
    }

    for (const msg of context.threadMessages) {
      parts.push(`${msg.role}: ${msg.content}`);
    }

    return this.truncateToTokenBudget(parts.join("\n\n"), context.tokenBudget);
  }

  buildChatMessages(
    context: AssembledContext,
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    const systemParts: string[] = [];

    if (context.systemPrompt) {
      systemParts.push(context.systemPrompt);
    }

    if (context.memories.length > 0) {
      const memoryBlock = context.memories
        .map((m) => `[${m.type}] ${m.content}`)
        .join("\n");
      systemParts.push(`User context (memories):\n${memoryBlock}`);
    }

    if (context.contextPackItems.length > 0) {
      const packBlock = context.contextPackItems
        .map((item) => item.content ?? "")
        .filter((c) => c.length > 0)
        .join("\n");
      if (packBlock) {
        systemParts.push(`Context pack:\n${packBlock}`);
      }
    }

    if (context.fileChunks.length > 0) {
      const fileBlock = context.fileChunks
        .map((chunk) => chunk.content)
        .join("\n");
      systemParts.push(`File content:\n${fileBlock}`);
    }

    if (systemParts.length > 0) {
      messages.push({ role: "system", content: systemParts.join("\n\n") });
    }

    for (const msg of context.threadMessages) {
      messages.push({
        role: this.mapRole(msg.role),
        content: msg.content,
      });
    }

    return messages;
  }

  private async fetchMemories(userId: string): Promise<MemoryRecordResponse[]> {
    try {
      const config = AppConfig.get();
      const url = `${config.MEMORY_SERVICE_URL}/api/v1/internal/memories/for-context?userId=${encodeURIComponent(userId)}&limit=${String(MEMORY_FETCH_LIMIT)}`;

      const response = await httpRequest<MemoryRecordResponse[]>({
        url,
        method: "GET",
        timeoutMs: 5_000,
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch memories: status ${String(response.status)}`);
        return [];
      }

      return response.data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Memory fetch failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private async fetchContextPackItems(
    packIds: string[],
  ): Promise<Array<{ content: string | null; type: string }>> {
    if (packIds.length === 0) {
      return [];
    }

    try {
      const config = AppConfig.get();
      const results: Array<{ content: string | null; type: string }> = [];

      for (const packId of packIds) {
        const url = `${config.MEMORY_SERVICE_URL}/api/v1/internal/context-packs/${encodeURIComponent(packId)}/items`;

        const response = await httpRequest<ContextPackResponse>({
          url,
          method: "GET",
          timeoutMs: 5_000,
        });

        if (response.ok && response.data.items) {
          for (const item of response.data.items) {
            results.push({ content: item.content, type: item.type });
          }
        }
      }

      return results;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Context pack fetch failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private async fetchFileChunks(
    fileIds: string[],
  ): Promise<FileChunkResponse[]> {
    if (fileIds.length === 0) {
      return [];
    }

    try {
      const config = AppConfig.get();
      const allChunks: FileChunkResponse[] = [];

      for (const fileId of fileIds) {
        const url = `${config.FILE_SERVICE_URL}/api/v1/internal/files/${encodeURIComponent(fileId)}/chunks`;

        const response = await httpRequest<FileChunkResponse[]>({
          url,
          method: "GET",
          timeoutMs: 5_000,
        });

        if (response.ok && Array.isArray(response.data)) {
          allChunks.push(...response.data);
        } else {
          this.logger.warn(`Failed to fetch chunks for file ${fileId}: status ${String(response.status)}`);
        }
      }

      return allChunks;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`File chunk fetch failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private truncateToTokenBudget(text: string, tokenBudget: number): string {
    const maxChars = tokenBudget * APPROX_CHARS_PER_TOKEN;
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(-maxChars);
  }

  private mapRole(role: string): string {
    if (role === "USER") {
      return "user";
    }
    if (role === "ASSISTANT") {
      return "assistant";
    }
    return "system";
  }
}
