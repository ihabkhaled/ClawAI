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
import {
  MAX_FILE_CONTENT_LENGTH,
  TEXT_FILE_EXTENSIONS,
  TEXT_MIME_PREFIXES,
} from '../constants/file-content.constants';

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
    this.logger.log(
      `assemble: starting for user ${userId} with ${String(threadMessages.length)} messages, ${String(contextPackIds?.length ?? 0)} packs, ${String(fileIds?.length ?? 0)} files`,
    );
    this.logger.debug(`assemble: slicing to last ${String(THREAD_CONTEXT_LIMIT)} messages`);
    const recentMessages = threadMessages.slice(-THREAD_CONTEXT_LIMIT);
    this.logger.debug(`assemble: using ${String(recentMessages.length)} recent messages`);

    this.logger.debug('assemble: fetching memories, context packs, and file contents in parallel');
    const [memories, contextPackItems, fileContents] = await Promise.all([
      this.fetchMemories(userId),
      this.fetchContextPackItems(contextPackIds ?? []),
      this.fetchFileContents(fileIds ?? []),
    ]);

    const tokenBudget = threadSettings?.maxTokens ?? 4096;
    this.logger.debug(
      `assemble: tokenBudget=${String(tokenBudget)} systemPrompt=${threadSettings?.systemPrompt ? 'present' : 'none'}`,
    );
    this.logger.log(
      `assemble: completed - ${String(memories.length)} memories, ${String(contextPackItems.length)} pack items, ${String(fileContents.length)} files, ${String(recentMessages.length)} messages`,
    );

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
    this.logger.debug('buildPromptString: starting prompt assembly');
    const parts: string[] = [];

    if (context.systemPrompt) {
      this.logger.debug(
        `buildPromptString: adding system prompt (${String(context.systemPrompt.length)} chars)`,
      );
      parts.push(`SYSTEM: ${context.systemPrompt}`);
    }

    if (context.memories.length > 0) {
      this.logger.debug(`buildPromptString: adding ${String(context.memories.length)} memories`);
      const memoryBlock = context.memories.map((m) => `[${m.type}] ${m.content}`).join('\n');
      parts.push(`USER CONTEXT (memories):\n${memoryBlock}`);
    }

    if (context.contextPackItems.length > 0) {
      this.logger.debug(
        `buildPromptString: adding ${String(context.contextPackItems.length)} context pack items`,
      );
      const packBlock = context.contextPackItems
        .map((item) => item.content ?? '')
        .filter((c) => c.length > 0)
        .join('\n');
      if (packBlock) {
        parts.push(`CONTEXT PACK:\n${packBlock}`);
      }
    }

    if (context.fileContents.length > 0) {
      this.logger.debug(
        `buildPromptString: adding ${String(context.fileContents.length)} file contents`,
      );
      for (const file of context.fileContents) {
        this.logger.debug(`buildPromptString: decoding file "${file.filename}" (${file.mimeType})`);
        const decoded = this.decodeFileContent(file);
        parts.push(
          `ATTACHED FILE "${file.filename}" (use this to answer the user's questions):\n${decoded}`,
        );
      }
    }

    this.logger.debug(
      `buildPromptString: adding ${String(context.threadMessages.length)} thread messages`,
    );
    for (const msg of context.threadMessages) {
      parts.push(`${msg.role}: ${msg.content}`);
    }

    const fullPrompt = parts.join('\n\n');
    this.logger.debug(
      `buildPromptString: full prompt assembled — ${String(fullPrompt.length)} chars, truncating to budget=${String(context.tokenBudget)}`,
    );
    return this.truncateToTokenBudget(fullPrompt, context.tokenBudget);
  }

  buildChatMessages(context: AssembledContext): OpenAiChatMessage[] {
    this.logger.debug('buildChatMessages: starting chat message assembly');
    const messages: OpenAiChatMessage[] = [];

    const systemParts: string[] = [];

    if (context.systemPrompt) {
      this.logger.debug('buildChatMessages: adding system prompt');
      systemParts.push(context.systemPrompt);
    }

    if (context.memories.length > 0) {
      this.logger.debug(
        `buildChatMessages: adding ${String(context.memories.length)} memories to system`,
      );
      const memoryBlock = context.memories.map((m) => `[${m.type}] ${m.content}`).join('\n');
      systemParts.push(`User context (memories):\n${memoryBlock}`);
    }

    if (context.contextPackItems.length > 0) {
      this.logger.debug(
        `buildChatMessages: adding ${String(context.contextPackItems.length)} context pack items to system`,
      );
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
    this.logger.debug(
      `buildChatMessages: adding ${String(textFiles.length)} text files to system prompt`,
    );
    for (const file of textFiles) {
      this.logger.debug(`buildChatMessages: decoding text file "${file.filename}"`);
      const decoded = this.decodeFileContent(file);
      systemParts.push(
        `The user has attached file "${file.filename}". Use this content to answer their questions:\n\n${decoded}`,
      );
    }

    if (systemParts.length > 0) {
      this.logger.debug(
        `buildChatMessages: system message built with ${String(systemParts.length)} parts`,
      );
      messages.push({ role: 'system', content: systemParts.join('\n\n') });
    }

    // Collect image files for multimodal injection into the last user message
    const imageFiles = context.fileContents.filter((f) => this.isImageFile(f));
    this.logger.debug(
      `buildChatMessages: found ${String(imageFiles.length)} image files for multimodal injection`,
    );

    for (const msg of context.threadMessages) {
      const role = this.mapRole(msg.role);

      // If this is the last user message AND we have image attachments,
      // build multimodal content (text + images)
      const isLastUser = role === 'user' && msg === context.threadMessages.at(-1);
      if (isLastUser && imageFiles.length > 0) {
        this.logger.debug(
          `buildChatMessages: building multimodal last user message with ${String(imageFiles.length)} images`,
        );
        const parts: OpenAiContentPart[] = [{ type: 'text', text: msg.content }];
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

    this.logger.debug(`buildChatMessages: assembled ${String(messages.length)} total messages`);
    return messages;
  }

  private isImageFile(file: FileContentResponse): boolean {
    return file.mimeType.startsWith('image/');
  }

  private async fetchMemories(userId: string): Promise<MemoryRecordResponse[]> {
    this.logger.debug(
      `fetchMemories: fetching memories for user=${userId} limit=${String(MEMORY_FETCH_LIMIT)}`,
    );
    try {
      const config = AppConfig.get();
      const url = `${config.MEMORY_SERVICE_URL}/api/v1/internal/memories/for-context?userId=${encodeURIComponent(userId)}&limit=${String(MEMORY_FETCH_LIMIT)}`;

      this.logger.debug(`fetchMemories: requesting ${url}`);
      const response = await httpRequest<MemoryRecordResponse[]>({
        url,
        method: 'GET',
        timeoutMs: 5_000,
      });

      if (!response.ok) {
        this.logger.warn(`fetchMemories: failed with status ${String(response.status)}`);
        return [];
      }

      this.logger.debug(`fetchMemories: received ${String(response.data.length)} memories`);
      return response.data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`fetchMemories: failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private async fetchContextPackItems(
    packIds: string[],
  ): Promise<Array<{ content: string | null; type: string }>> {
    if (packIds.length === 0) {
      this.logger.debug('fetchContextPackItems: no pack IDs provided — skipping');
      return [];
    }

    this.logger.debug(`fetchContextPackItems: fetching items for ${String(packIds.length)} packs`);
    try {
      const config = AppConfig.get();
      const results: Array<{ content: string | null; type: string }> = [];

      for (const packId of packIds) {
        const url = `${config.MEMORY_SERVICE_URL}/api/v1/internal/context-packs/${encodeURIComponent(packId)}/items`;

        this.logger.debug(`fetchContextPackItems: fetching pack ${packId}`);
        const response = await httpRequest<ContextPackResponse>({
          url,
          method: 'GET',
          timeoutMs: 5_000,
        });

        if (response.ok && response.data.items) {
          this.logger.debug(
            `fetchContextPackItems: pack ${packId} returned ${String(response.data.items.length)} items`,
          );
          for (const item of response.data.items) {
            results.push({ content: item.content, type: item.type });
          }
        } else {
          this.logger.debug(
            `fetchContextPackItems: pack ${packId} returned no items or failed status=${String(response.status)}`,
          );
        }
      }

      this.logger.debug(`fetchContextPackItems: total items collected=${String(results.length)}`);
      return results;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`fetchContextPackItems: failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private async fetchFileContents(fileIds: string[]): Promise<FileContentResponse[]> {
    if (fileIds.length === 0) {
      this.logger.debug('fetchFileContents: no file IDs provided — skipping');
      return [];
    }

    this.logger.debug(`fetchFileContents: fetching content for ${String(fileIds.length)} files`);
    try {
      const config = AppConfig.get();
      const results: FileContentResponse[] = [];

      for (const fileId of fileIds) {
        const url = `${config.FILE_SERVICE_URL}/api/v1/internal/files/${encodeURIComponent(fileId)}/content`;

        this.logger.debug(`fetchFileContents: fetching file ${fileId}`);
        const response = await httpRequest<FileContentResponse>({
          url,
          method: 'GET',
          timeoutMs: 10_000,
        });

        if (response.ok && response.data.content) {
          this.logger.debug(
            `fetchFileContents: file ${fileId} received — filename=${response.data.filename} mimeType=${response.data.mimeType} contentLen=${String(response.data.content.length)}`,
          );
          results.push(response.data);
        } else {
          this.logger.warn(
            `fetchFileContents: no content for file ${fileId} — status=${String(response.status)}`,
          );
        }
      }

      this.logger.debug(`fetchFileContents: total files collected=${String(results.length)}`);
      return results;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`fetchFileContents: failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private truncateToTokenBudget(text: string, tokenBudget: number): string {
    const maxChars = tokenBudget * APPROX_CHARS_PER_TOKEN;
    if (text.length <= maxChars) {
      this.logger.debug(
        `truncateToTokenBudget: text fits within budget (${String(text.length)} <= ${String(maxChars)} chars)`,
      );
      return text;
    }
    // Keep the beginning (system prompt, memories, context) and truncate the end
    // This preserves the most important context (instructions, memories) over old messages
    this.logger.debug(
      `truncateToTokenBudget: truncating from ${String(text.length)} to ${String(maxChars)} chars (budget=${String(tokenBudget)} tokens)`,
    );
    return text.slice(0, maxChars);
  }

  private decodeFileContent(file: FileContentResponse): string {
    if (!file.content) {
      return `[File "${file.filename}" has no content]`;
    }

    if (this.isTextDecodable(file)) {
      return this.decodeAsText(file);
    }

    if (this.isImageFile(file)) {
      return `[Image file "${file.filename}" — passed via multimodal images field]`;
    }

    return `[Binary file "${file.filename}" (${file.mimeType}) — content not extractable as text]`;
  }

  private isTextDecodable(file: FileContentResponse): boolean {
    if (TEXT_MIME_PREFIXES.some((prefix) => file.mimeType.startsWith(prefix))) {
      return true;
    }

    const ext = this.getFileExtension(file.filename);
    if (ext && (TEXT_FILE_EXTENSIONS as ReadonlySet<string>).has(ext)) {
      return true;
    }

    return false;
  }

  private decodeAsText(file: FileContentResponse): string {
    if (!file.content) {
      return `[File "${file.filename}" has no content]`;
    }
    try {
      const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
      if (decoded.length > MAX_FILE_CONTENT_LENGTH) {
        this.logger.debug(
          `decodeAsText: truncating ${file.filename} from ${String(decoded.length)} to ${String(MAX_FILE_CONTENT_LENGTH)}`,
        );
        return decoded.slice(0, MAX_FILE_CONTENT_LENGTH);
      }
      return decoded;
    } catch {
      return `[Failed to decode file "${file.filename}"]`;
    }
  }

  private getFileExtension(filename: string): string | null {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex < 0) {
      return null;
    }
    return filename.slice(dotIndex).toLowerCase();
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
