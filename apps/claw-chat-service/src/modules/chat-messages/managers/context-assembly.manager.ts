import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest, runResearch } from '../../../common/utilities';
import {
  APPROX_CHARS_PER_TOKEN,
  MEMORY_FETCH_LIMIT,
  THREAD_CONTEXT_LIMIT,
  WORKSPACE_CONTEXT_LIMIT,
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
  type ResearchEvidenceCitation,
  type WorkspaceCitation,
  type WorkspaceSearchApiResponse,
} from '../types/context.types';
import { type ResearchOptions } from '../types/research-options.types';
import { type ResearchRunResponse } from '../types/research.types';
import { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';
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
    research?: ResearchOptions,
  ): Promise<AssembledContext> {
    this.logStartAssemble(userId, threadMessages, contextPackIds, fileIds, research);
    const recentMessages = threadMessages.slice(-THREAD_CONTEXT_LIMIT);
    const lastUserContent = recentMessages.at(-1)?.content ?? '';
    const skipExpensiveContext = this.shouldSkipExpensiveContext(lastUserContent, fileIds ?? []);
    const fetched = await this.fetchAssembledInputs({
      userId,
      lastUserContent,
      skipExpensiveContext,
      contextPackIds,
      fileIds,
      research,
      lastUserMessage: recentMessages.at(-1),
    });
    const researchEvidence = this.extractEvidenceCitations(fetched.researchRun);
    const researchWarnings = this.extractResearchWarnings(fetched.researchRun);
    const tokenBudget = threadSettings?.maxTokens ?? 4096;
    return {
      userId,
      systemPrompt: threadSettings?.systemPrompt ?? null,
      threadMessages: recentMessages,
      memories: fetched.memories,
      contextPackItems: fetched.contextPackItems,
      fileContents: fetched.fileContents,
      workspaceCitations: fetched.workspaceCitations,
      researchEvidence,
      researchRunId: fetched.researchRun?.id ?? null,
      researchWarnings,
      tokenBudget,
    };
  }

  private logStartAssemble(
    userId: string,
    threadMessages: ChatMessage[],
    contextPackIds: string[] | undefined,
    fileIds: string[] | undefined,
    research: ResearchOptions | undefined,
  ): void {
    this.logger.log(
      `assemble: starting for user ${userId} with ${String(threadMessages.length)} messages, ${String(contextPackIds?.length ?? 0)} packs, ${String(fileIds?.length ?? 0)} files, research=${research?.mode ?? 'OFF'}`,
    );
  }

  private extractResearchWarnings(run: ResearchRunResponse | null): string[] {
    const bundle = run?.bundle;
    if (bundle === undefined || bundle === null || !('warnings' in bundle)) {
      return [];
    }
    return (bundle.warnings as string[] | undefined) ?? [];
  }

  private async fetchAssembledInputs(args: {
    userId: string;
    lastUserContent: string;
    skipExpensiveContext: boolean;
    contextPackIds: string[] | undefined;
    fileIds: string[] | undefined;
    research: ResearchOptions | undefined;
    lastUserMessage: ChatMessage | undefined;
  }): Promise<{
    memories: AssembledContext['memories'];
    contextPackItems: AssembledContext['contextPackItems'];
    fileContents: AssembledContext['fileContents'];
    workspaceCitations: AssembledContext['workspaceCitations'];
    researchRun: ResearchRunResponse | null;
  }> {
    const [memories, contextPackItems, fileContents, workspaceCitations, researchRun] =
      await Promise.all([
        args.skipExpensiveContext ? Promise.resolve([]) : this.fetchMemories(args.userId),
        args.skipExpensiveContext
          ? Promise.resolve([])
          : this.fetchContextPackItems(args.contextPackIds ?? []),
        this.fetchFileContents(args.fileIds ?? []),
        args.skipExpensiveContext
          ? Promise.resolve([])
          : this.fetchWorkspaceContext(args.userId, args.lastUserContent),
        this.fetchResearchEvidence(
          args.userId,
          args.lastUserContent,
          args.research,
          args.lastUserMessage,
        ),
      ]);
    return { memories, contextPackItems, fileContents, workspaceCitations, researchRun };
  }

  private async fetchResearchEvidence(
    userId: string,
    intent: string,
    research: ResearchOptions | undefined,
    lastUserMessage: ChatMessage | undefined,
  ): Promise<ResearchRunResponse | null> {
    // Primary path: the research bundle was attached to the user message
    // when it was created (with the caller's bearer token). Re-use it.
    const fromMetadata = this.extractResearchFromMetadata(lastUserMessage);
    if (fromMetadata !== null) {
      return fromMetadata;
    }
    // Fallback: caller passed an explicit ResearchOptions and still holds
    // a bearer token. Useful for internal orchestrators.
    if (research === undefined || research.mode === 'OFF' || intent.length === 0) {
      return null;
    }
    const config = AppConfig.get();
    const run = await runResearch(config.RESEARCH_SERVICE_URL, {
      userToken: research.userToken,
      userId,
      intent,
      workflow: research.mode as ResearchWorkflow,
      searchProviderId: research.providerId,
      requestedModel: research.requestedModel,
      requestedProvider: research.requestedProvider,
    });
    if (run === null) {
      this.logger.warn(
        `research: request failed for user=${userId} intent="${intent.slice(0, 80)}"`,
      );
      return null;
    }
    this.logger.log(`research: run ${run.id} completed status=${run.status}`);
    return run;
  }

  private extractResearchFromMetadata(
    message: ChatMessage | undefined,
  ): ResearchRunResponse | null {
    if (
      message?.metadata === undefined ||
      message.metadata === null ||
      typeof message.metadata !== 'object'
    ) {
      return null;
    }
    const metadata = message.metadata as {
      research?: { runId?: string; bundle?: unknown };
    };
    const research = metadata.research;
    if (research?.runId === undefined || research.bundle === undefined) {
      return null;
    }
    return {
      id: research.runId,
      userId: '',
      requestedModel: null,
      requestedProvider: null,
      workflow: '',
      intent: message.content ?? '',
      status: 'COMPLETED',
      bundle: research.bundle as ResearchRunResponse['bundle'],
      trace: [],
      errorMessage: null,
      startedAt: '',
      completedAt: null,
    };
  }

  private extractEvidenceCitations(run: ResearchRunResponse | null): ResearchEvidenceCitation[] {
    if (run === null || !('items' in (run.bundle ?? {}))) {
      return [];
    }
    const items = (run.bundle as { items?: unknown[] }).items ?? [];
    return (items as ResearchEvidenceCitation[]).map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      source: item.source,
      providerKind: item.providerKind,
      publishedAt: item.publishedAt,
      confidence: item.confidence,
    }));
  }

  buildPromptString(context: AssembledContext): string {
    const currentIntent = this.extractCurrentIntent(context.threadMessages);
    const relevantMessages = this.filterThreadMessagesForIntent(
      context.threadMessages,
      currentIntent,
    );
    const relevantMemories = this.filterMemoriesForIntent(context.memories, currentIntent);
    const relevantWorkspaceCitations = this.filterWorkspaceCitationsForIntent(
      context.workspaceCitations,
      currentIntent,
    );
    const parts: string[] = [];
    if (context.systemPrompt) {
      parts.push(`SYSTEM: ${context.systemPrompt}`);
    }
    if (context.researchEvidence.length > 0 || context.researchWarnings.length > 0) {
      parts.push(this.formatResearchBlock(context));
    }
    parts.push(
      ...this.formatFileBlocks(context.fileContents),
      ...this.formatMessageLines(relevantMessages),
    );
    const workspaceBlock = this.formatWorkspaceCitations(relevantWorkspaceCitations);
    if (workspaceBlock) parts.push(workspaceBlock);
    const packBlock = this.formatContextPackBlock(context.contextPackItems);
    if (packBlock) parts.push(packBlock);
    const memoryBlock = this.formatMemoryBlock(relevantMemories);
    if (memoryBlock) parts.push(memoryBlock);
    const fullPrompt = parts.join('\n\n');
    this.logger.debug(
      `buildPromptString: full prompt assembled — ${String(fullPrompt.length)} chars, truncating to budget=${String(context.tokenBudget)}`,
    );
    return this.truncateToTokenBudget(fullPrompt, context.tokenBudget);
  }

  private formatFileBlocks(fileContents: AssembledContext['fileContents']): string[] {
    return fileContents.map(
      (file) =>
        `ATTACHED FILE "${file.filename}" (use this to answer the user's questions):\n${this.decodeFileContent(file)}`,
    );
  }

  private formatMessageLines(messages: AssembledContext['threadMessages']): string[] {
    return messages.map((msg) => `${msg.role}: ${msg.content}`);
  }

  private formatWorkspaceCitations(
    citations: AssembledContext['workspaceCitations'],
  ): string | null {
    if (citations.length === 0) return null;
    const block = citations
      .map((c) => {
        const lines = [`[${c.type}/${c.provider}] ${c.title}`];
        if (c.snippet) lines.push(c.snippet);
        if (c.url) lines.push(`URL: ${c.url}`);
        return lines.join('\n');
      })
      .join('\n\n');
    return `WORKSPACE CONTEXT (relevant documents and issues):\n${block}`;
  }

  private formatContextPackBlock(items: AssembledContext['contextPackItems']): string | null {
    if (items.length === 0) return null;
    const block = items
      .map((item) => item.content ?? '')
      .filter((c) => c.length > 0)
      .join('\n');
    return block ? `CONTEXT PACK:\n${block}` : null;
  }

  private formatMemoryBlock(memories: AssembledContext['memories']): string | null {
    if (memories.length === 0) return null;
    const block = memories.map((m) => `[${m.type}] ${m.content}`).join('\n');
    return `USER CONTEXT (memories):\n${block}`;
  }

  buildChatMessages(context: AssembledContext): OpenAiChatMessage[] {
    const currentIntent = this.extractCurrentIntent(context.threadMessages);
    const relevantMessages = this.filterThreadMessagesForIntent(
      context.threadMessages,
      currentIntent,
    );
    const relevantMemories = this.filterMemoriesForIntent(context.memories, currentIntent);
    const relevantWorkspaceCitations = this.filterWorkspaceCitationsForIntent(
      context.workspaceCitations,
      currentIntent,
    );
    const systemParts = this.buildSystemMessageParts(
      context,
      relevantMemories,
      relevantWorkspaceCitations,
    );
    const messages: OpenAiChatMessage[] = [];
    if (systemParts.length > 0) {
      messages.push({ role: 'system', content: systemParts.join('\n\n') });
    }
    const imageFiles = context.fileContents.filter((f) => this.isImageFile(f));
    for (const msg of relevantMessages) {
      const role = this.mapRole(msg.role);
      const isLastUser = role === 'user' && msg === relevantMessages.at(-1);
      if (isLastUser && imageFiles.length > 0) {
        messages.push({ role, content: this.buildMultimodalUserParts(msg.content, imageFiles) });
      } else {
        messages.push({ role, content: msg.content });
      }
    }
    return messages;
  }

  private buildSystemMessageParts(
    context: AssembledContext,
    relevantMemories: AssembledContext['memories'],
    relevantWorkspaceCitations: AssembledContext['workspaceCitations'],
  ): string[] {
    const parts: string[] = [];
    if (context.systemPrompt) parts.push(context.systemPrompt);
    if (relevantMemories.length > 0) {
      const block = relevantMemories.map((m) => `[${m.type}] ${m.content}`).join('\n');
      parts.push(`User context (memories):\n${block}`);
    }
    const packBlock = this.formatContextPackBlock(context.contextPackItems);
    if (packBlock) parts.push(packBlock.replace('CONTEXT PACK:', 'Context pack:'));
    if (relevantWorkspaceCitations.length > 0) {
      const citationBlock = relevantWorkspaceCitations
        .map((c) => {
          const lines = [`[${c.type}/${c.provider}] ${c.title}`];
          if (c.snippet) lines.push(c.snippet);
          if (c.url) lines.push(`URL: ${c.url}`);
          return lines.join('\n');
        })
        .join('\n\n');
      parts.push(`Workspace context (relevant documents and issues):\n${citationBlock}`);
    }
    if (context.researchEvidence.length > 0 || context.researchWarnings.length > 0) {
      parts.push(this.formatResearchBlock(context));
    }
    const textFiles = context.fileContents.filter((f) => !this.isImageFile(f));
    for (const file of textFiles) {
      parts.push(
        `The user has attached file "${file.filename}". Use this content to answer their questions:\n\n${this.decodeFileContent(file)}`,
      );
    }
    return parts;
  }

  private buildMultimodalUserParts(
    text: string,
    imageFiles: AssembledContext['fileContents'],
  ): OpenAiContentPart[] {
    const parts: OpenAiContentPart[] = [{ type: 'text', text }];
    for (const img of imageFiles) {
      if (img.content) {
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.content}` },
        });
      }
    }
    return parts;
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

  private async fetchWorkspaceContext(userId: string, query: string): Promise<WorkspaceCitation[]> {
    if (query.length < 2) {
      this.logger.debug('fetchWorkspaceContext: query too short — skipping');
      return [];
    }
    this.logger.debug(
      `fetchWorkspaceContext: fetching workspace context for user=${userId} limit=${String(WORKSPACE_CONTEXT_LIMIT)}`,
    );
    try {
      const config = AppConfig.get();
      const url = `${config.WORKSPACE_SERVICE_URL}/api/v1/internal/workspace/search`;
      const response = await httpRequest<WorkspaceSearchApiResponse>({
        url,
        method: 'POST',
        body: { query, userId, limit: WORKSPACE_CONTEXT_LIMIT },
        timeoutMs: 5_000,
      });

      if (!response.ok) {
        this.logger.warn(`fetchWorkspaceContext: failed with status ${String(response.status)}`);
        return [];
      }

      this.logger.debug(
        `fetchWorkspaceContext: received ${String(response.data.results.length)} results`,
      );
      return response.data.results.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        provider: r.provider,
        url: r.url,
        snippet: r.snippet,
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`fetchWorkspaceContext: failed (non-blocking): ${msg}`);
      return [];
    }
  }

  private formatResearchBlock(context: AssembledContext): string {
    const lines: string[] = [
      'The web search and browsing steps have already been completed for you.',
      'Use the evidence below for any web claim and cite sources as [n].',
      "Do not say that you can't browse the web or access the internet.",
      'If the evidence is incomplete, state the uncertainty briefly and give the best supported answer.',
      'LIVE RESEARCH EVIDENCE (ground your answer strictly in these sources — cite them as [n]):',
    ];
    if (context.researchEvidence.length === 0) {
      lines.push(
        'No reliable search evidence passed relevance validation for this request.',
        'Do not invent facts, dates, issues, or citations when no reliable evidence is available.',
        'Instead, say that this run did not produce reliable web evidence and ask the user to retry or refine the search.',
      );
    }
    for (const [index, item] of context.researchEvidence.entries()) {
      lines.push(`[${String(index + 1)}] ${item.title ?? '(no title)'} — ${item.url}`);
      if (item.snippet.length > 0) {
        lines.push(item.snippet);
      }
    }
    if (context.researchWarnings.length > 0) {
      lines.push('WARNINGS:');
      for (const warning of context.researchWarnings) {
        lines.push(`- ${warning}`);
      }
    }
    return lines.join('\n');
  }

  private truncateToTokenBudget(text: string, tokenBudget: number): string {
    const maxChars = tokenBudget * APPROX_CHARS_PER_TOKEN;
    if (text.length <= maxChars) {
      this.logger.debug(
        `truncateToTokenBudget: text fits within budget (${String(text.length)} <= ${String(maxChars)} chars)`,
      );
      return text;
    }
    const tailChars = Math.max(Math.floor(maxChars * 0.4), Math.min(320, maxChars));
    const headChars = Math.max(maxChars - tailChars - 32, 0);
    this.logger.debug(
      `truncateToTokenBudget: truncating from ${String(text.length)} to ${String(maxChars)} chars (budget=${String(tokenBudget)} tokens)`,
    );
    if (headChars === 0) {
      return text.slice(-maxChars);
    }
    return `${text.slice(0, headChars)}\n\n[...truncated older context...]\n\n${text.slice(-tailChars)}`;
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

  private extractCurrentIntent(messages: ChatMessage[]): string {
    const lastUser = [...messages].reverse().find((msg) => msg.role === 'USER');
    return this.normalizeIntentText(lastUser?.content ?? '');
  }

  private filterThreadMessagesForIntent(
    messages: ChatMessage[],
    currentIntent: string,
  ): ChatMessage[] {
    if (messages.length <= 2) {
      return messages;
    }

    if (this.isLikelyFollowUp(currentIntent)) {
      return messages.slice(-6);
    }

    const lastUser = [...messages].reverse().find((msg) => msg.role === 'USER');
    const selected = messages.filter((msg) => {
      if (msg.id === lastUser?.id) {
        return true;
      }
      if (msg.role === 'SYSTEM') {
        return true;
      }
      if (msg.role === 'ASSISTANT') {
        return false;
      }
      return this.calculateTokenOverlap(msg.content, currentIntent) >= 0.45;
    });

    return selected.length > 0 ? selected.slice(-4) : messages.slice(-1);
  }

  private filterMemoriesForIntent(
    memories: MemoryRecordResponse[],
    currentIntent: string,
  ): MemoryRecordResponse[] {
    if (memories.length === 0) {
      return memories;
    }

    const relevant = memories
      .filter((memory) => {
        if (this.isPreferenceLikeMemory(memory)) {
          return true;
        }
        return this.calculateTokenOverlap(memory.content, currentIntent) >= 0.28;
      })
      .slice(0, 3);

    return relevant;
  }

  private filterWorkspaceCitationsForIntent(
    citations: WorkspaceCitation[],
    currentIntent: string,
  ): WorkspaceCitation[] {
    if (citations.length === 0) {
      return citations;
    }

    return citations
      .filter((citation) => {
        const combined = `${citation.title}\n${citation.snippet ?? ''}`;
        return this.calculateTokenOverlap(combined, currentIntent) >= 0.12;
      })
      .slice(0, 4);
  }

  private isPreferenceLikeMemory(memory: MemoryRecordResponse): boolean {
    const value = `${memory.type} ${memory.content}`.toLowerCase();
    return /(preference|profile|identity|setting|locale|language|name|timezone|style)/.test(value);
  }

  private isLikelyFollowUp(prompt: string): boolean {
    const normalized = prompt.trim().toLowerCase();
    if (normalized.length === 0) {
      return false;
    }

    return /(^|\b)(again|another|one more|continue|expand|shorter|longer|rewrite|rephrase|summarize that|fix that|use that|based on that|from above|previous|earlier|same answer|same style)(\b|$)/.test(
      normalized,
    );
  }

  private calculateTokenOverlap(a: string, b: string): number {
    const aTokens = new Set(this.tokenize(this.normalizeIntentText(a)));
    const bTokens = new Set(this.tokenize(this.normalizeIntentText(b)));
    if (aTokens.size === 0 || bTokens.size === 0) {
      return 0;
    }

    let hits = 0;
    for (const token of aTokens) {
      if (bTokens.has(token)) {
        hits += 1;
      }
    }

    return hits / Math.max(Math.min(aTokens.size, bTokens.size), 1);
  }

  private tokenize(value: string): string[] {
    const ignoredTokens = new Set([
      'associate',
      'senior',
      'lead',
      'principal',
      'engineer',
      'advisor',
      'director',
      'manager',
      'analyst',
      'strategist',
      'consultant',
      'support',
      'backend',
      'frontend',
      'product',
      'customer',
      'security',
      'operations',
      'research',
      'scientist',
      'architect',
      'designer',
      'artist',
      'legal',
      'medical',
      'finance',
      'procurement',
      'executive',
    ]);
    return value
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !ignoredTokens.has(token));
  }

  private normalizeIntentText(value: string): string {
    const trimmed = value.trim();
    const commaIndex = trimmed.indexOf(',');
    if (trimmed.startsWith('As ') && commaIndex > 0) {
      return trimmed.slice(commaIndex + 1).trim();
    }
    return trimmed;
  }

  private shouldSkipExpensiveContext(query: string, fileIds: string[]): boolean {
    if (fileIds.length > 0) {
      return false;
    }

    const prompt = query.trim().toLowerCase();
    if (prompt.length === 0) {
      return true;
    }

    const words = prompt.split(/\s+/).filter((word) => word.length > 0);
    if (words.length <= 3) {
      return true;
    }

    return /^(hi|hello|hey|yo|thanks|thank you|good (morning|afternoon|evening))(?:[!.?]*)$/.test(
      prompt,
    );
  }
}
