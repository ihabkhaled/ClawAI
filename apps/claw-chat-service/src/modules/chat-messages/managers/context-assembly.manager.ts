import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  APPROX_CHARS_PER_TOKEN,
  MEMORY_FETCH_LIMIT,
  THREAD_CONTEXT_LIMIT,
} from '../../../common/constants';
import { type ChatMessage } from '../../../generated/prisma';
import {
  type OpenAiChatMessage,
  type OpenAiContentPart,
  type ThreadSettings,
} from '../types/execution.types';
import {
  type AssembledContext,
  type ContextPackResponse,
  type FileContentResponse,
  type MemoryRecordResponse,
} from '../types/context.types';

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

    const [memories, contextPackItems, fileContents] = await Promise.all([
      this.fetchMemories(userId),
      this.fetchContextPackItems(contextPackIds ?? []),
      this.fetchFileContents(fileIds ?? []),
    ]);

    const tokenBudget = threadSettings?.maxTokens ?? 4096;

    return {
      userId,
      systemPrompt: threadSettings?.systemPrompt ?? null,
      threadMessages: recentMessages,
      memories,
      contextPackItems,
      fileContents,
      tokenBudget,
    };
  }

  buildPromptString(context: AssembledContext): string {
    const parts: string[] = [];

    if (context.systemPrompt) {
      parts.push(`SYSTEM: ${context.systemPrompt}`);
    }

    if (context.memories.length > 0) {
      const memoryBlock = context.memories.map((m) => `[${m.type}] ${m.content}`).join('\n');
      parts.push(`USER CONTEXT (memories):\n${memoryBlock}`);
    }

    if (context.contextPackItems.length > 0) {
      const packBlock = context.contextPackItems
        .map((item) => item.content ?? '')
        .filter((c) => c.length > 0)
        .join('\n');
      if (packBlock) {
        parts.push(`CONTEXT PACK:\n${packBlock}`);
      }
    }

    if (context.fileContents.length > 0) {
      for (const file of context.fileContents) {
        const decoded = this.decodeFileContent(file);
        parts.push(
          `ATTACHED FILE "${file.filename}" (use this to answer the user's questions):\n${decoded}`,
        );
      }
    }

    for (const msg of context.threadMessages) {
      parts.push(`${msg.role}: ${msg.content}`);
    }

    return this.truncateToTokenBudget(parts.join('\n\n'), context.tokenBudget);
  }

  buildChatMessages(context: AssembledContext): OpenAiChatMessage[] {
    const messages: OpenAiChatMessage[] = [];

    const systemParts: string[] = [];

    if (context.systemPrompt) {
      systemParts.push(context.systemPrompt);
    }

    if (context.memories.length > 0) {
      const memoryBlock = context.memories.map((m) => `[${m.type}] ${m.content}`).join('\n');
      systemParts.push(`User context (memories):\n${memoryBlock}`);
    }

    if (context.contextPackItems.length > 0) {
      const packBlock = context.contextPackItems
        .map((item) => item.content ?? '')
        .filter((c) => c.length > 0)
        .join('\n');
      if (packBlock) {
        systemParts.push(`Context pack:\n${packBlock}`);
      }
    }

    // Add text-based files to system prompt
    const textFiles = context.fileContents.filter((f) => !this.isImageFile(f));
    for (const file of textFiles) {
      const decoded = this.decodeFileContent(file);
      systemParts.push(
        `The user has attached file "${file.filename}". Use this content to answer their questions:\n\n${decoded}`,
      );
    }

    if (systemParts.length > 0) {
      messages.push({ role: 'system', content: systemParts.join('\n\n') });
    }

    // Collect image files for multimodal injection into the last user message
    const imageFiles = context.fileContents.filter((f) => this.isImageFile(f));

    for (const msg of context.threadMessages) {
      const role = this.mapRole(msg.role);

      // If this is the last user message AND we have image attachments,
      // build multimodal content (text + images)
      const isLastUser = role === 'user' && msg === context.threadMessages.at(-1);
      if (isLastUser && imageFiles.length > 0) {
        const parts: OpenAiContentPart[] = [
          { type: 'text', text: msg.content },
        ];
        for (const img of imageFiles) {
          if (img.content) {
            parts.push({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.content}` },
            });
          }
        }
        messages.push({ role, content: parts });
      } else {
        messages.push({ role, content: msg.content });
      }
    }

    return messages;
  }

  private isImageFile(file: FileContentResponse): boolean {
    return file.mimeType.startsWith('image/');
  }

  private async fetchMemories(userId: string): Promise<MemoryRecordResponse[]> {
    try {
      const config = AppConfig.get();
      const url = `${config.MEMORY_SERVICE_URL}/api/v1/internal/memories/for-context?userId=${encodeURIComponent(userId)}&limit=${String(MEMORY_FETCH_LIMIT)}`;

      const response = await httpRequest<MemoryRecordResponse[]>({
        url,
        method: 'GET',
        timeoutMs: 5_000,
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch memories: status ${String(response.status)}`);
        return [];
      }

      return response.data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
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
          method: 'GET',
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
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Context pack fetch failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private async fetchFileContents(fileIds: string[]): Promise<FileContentResponse[]> {
    if (fileIds.length === 0) {
      return [];
    }

    try {
      const config = AppConfig.get();
      const results: FileContentResponse[] = [];

      for (const fileId of fileIds) {
        const url = `${config.FILE_SERVICE_URL}/api/v1/internal/files/${encodeURIComponent(fileId)}/content`;

        const response = await httpRequest<FileContentResponse>({
          url,
          method: 'GET',
          timeoutMs: 10_000,
        });

        if (response.ok && response.data.content) {
          results.push(response.data);
        } else {
          this.logger.warn(`No content for file ${fileId}`);
        }
      }

      return results;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`File content fetch failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private truncateToTokenBudget(text: string, tokenBudget: number): string {
    const maxChars = tokenBudget * APPROX_CHARS_PER_TOKEN;
    if (text.length <= maxChars) {
      return text;
    }
    // Keep the beginning (system prompt, memories, context) and truncate the end
    // This preserves the most important context (instructions, memories) over old messages
    return text.slice(0, maxChars);
  }

  private decodeFileContent(file: FileContentResponse): string {
    if (!file.content) {
      return `[File "${file.filename}" has no content]`;
    }

    // For text-based files, decode base64 to UTF-8 string
    const textMimeTypes = [
      'text/plain',
      'text/csv',
      'text/markdown',
      'text/html',
      'text/xml',
      'application/json',
      'application/xml',
    ];

    if (textMimeTypes.some((t) => file.mimeType.startsWith(t))) {
      try {
        return Buffer.from(file.content, 'base64').toString('utf-8');
      } catch {
        return `[Failed to decode file "${file.filename}"]`;
      }
    }

    // For binary files (PDF, images, etc.), include base64 with type hint
    // LLMs that support multimodal can parse this; others get the filename reference
    return `[Binary file "${file.filename}" (${file.mimeType}, base64-encoded)]\n${file.content.slice(0, 50000)}`;
  }

  private mapRole(role: string): string {
    if (role === 'USER') {
      return 'user';
    }
    if (role === 'ASSISTANT') {
      return 'assistant';
    }
    return 'system';
  }
}
