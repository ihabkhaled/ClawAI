import { Injectable, Logger } from '@nestjs/common';
import { TokenLedgerContext } from '@claw/shared-types';
import {
  CompareJudgeState,
  ProgressActorType,
  ResearchMode,
  StreamEventType,
} from '../../../common/enums';
import { ChatExecutionManager } from './chat-execution.manager';
import { ContextAssemblyManager } from './context-assembly.manager';
import { JudgeRefereeManager } from './judge-referee.manager';
import { ResearchEnricherManager } from './research-enricher.manager';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { FileDeliveryRecordService } from '../services/file-delivery-record.service';
import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { VISION_CAPABLE_PROVIDERS } from '../constants/file-delivery.constants';
import { type FileDeliveryEntry } from '../types/file-delivery.types';
import { type FileDeliveryRecordInput } from '../types/file-delivery-record.types';
import {
  type ParallelCriticConfig,
  type ParallelJudgeConfig,
  type ParallelModelResponse,
  type ParallelModelTarget,
  type ParallelResearchOptions,
  type ParallelResponse,
} from '../types/parallel.types';
import { type ResearchEnrichResult } from '../types/research-enricher.types';
import {
  type ResearchTranscript,
  type ResearchTranscriptSource,
} from '../types/research-transcript.types';
import { type ThreadSettings } from '../types/execution.types';
import { type AssembledContext } from '../types/context.types';
import { type ChatThread, type Prisma } from '../../../generated/prisma';
import { AppConfig } from '../../../app/config/app.config';
import { type JudgeRefereeResult, type JudgeReviewPayload } from '../types/judge-referee.types';
import { buildFileDeliveryEntries } from '../../../common/utilities';

@Injectable()
export class ParallelExecutionManager {
  private readonly logger = new Logger(ParallelExecutionManager.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly judgeRefereeManager: JudgeRefereeManager,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly fileDeliveryRecordService: FileDeliveryRecordService,
  ) {
    this.timeoutMs = AppConfig.get().OLLAMA_GENERATE_TIMEOUT_MS;
  }

  async executeParallel(
    userId: string,
    threadId: string,
    content: string,
    models: ParallelModelTarget[],
    judgeConfig: ParallelJudgeConfig,
    criticConfig: ParallelCriticConfig,
    fileIds?: string[],
    researchOptions?: ParallelResearchOptions,
  ): Promise<ParallelResponse> {
    this.logger.log(
      `executeParallel: queuing ${String(models.length)} models in thread ${threadId}`,
    );
    this.chatStreamService.emitRequestAccepted(threadId);

    const userMessage = await this.storeUserMessage(threadId, content, judgeConfig, fileIds);

    void this.executeInBackground(
      userId,
      threadId,
      userMessage.id,
      content,
      models,
      judgeConfig,
      criticConfig,
      fileIds,
      researchOptions,
    );

    return {
      messageId: userMessage.id,
      threadId,
      prompt: content,
      responses: [],
      totalLatencyMs: 0,
      completedCount: 0,
      failedCount: 0,
      judgeEnabled: judgeConfig.enabled,
      judgeModel: judgeConfig.model,
    };
  }

  private async executeInBackground(
    userId: string,
    threadId: string,
    parallelGroupId: string,
    userMessageContent: string,
    models: ParallelModelTarget[],
    judgeConfig: ParallelJudgeConfig,
    criticConfig: ParallelCriticConfig,
    fileIds?: string[],
    researchOptions?: ParallelResearchOptions,
  ): Promise<void> {
    try {
      this.chatStreamService.emitProgressStage(threadId, StreamEventType.RESPONSE_STREAMING, {
        label: 'Launching comparison',
        description: `${String(models.length)} models are being executed in parallel.`,
        actorType: ProgressActorType.SYSTEM,
        actorName: 'Parallel compare',
      });
      const { context, threadSettings } = await this.buildContext(userId, threadId, fileIds);
      const { context: enrichedContext, transcript: researchTranscript } =
        await this.applyResearchEnrichment(context, userMessageContent, researchOptions, threadId);
      const responsesRaw = await this.executeAllModels(
        userId,
        models,
        enrichedContext,
        threadSettings,
        judgeConfig,
        criticConfig,
        parallelGroupId,
        threadId,
      );
      // Replay the shared enricher transcript onto every lane response so the
      // assistant message metadata carries it for FE rendering + analytics.
      const responses = this.applyTranscriptToResponses(responsesRaw, researchTranscript);
      await this.storeAssistantMessages(userId, threadId, parallelGroupId, responses);
      const completed = responses.filter((r) => r.status === 'completed').length;
      this.logger.log(
        `executeInBackground: done — ${String(completed)}/${String(responses.length)} completed`,
      );
      this.chatStreamService.emitCompletion(threadId, 'parallel', 'parallel');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`executeInBackground: failed — ${msg}`);
      await this.storeAssistantMessages(userId, threadId, parallelGroupId, [
        {
          ...this.buildFailedResponse('system', 'parallel', `Parallel execution failed: ${msg}`),
          judgeEnabled: judgeConfig.enabled,
          judgeModel: judgeConfig.model,
          judgeDisplayName: judgeConfig.model,
          judgeState: judgeConfig.enabled ? CompareJudgeState.SKIPPED : CompareJudgeState.NONE,
          judgeErrorState: judgeConfig.enabled ? CompareJudgeState.SKIPPED : null,
          judgeDialogAvailable: false,
          judgeReview: null,
        },
      ]);
      this.chatStreamService.emitError(threadId, `Parallel execution failed: ${msg}`);
    }
  }

  private async storeUserMessage(
    threadId: string,
    content: string,
    judgeConfig: ParallelJudgeConfig,
    fileIds?: string[],
  ): Promise<{ id: string }> {
    const metadata = {
      ...(fileIds && fileIds.length > 0 ? { fileIds } : {}),
      compareJudgeEnabled: judgeConfig.enabled,
      compareJudgeModel: judgeConfig.model,
    };

    return this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  }

  private async buildContext(
    userId: string,
    threadId: string,
    fileIds?: string[],
  ): Promise<{ context: AssembledContext; threadSettings: ThreadSettings | undefined }> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    const threadSettings = this.extractThreadSettings(thread);
    const threadMessages = await this.chatMessagesRepository.findRecentByThreadId(threadId, 20);
    const chronologicalMessages = [...threadMessages].reverse();

    const context = await this.contextAssemblyManager.assemble(
      userId,
      chronologicalMessages,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds,
    );

    return { context, threadSettings };
  }

  // Compare-mode research enricher. NONE / undefined / empty-token short-
  // circuits to the original context so v1 callers keep working. On any
  // enricher error we log a warning and proceed without evidence — research
  // must NEVER block the parallel run.
  //
  // Dedupe — the enricher is invoked ONCE here, BEFORE the parallel lane
  // fan-out (`executeAllModels`). The resulting transcript is replayed onto
  // every assistant message via `applyTranscriptToResponses`, so all N lanes
  // share the exact same evidence and the user sees the same "Used N web
  // sources" badge whichever lane they look at. We never re-invoke the
  // enricher inside a lane.
  private async applyResearchEnrichment(
    context: AssembledContext,
    userMessageContent: string,
    options: ParallelResearchOptions | undefined,
    threadId: string,
  ): Promise<{ context: AssembledContext; transcript: ResearchTranscript | null }> {
    if (options === undefined) {
      return { context, transcript: null };
    }
    const mode = options.mode ?? ResearchMode.NONE;
    if (mode === ResearchMode.NONE) {
      return { context, transcript: null };
    }
    const trimmedQuery = options.query?.trim() ?? '';
    const finalQuery = trimmedQuery.length > 0 ? trimmedQuery : userMessageContent;
    if (options.userToken.length === 0) {
      this.logger.warn(
        `applyResearchEnrichment: mode=${mode} but no bearer token — skipping enrichment`,
      );
      return {
        context,
        transcript: this.buildSkippedTranscript(mode, finalQuery, 'research.missingBearerToken'),
      };
    }
    const startedAt = Date.now();
    try {
      const result = await this.researchEnricherManager.enrich({
        mode,
        query: finalQuery,
        userAuthHeader: `Bearer ${options.userToken}`,
        threadId,
      });
      const transcript = this.buildTranscriptFromEnricher(
        mode,
        finalQuery,
        result,
        Math.max(1, Date.now() - startedAt),
      );
      return { context: this.injectResearchIntoContext(context, result), transcript };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.warn(`applyResearchEnrichment: failed mode=${mode} — ${message}`);
      this.chatStreamService.emitError(threadId, `Research enrichment failed: ${message}`);
      return {
        context,
        transcript: this.buildSkippedTranscript(
          mode,
          finalQuery,
          `research.enrichmentFailed:${message}`,
          Math.max(1, Date.now() - startedAt),
        ),
      };
    }
  }

  private injectResearchIntoContext(
    context: AssembledContext,
    result: ResearchEnrichResult,
  ): AssembledContext {
    if (result.evidence.length === 0) {
      return context;
    }
    const trimmedPrompt = (context.systemPrompt ?? '').trim();
    const nextSystemPrompt =
      trimmedPrompt.length > 0 ? `${result.evidence}\n\n${trimmedPrompt}` : result.evidence;
    return { ...context, systemPrompt: nextSystemPrompt };
  }

  private buildTranscriptFromEnricher(
    mode: ResearchMode,
    query: string,
    result: ResearchEnrichResult,
    latencyMs: number,
  ): ResearchTranscript {
    const sources: ResearchTranscriptSource[] = result.sources.map((source) => ({
      title: source.title,
      url: source.url,
      ...(source.snippet !== undefined ? { snippet: source.snippet } : {}),
      ...(source.extracted !== undefined ? { extracted: source.extracted } : {}),
    }));
    return {
      mode,
      query,
      sources,
      latencyMs,
      warnings: [],
      searchRequestCount: result.searchRequestCount,
      fetchRequestCount: result.fetchRequestCount,
    };
  }

  private buildSkippedTranscript(
    mode: ResearchMode,
    query: string,
    warning: string,
    latencyMs = 0,
  ): ResearchTranscript {
    return {
      mode,
      query,
      sources: [],
      latencyMs,
      warnings: [warning],
      searchRequestCount: 0,
      fetchRequestCount: 0,
    };
  }

  private applyTranscriptToResponses(
    responses: ParallelModelResponse[],
    transcript: ResearchTranscript | null,
  ): ParallelModelResponse[] {
    if (transcript === null) {
      return responses;
    }
    return responses.map((response) => ({ ...response, researchTranscript: transcript }));
  }

  // Extracted so buildParallelMessageMetadata stays under the complexity 15 cap.
  // Shared enricher transcript — identical across all lanes by construction
  // (dedupe: enricher runs ONCE before fan-out, not per lane). Persisted on
  // every assistant message so the FE renders the same "Used N web sources"
  // badge whichever lane the user is viewing.
  private buildResearchTranscriptMetaPart(
    response: ParallelModelResponse,
  ): Record<string, unknown> {
    if (response.researchTranscript === undefined) {
      return {};
    }
    return { researchTranscript: response.researchTranscript };
  }

  private async executeAllModels(
    userId: string,
    models: ParallelModelTarget[],
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    judgeConfig: ParallelJudgeConfig,
    criticConfig: ParallelCriticConfig,
    parallelGroupId: string,
    threadId: string,
  ): Promise<ParallelModelResponse[]> {
    const promises = models.map((target) =>
      this.executeWithTimeout(target, context, threadSettings, parallelGroupId, threadId),
    );

    const settled = await Promise.allSettled(promises);

    const baseResponses = settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      const target = models.at(index);
      return this.buildFailedResponse(
        target?.provider ?? 'unknown',
        target?.model ?? 'unknown',
        result.reason instanceof Error ? result.reason.message : 'Promise rejected',
      );
    });

    return this.applyJudgeToResponses(
      userId,
      baseResponses,
      context,
      threadSettings,
      judgeConfig,
      criticConfig,
      parallelGroupId,
      threadId,
    );
  }

  private async applyJudgeToResponses(
    userId: string,
    responses: ParallelModelResponse[],
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    judgeConfig: ParallelJudgeConfig,
    criticConfig: ParallelCriticConfig,
    parallelGroupId: string,
    threadId: string,
  ): Promise<ParallelModelResponse[]> {
    if (!judgeConfig.enabled) {
      return responses.map((response) => ({
        ...response,
        judgeEnabled: false,
        judgeModel: null,
        judgeDisplayName: null,
        judgeState: CompareJudgeState.NONE,
        judgeErrorState: null,
        judgeDialogAvailable: false,
        judgeReview: null,
      }));
    }

    const judgeThreadSettings = this.buildJudgeThreadSettings(threadSettings, judgeConfig);
    const judgedResponses = await Promise.all(
      responses.map(async (response) => {
        if (response.status !== 'completed') {
          return {
            ...response,
            judgeEnabled: true,
            judgeModel: judgeConfig.model,
            judgeDisplayName: judgeConfig.model,
            judgeState: CompareJudgeState.SKIPPED,
            judgeErrorState: CompareJudgeState.SKIPPED,
            judgeDialogAvailable: false,
            judgeReview: null,
          };
        }

        return this.judgeSingleResponse(
          userId,
          response,
          context,
          judgeThreadSettings,
          parallelGroupId,
          threadId,
          judgeConfig,
          criticConfig,
        );
      }),
    );

    return judgedResponses;
  }

  private async judgeSingleResponse(
    userId: string,
    response: ParallelModelResponse,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    parallelGroupId: string,
    threadId: string,
    judgeConfig: ParallelJudgeConfig,
    criticConfig: ParallelCriticConfig,
  ): Promise<ParallelModelResponse> {
    const judgeModel = judgeConfig.model ?? null;
    this.chatStreamService.emitJudgeEvaluating(
      threadId,
      `${response.provider}/${response.model}`,
      judgeModel ?? 'AUTO',
    );

    try {
      const judgeResult = await this.judgeRefereeManager.evaluate(
        {
          content: response.content,
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
          usedFallback: false,
          inputTokens: response.inputTokens ?? undefined,
          outputTokens: response.outputTokens ?? undefined,
        },
        context,
        {
          enabled: true,
          category: undefined,
          routingMode: 'MANUAL_MODEL',
          isLocalOnly: false,
          criticEnabled: criticConfig.enabled,
          criticModel: criticConfig.model,
          // Threaded so JudgeRefereeManager can run the defense-in-depth
          // assertCanUseCritic gate right before the critic LLM call.
          userId,
        },
        {
          messageId: parallelGroupId,
          threadId,
          selectedProvider: response.provider,
          selectedModel: response.model,
          routingMode: 'MANUAL_MODEL',
          timestamp: new Date().toISOString(),
          judgeEnabled: true,
        },
        threadSettings,
      );
      return this.buildJudgedResponse(response, judgeResult, judgeConfig);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown judge failure';
      return {
        ...response,
        judgeEnabled: true,
        judgeModel,
        judgeDisplayName: judgeModel,
        judgeState: CompareJudgeState.FAILED,
        judgeErrorState: CompareJudgeState.FAILED,
        judgeDialogAvailable: false,
        judgeReview: null,
        errorMessage: response.errorMessage ?? message,
      };
    }
  }

  private buildJudgedResponse(
    response: ParallelModelResponse,
    judgeResult: JudgeRefereeResult,
    judgeConfig: ParallelJudgeConfig,
  ): ParallelModelResponse {
    const judgeReview = this.judgeRefereeManager.buildMetadata(judgeResult).judgeReview;
    const state = this.resolveJudgeState(judgeResult, judgeReview, response.status);
    const judgeErrorState = this.resolveJudgeErrorState(judgeResult.judgeVerdict.fallbackState);
    const finalContent = this.resolveFinalContent(state, judgeResult, response);

    return {
      ...response,
      content: finalContent,
      judgeEnabled: true,
      judgeModel: judgeConfig.model,
      judgeDisplayName: judgeConfig.model,
      judgeState: state,
      judgeErrorState,
      judgeDialogAvailable: judgeResult.judgeVerdict.wasFallback !== true,
      judgeReview,
      // Feature 1/2 — surface judge/critic token usage for the compare message.
      judgeInputTokens: judgeResult.tokenUsage?.inputTokens,
      judgeOutputTokens: judgeResult.tokenUsage?.outputTokens,
      judgeTokenEstimated: judgeResult.tokenUsage?.estimated,
      judgeTokenSource: judgeResult.tokenUsage?.source,
    };
  }

  private resolveFinalContent(
    state: CompareJudgeState,
    judgeResult: JudgeRefereeResult,
    response: ParallelModelResponse,
  ): string {
    if (state === CompareJudgeState.ESCALATED) {
      return judgeResult.escalatedResponse?.content ?? response.content;
    }
    if (state === CompareJudgeState.REVISED) {
      return judgeResult.revisedResponse?.content ?? response.content;
    }
    return response.content;
  }

  private resolveJudgeState(
    judgeResult: JudgeRefereeResult,
    judgeReview: JudgeReviewPayload,
    responseStatus: ParallelModelResponse['status'],
  ): CompareJudgeState {
    if (responseStatus !== 'completed') {
      return CompareJudgeState.SKIPPED;
    }

    if (judgeResult.judgeVerdict.wasFallback === true) {
      return judgeResult.judgeVerdict.fallbackState === 'failed'
        ? CompareJudgeState.FAILED
        : CompareJudgeState.UNAVAILABLE;
    }

    switch (judgeReview.judgeDecision) {
      case 'ACCEPT':
        return CompareJudgeState.VERIFIED;
      case 'REVISE':
        return CompareJudgeState.REVISED;
      case 'ESCALATE':
        return CompareJudgeState.ESCALATED;
      default:
        return CompareJudgeState.VERIFIED;
    }
  }

  private resolveJudgeErrorState(
    fallbackState: JudgeRefereeResult['judgeVerdict']['fallbackState'],
  ): CompareJudgeState | null {
    if (fallbackState === 'failed') {
      return CompareJudgeState.FAILED;
    }

    if (fallbackState === 'unavailable') {
      return CompareJudgeState.UNAVAILABLE;
    }

    return null;
  }

  private buildJudgeThreadSettings(
    threadSettings: ThreadSettings | undefined,
    judgeConfig: ParallelJudgeConfig,
  ): ThreadSettings | undefined {
    if (!judgeConfig.enabled) {
      return threadSettings;
    }

    return {
      ...threadSettings,
      judgeModel: judgeConfig.model,
    };
  }

  private async executeWithTimeout(
    target: ParallelModelTarget,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    parallelGroupId: string,
    threadId: string,
  ): Promise<ParallelModelResponse> {
    const modelPromise = this.executeSingleModel(
      target,
      context,
      threadSettings,
      parallelGroupId,
      threadId,
    );
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`Model execution timeout after ${String(this.timeoutMs)}ms`)),
        this.timeoutMs,
      );
    });

    try {
      return await Promise.race([modelPromise, timeoutPromise]);
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && error.message.includes('Model execution timeout');

      if (isTimeout) {
        this.logger.warn(
          `executeWithTimeout: ${target.provider}/${target.model} timed out after ${String(this.timeoutMs)}ms`,
        );
        return this.buildTimedOutResponse(target.provider, target.model);
      }

      throw error;
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async executeSingleModel(
    target: ParallelModelTarget,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    parallelGroupId: string,
    threadId: string,
  ): Promise<ParallelModelResponse> {
    const modelStart = Date.now();
    const laneId = `${parallelGroupId}:${target.provider}:${target.model}`;
    this.logger.debug(`executeSingleModel: streaming lane ${laneId}`);

    try {
      // Each compared model streams on its own lane so the UI can show
      // independent live progress per model.
      const llmResponse = await this.chatExecutionManager.streamModelForLane(
        target.provider,
        target.model,
        context,
        modelStart,
        threadSettings,
        { threadId, messageId: laneId, laneId, parallelGroupId },
      );

      // TODO(Slice B follow-up): pass authoritative ModelMetadata.supportsVision
      // sourced from the connector-service catalog so the delivery classifier
      // can override the provider-level VISION_CAPABLE_PROVIDERS heuristic on a
      // per-model basis. For now we pass `undefined` so the heuristic remains
      // in force; the API is ready when the data source lands.
      const attachmentDelivery = buildFileDeliveryEntries(
        context.fileContents,
        llmResponse.provider,
        llmResponse.model,
      );

      return {
        provider: llmResponse.provider,
        model: llmResponse.model,
        content: llmResponse.content,
        latencyMs: llmResponse.latencyMs,
        inputTokens: llmResponse.inputTokens ?? null,
        outputTokens: llmResponse.outputTokens ?? null,
        tokenEstimated: llmResponse.tokenEstimated,
        tokenSource: llmResponse.tokenSource,
        tokenContext: llmResponse.tokenContext ?? TokenLedgerContext.COMPARE,
        status: 'completed',
        errorMessage: null,
        attachmentDelivery,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `executeSingleModel: ${target.provider}/${target.model} failed — ${errorMessage}`,
      );

      const failed = this.buildFailedResponse(
        target.provider,
        target.model,
        errorMessage,
        Date.now() - modelStart,
      );
      // Still emit a delivery summary so the FE knows which files would
      // have reached this lane, marked against the requested target.
      // TODO(Slice B follow-up): thread ModelMetadata once available; see note
      // on the success path above.
      failed.attachmentDelivery = buildFileDeliveryEntries(
        context.fileContents,
        target.provider,
        target.model,
      );
      return failed;
    }
  }

  private async storeAssistantMessages(
    userId: string,
    threadId: string,
    parallelGroupId: string,
    responses: ParallelModelResponse[],
  ): Promise<void> {
    const storePromises = responses.map((response) =>
      this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: this.buildParallelMessageContent(response),
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens ?? undefined,
        outputTokens: response.outputTokens ?? undefined,
        latencyMs: response.latencyMs,
        usedFallback: false,
        metadata: this.buildParallelMessageMetadata(
          response,
          parallelGroupId,
        ) as Prisma.InputJsonValue,
      }),
    );
    const storedMessages = await Promise.all(storePromises);
    // Dual-write window (2 releases): legacy metadata.fileDelivery is
    // populated above; here we ALSO persist a normalized row per (message,
    // file, provider, model) so the new GET /chat-messages/:id/file-delivery
    // endpoint and downstream consumers can read structured data.
    await this.dualWriteFileDeliveryRecords(userId, threadId, storedMessages, responses);
  }

  private async dualWriteFileDeliveryRecords(
    userId: string,
    threadId: string,
    storedMessages: { id: string }[],
    responses: ParallelModelResponse[],
  ): Promise<void> {
    const records: FileDeliveryRecordInput[] = [];
    for (const [index, response] of responses.entries()) {
      const message = storedMessages.at(index);
      if (!message) {
        continue;
      }
      const entries = response.attachmentDelivery ?? [];
      for (const entry of entries) {
        records.push(this.buildDeliveryRecordInput(message.id, threadId, userId, entry));
      }
    }
    if (records.length === 0) {
      return;
    }
    try {
      await this.fileDeliveryRecordService.recordDeliveries(records);
    } catch (error) {
      this.logger.warn(
        `dualWriteFileDeliveryRecords: failed — ${(error as Error).message}; metadata.fileDelivery still populated`,
      );
    }
  }

  private buildDeliveryRecordInput(
    messageId: string,
    threadId: string,
    userId: string,
    entry: FileDeliveryEntry,
  ): FileDeliveryRecordInput {
    return {
      messageId,
      threadId,
      userId,
      fileId: entry.fileId,
      filename: entry.filename,
      mimeType: entry.mimeType,
      provider: entry.provider,
      model: entry.model,
      mode: entry.mode,
      supportsVision: this.resolveSupportsVisionForRecord(entry),
    };
  }

  private resolveSupportsVisionForRecord(entry: FileDeliveryEntry): boolean {
    if (entry.mode === FileDeliveryMode.NATIVE_IMAGE) {
      return true;
    }
    if (entry.mode === FileDeliveryMode.OMITTED_NO_VISION) {
      return false;
    }
    const provider = entry.provider;
    return (
      VISION_CAPABLE_PROVIDERS.has(provider) || VISION_CAPABLE_PROVIDERS.has(provider.toUpperCase())
    );
  }

  private buildParallelMessageContent(response: ParallelModelResponse): string {
    return response.status === 'completed'
      ? response.content
      : `Error: ${response.errorMessage ?? 'Unknown error'}`;
  }

  private buildParallelMessageMetadata(
    response: ParallelModelResponse,
    parallelGroupId: string,
  ): Record<string, unknown> {
    return {
      parallelExecution: true,
      parallelGroupId,
      status: response.status,
      // Feature 2 — persist token usage transparency on each compare message.
      ...(response.tokenEstimated === undefined ? {} : { tokenEstimated: response.tokenEstimated }),
      ...(response.tokenSource === undefined ? {} : { tokenSource: response.tokenSource }),
      tokenContext: response.tokenContext ?? TokenLedgerContext.COMPARE,
      judgeEnabled: response.judgeEnabled === true,
      judgeModel: response.judgeModel ?? null,
      judgeDisplayName: response.judgeDisplayName ?? response.judgeModel ?? null,
      judgeState: response.judgeState ?? CompareJudgeState.NONE,
      judgeErrorState: response.judgeErrorState ?? null,
      judgeDialogAvailable: response.judgeDialogAvailable === true,
      ...(response.judgeReview ? { judgeReview: response.judgeReview } : {}),
      ...(response.judgeInputTokens === undefined
        ? {}
        : { judgeInputTokens: response.judgeInputTokens }),
      ...(response.judgeOutputTokens === undefined
        ? {}
        : { judgeOutputTokens: response.judgeOutputTokens }),
      ...(response.judgeTokenEstimated === undefined
        ? {}
        : { judgeTokenEstimated: response.judgeTokenEstimated }),
      ...(response.judgeTokenSource === undefined
        ? {}
        : { judgeTokenSource: response.judgeTokenSource }),
      ...this.buildResearchTranscriptMetaPart(response),
      // Slice A — per-lane attachment delivery telemetry. Mirrored to the FE
      // via ParallelModelResponse.attachmentDelivery so it can render which
      // files reached which lane, and consumed by the judge prompt builder.
      ...(response.attachmentDelivery && response.attachmentDelivery.length > 0
        ? { fileDelivery: response.attachmentDelivery }
        : {}),
      routeRoadmap: this.buildParallelRouteRoadmap(response),
      progressSummary: this.buildParallelProgressSummary(response),
    };
  }

  private buildParallelRouteRoadmap(response: ParallelModelResponse): Record<string, unknown> {
    return {
      routingMode: 'MANUAL_MODEL',
      routerModel: null,
      selectedProvider: response.provider,
      selectedModel: response.model,
      finalProvider: response.provider,
      finalModel: response.model,
      finalDisplayName: response.model,
      steps: [
        {
          stage: 'tool',
          provider: 'parallel',
          model: 'parallel',
          displayName: 'Parallel compare',
          description: `Model finished with status ${response.status}`,
        },
        {
          stage: 'execution',
          provider: response.provider,
          model: response.model,
          displayName: response.model,
        },
      ],
    };
  }

  private buildParallelProgressSummary(
    response: ParallelModelResponse,
  ): Array<Record<string, unknown>> {
    const completed = response.status === 'completed';
    return [
      {
        label: 'Request accepted',
        description: 'Parallel comparison was queued.',
        actorType: 'request',
        actorName: 'Claw',
        status: 'completed',
      },
      {
        label: 'Launching comparison',
        description: 'The model finished its parallel run.',
        actorType: 'system',
        actorName: 'Parallel compare',
        status: completed ? 'completed' : 'error',
      },
      {
        label: completed ? 'Response complete' : 'Response failed',
        description: completed
          ? 'Parallel response saved to the thread.'
          : (response.errorMessage ?? 'Parallel execution failed'),
        actorType: 'model',
        actorName: `${response.provider} / ${response.model}`,
        status: completed ? 'completed' : 'error',
      },
    ];
  }

  private buildTimedOutResponse(provider: string, model: string): ParallelModelResponse {
    return {
      provider,
      model,
      content: '',
      latencyMs: this.timeoutMs,
      inputTokens: null,
      outputTokens: null,
      status: 'timeout',
      errorMessage: `Model execution timed out after ${String(this.timeoutMs)}ms`,
    };
  }

  private buildFailedResponse(
    provider: string,
    model: string,
    errorMessage: string,
    latencyMs?: number,
  ): ParallelModelResponse {
    return {
      provider,
      model,
      content: '',
      latencyMs: latencyMs ?? 0,
      inputTokens: null,
      outputTokens: null,
      status: 'failed',
      errorMessage,
    };
  }

  private extractThreadSettings(thread: ChatThread | null): ThreadSettings | undefined {
    if (!thread) {
      return undefined;
    }
    return {
      systemPrompt: thread.systemPrompt,
      temperature: thread.temperature,
      maxTokens: thread.maxTokens,
    };
  }
}
