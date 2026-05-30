import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  LocalModelRole,
  TokenLedgerContext,
  type TokenUsage,
  TokenUsageSource,
} from '@claw/shared-types';
import { extractOllamaUsage, extractOpenAiCompatibleUsage } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest, recordGet } from '../../../common/utilities';
import { BusinessException } from '../../../common/errors';
import {
  FILE_GENERATION_PROVIDER,
  IMAGE_PROVIDER_PREFIX,
  LLAMACPP_CONNECTOR_PROVIDER,
  LLAMACPP_PROVIDER,
  LOCAL_ONLY_ROUTING_MODES,
  OLLAMA_CONNECTOR_PROVIDER,
  OLLAMA_PROVIDER,
  PROVIDER_BASE_URLS,
} from '../../../common/constants';
import {
  type ConnectorConfigResponse,
  type FileGenerateResponse,
  type ImageGenerateResponse,
  type LlmResponse,
  type MessageRoutedData,
  type OllamaChatRequest,
  type OllamaChatResponse,
  type OllamaGenerateRequest,
  type OllamaGenerateResponse,
  type OpenAiChatRequest,
  type OpenAiChatResponse,
  type ThreadSettings,
} from '../types/execution.types';
import type {
  CandidateOutcome,
  ExecutionMetadata,
  RunCandidateArgs,
} from '../types/execution-outcome.types';
import type { AttemptRecord } from '../types/fallback-executor.types';
import type { JudgeRefereeConfig, JudgeRefereeResult } from '../types/judge-referee.types';
import type { InternalGenerateResponse } from '../types/internal-generate.types';
import { type AssembledContext } from '../types/context.types';
import { ContextAssemblyManager } from './context-assembly.manager';
import { QualityCheckManager } from './quality-check.manager';
import { JudgeRefereeManager } from './judge-referee.manager';
import { SearchFirstManager } from './search-first.manager';
import { WORKFLOW_KIND_SEARCH_FIRST } from '../constants/search-first.constants';
import type { SearchFirstOutcome } from '../types/search-first.types';
import { ChatStreamService } from '../services/chat-stream.service';
import { StreamCancellationService } from '../services/stream-cancellation.service';
import { ProviderStreamExecutor } from './provider-stream-executor.manager';
import { AiStreamProtocol } from '../../../common/enums';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';
import { transformOpenAiMessagesToOllama } from '../utilities/ollama-message-shape.utility';
import type { StreamContext, StreamExecutionInput } from '../types/stream-execution.types';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import { AccessControlService } from '../services/access-control.service';
import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  FAST_PATH_COMPLEXITY_PATTERN,
  FAST_PATH_CONTEXT_MAX_CITATIONS,
  FAST_PATH_CONTEXT_MAX_MEMORIES,
  FAST_PATH_CONTEXT_MAX_MESSAGES,
  FAST_PATH_CONTEXT_TOKEN_BUDGET,
  FAST_PATH_MAX_NEWLINES,
  FAST_PATH_MAX_OUTPUT_TOKENS,
  FAST_PATH_MAX_PROMPT_CHARS,
  FAST_PATH_MAX_PROMPT_WORDS,
  FAST_PATH_MIN_RESPONSE_CHARS,
  FAST_PATH_OPERATIONAL_PREFIX_PATTERN,
  FAST_PATH_RESPONSE_CONSTRAINT,
  FAST_PATH_TARGET_LATENCY_MS,
  HARD_MAX_OUTPUT_TOKENS,
  MIN_OUTPUT_TOKENS,
  STANDARD_TARGET_LATENCY_MS,
} from '../constants/execution-fast-path.constants';
import type { ExecutionOptions } from '../types/execution-options.types';

@Injectable()
export class ChatExecutionManager implements OnModuleInit {
  private readonly logger = new Logger(ChatExecutionManager.name);

  constructor(
    private readonly contextAssembly: ContextAssemblyManager,
    private readonly qualityCheckManager: QualityCheckManager,
    private readonly judgeRefereeManager: JudgeRefereeManager,
    private readonly chatStreamService: ChatStreamService,
    private readonly searchFirstManager: SearchFirstManager,
    private readonly accessControlService: AccessControlService,
    private readonly localModelSelection?: LocalModelSelectionService,
    private readonly providerStreamExecutor?: ProviderStreamExecutor,
    private readonly streamCancellation?: StreamCancellationService,
  ) {}

  onModuleInit(): void {
    this.judgeRefereeManager.setExecutionManager(this);
  }

  async execute(
    payload: MessageRoutedData,
    context: AssembledContext,
    threadSettings?: ThreadSettings,
  ): Promise<LlmResponse> {
    this.logger.log(
      `execute: starting for message ${payload.messageId} with provider=${payload.selectedProvider} model=${payload.selectedModel}`,
    );
    if (payload.routingMode === 'AUTO') {
      this.chatStreamService.emitRouterStarted(payload.threadId, payload.routerModel);
    }
    const startTime = Date.now();
    const candidates = this.buildCandidateChain(payload, payload.routingMode);
    const userPrompt = this.extractUserPrompt(context);
    const executionOptions = this.resolveExecutionOptions(payload, userPrompt, threadSettings);
    const baseExecutionContext = this.buildExecutionContext(
      context,
      executionOptions.fastPathEnabled,
    );
    const { executionContext, searchOutcome } = await this.maybeRunSearchFirst(
      payload,
      baseExecutionContext,
      userPrompt,
    );
    this.logger.debug(`execute: built candidate chain with ${String(candidates.length)} providers`);
    this.logger.debug(
      `execute: options fastPath=${String(executionOptions.fastPathEnabled)} maxOutputTokens=${String(executionOptions.maxOutputTokens)}`,
    );

    let lastError: unknown = null;
    let reRouteAttempt = 0;
    let reRouteReasons: string[] = [];
    // Phase 5 — collect per-attempt observability so the FE developer
    // drawer can render "Attempt 1: OpenAI/gpt-4o failed (timeout, 8.1s)
    // → Attempt 2: Anthropic/claude-sonnet-4 succeeded (2.4s, q=0.92)".
    const attempts: AttemptRecord[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates.at(i);
      if (!candidate) {
        continue;
      }
      this.logger.debug(
        `execute: trying candidate ${String(i + 1)}/${String(candidates.length)} - ${candidate.provider}/${candidate.model}`,
      );
      const attemptStartedAt = new Date().toISOString();
      const attemptStartMs = Date.now();
      const outcome = await this.runCandidate({
        candidate,
        candidateIndex: i,
        candidates,
        payload,
        context,
        executionContext,
        executionOptions,
        threadSettings,
        startTime,
        userPrompt,
        reRouteAttempt,
        reRouteReasons,
      });
      attempts.push(
        this.buildAttemptRecord(candidate, i, attemptStartedAt, attemptStartMs, outcome),
      );
      if (outcome.kind === 'success') {
        return this.stampWorkflowMetadata(
          { ...outcome.response, attempts },
          payload,
          searchOutcome,
        );
      }
      if (outcome.kind === 'reRoute') {
        reRouteReasons = [...reRouteReasons, ...outcome.reasons];
        reRouteAttempt++;
        continue;
      }
      lastError = outcome.error;
    }

    return this.failExecution(payload, lastError, attempts);
  }

  // Phase 5 — converts the existing CandidateOutcome union into the
  // shared AttemptRecord shape so the FE drawer + (eventually) the
  // RoutingDecision row can render a uniform per-attempt log.
  private buildAttemptRecord(
    candidate: { provider: string; model: string },
    index: number,
    startedAt: string,
    startMs: number,
    outcome: CandidateOutcome,
  ): AttemptRecord {
    const durationMs = Date.now() - startMs;
    if (outcome.kind === 'success') {
      return {
        attemptIndex: index,
        provider: candidate.provider,
        model: candidate.model,
        startedAt,
        durationMs,
        status: 'SUCCESS',
        qualityScore: null,
      };
    }
    if (outcome.kind === 'reRoute') {
      return {
        attemptIndex: index,
        provider: candidate.provider,
        model: candidate.model,
        startedAt,
        durationMs,
        status: 'RE_ROUTE',
        qualityReasons: outcome.reasons,
        qualityScore: null,
      };
    }
    return {
      attemptIndex: index,
      provider: candidate.provider,
      model: candidate.model,
      startedAt,
      durationMs,
      status: 'FAILURE',
      qualityScore: null,
      errorMessage: (outcome.error as Error | undefined)?.message ?? null,
    };
  }

  // Phase 6 — stamps workflow + search-first telemetry onto every
  // successful response so the FE can show the workflow badge and the
  // SEARCH_FIRST outcome banner without re-querying anything.
  private stampWorkflowMetadata(
    response: LlmResponse,
    payload: MessageRoutedData,
    searchOutcome: SearchFirstOutcome | null,
  ): LlmResponse {
    return {
      ...response,
      workflow: payload.selectedWorkflow ?? null,
      workflowReason: payload.workflowReason ?? null,
      ...(searchOutcome === null
        ? {}
        : {
            searchFirst: {
              applied: searchOutcome.applied,
              resultCount: searchOutcome.results.length,
              runId: searchOutcome.runId,
              warning: searchOutcome.warning,
            },
          }),
    };
  }

  private async runCandidate(args: RunCandidateArgs): Promise<CandidateOutcome> {
    try {
      return await this.runCandidateInner(args);
    } catch (error: unknown) {
      this.emitCandidateFailure(
        error,
        args.candidate,
        args.candidateIndex,
        args.candidates,
        args.payload,
      );
      return { kind: 'failure', error };
    }
  }

  private async runCandidateInner(args: RunCandidateArgs): Promise<CandidateOutcome> {
    const response = await this.invokeProviderWithProgress(
      args.candidate,
      args.executionContext,
      args.startTime,
      args.candidateIndex,
      args.threadSettings,
      args.payload,
      args.executionOptions,
    );
    const escalation = await this.maybeEscalateFastPath(
      response,
      args.candidate,
      args.context,
      args.payload,
      args.executionOptions,
      args.threadSettings,
      args.startTime,
      args.candidateIndex,
    );
    const finalProviderResponse = escalation.response;
    const fastPathEscalated = escalation.escalated;

    if (this.isGenerationResponse(finalProviderResponse)) {
      return {
        kind: 'success',
        response: {
          ...finalProviderResponse,
          ...this.buildExecutionMetadata(args.executionOptions, fastPathEscalated),
        },
      };
    }

    const qualityOutcome = this.evaluateQuality({
      response,
      finalProviderResponse,
      candidate: args.candidate,
      candidates: args.candidates,
      candidateIndex: args.candidateIndex,
      payload: args.payload,
      context: args.context,
      executionOptions: args.executionOptions,
      threadSettings: args.threadSettings,
      userPrompt: args.userPrompt,
      reRouteAttempt: args.reRouteAttempt,
      reRouteReasons: args.reRouteReasons,
    });
    if (qualityOutcome.kind === 'reRoute') {
      return qualityOutcome;
    }
    return this.finalizeWithJudge(
      qualityOutcome.response,
      args.context,
      args.payload,
      args.threadSettings,
      args.executionOptions,
      fastPathEscalated,
    );
  }

  private async invokeProviderWithProgress(
    candidate: { provider: string; model: string },
    executionContext: AssembledContext,
    startTime: number,
    candidateIndex: number,
    threadSettings: ThreadSettings | undefined,
    payload: MessageRoutedData,
    executionOptions: ExecutionOptions,
  ): Promise<LlmResponse> {
    this.chatStreamService.emitProviderSelected(
      payload.threadId,
      candidate.provider,
      candidate.model,
    );

    // Rich streaming path: when the executor + cancellation registry are wired
    // and the provider is streamable, emit live content/reasoning/metric deltas
    // instead of the legacy fake "still working" heartbeat. Falls back to the
    // buffered path for non-streamable providers (image/file-gen) or in tests.
    const streamContext: StreamContext = {
      threadId: payload.threadId,
      messageId: payload.messageId,
    };
    if (this.canStreamCandidate(candidate.provider)) {
      return this.streamCandidate(
        candidate,
        executionContext,
        startTime,
        candidateIndex > 0,
        threadSettings,
        executionOptions,
        streamContext,
      );
    }

    this.chatStreamService.emitResponseStreaming(
      payload.threadId,
      candidate.provider,
      candidate.model,
    );
    const stopProgressHeartbeat = this.chatStreamService.startResponseProgressHeartbeat(
      payload.threadId,
      candidate.provider,
      candidate.model,
    );
    try {
      return await this.callProvider(
        candidate.provider,
        candidate.model,
        executionContext,
        startTime,
        candidateIndex > 0,
        threadSettings,
        payload.routingMode,
        executionOptions,
      );
    } finally {
      stopProgressHeartbeat();
    }
  }

  // True only when the rich streaming dependencies are present AND the provider
  // produces text token streams. Image/file-generation providers never stream.
  private canStreamCandidate(provider: string): boolean {
    if (this.providerStreamExecutor === undefined || this.streamCancellation === undefined) {
      return false;
    }
    if (provider === FILE_GENERATION_PROVIDER || provider.startsWith(IMAGE_PROVIDER_PREFIX)) {
      return false;
    }
    return true;
  }

  // Dispatches a streamable candidate to the right transport: native SSE for
  // cloud + llama.cpp, native NDJSON for the Ollama connector, and a simulated
  // chunked replay for local Ollama (ollama-service has no streaming endpoint).
  // Public entry used by the parallel/compare flow to stream ONE model on its
  // own lane. Falls back to the buffered call for non-streamable providers.
  async streamModelForLane(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    threadSettings: ThreadSettings | undefined,
    streamContext: StreamContext,
  ): Promise<LlmResponse> {
    if (!this.canStreamCandidate(provider)) {
      return this.callProvider(provider, model, context, startTime, false, threadSettings);
    }
    return this.streamCandidate(
      { provider, model },
      context,
      startTime,
      false,
      threadSettings,
      undefined,
      streamContext,
    );
  }

  private async streamCandidate(
    candidate: { provider: string; model: string },
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    streamContext: StreamContext,
  ): Promise<LlmResponse> {
    if (candidate.provider === OLLAMA_PROVIDER) {
      return this.simulateOllamaStream(
        candidate.model,
        context,
        startTime,
        usedFallback,
        threadSettings,
        executionOptions,
        streamContext,
      );
    }
    if (
      candidate.provider === LLAMACPP_PROVIDER ||
      candidate.provider === LLAMACPP_CONNECTOR_PROVIDER
    ) {
      return this.streamLlamacpp(
        candidate.provider,
        candidate.model,
        context,
        startTime,
        usedFallback,
        threadSettings,
        executionOptions,
        streamContext,
      );
    }
    return this.streamCloud(
      candidate.provider,
      candidate.model,
      context,
      startTime,
      usedFallback,
      threadSettings,
      executionOptions,
      streamContext,
    );
  }

  private async streamCloud(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    streamContext: StreamContext,
  ): Promise<LlmResponse> {
    const { baseUrl, apiKey } = await this.resolveProviderConfig(provider);
    const isOllamaConnector = provider === OLLAMA_CONNECTOR_PROVIDER;
    const effectiveModel = isOllamaConnector ? this.normalizeCloudOllamaModel(model) : model;
    const url = isOllamaConnector ? `${baseUrl}/chat` : `${baseUrl}/chat/completions`;
    const body: unknown = isOllamaConnector
      ? {
          ...this.buildOllamaChatRequestBody(model, context, threadSettings, executionOptions),
          stream: true,
        }
      : this.buildStreamingChatBody(model, context, threadSettings, executionOptions);
    const protocol = isOllamaConnector
      ? AiStreamProtocol.OLLAMA_NDJSON
      : AiStreamProtocol.OPENAI_SSE;
    return this.runExecutor(
      {
        threadId: streamContext.threadId,
        messageId: streamContext.messageId,
        laneId: streamContext.laneId,
        parallelGroupId: streamContext.parallelGroupId,
        provider,
        model: effectiveModel,
        url,
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
        protocol,
        startMs: startTime,
        promptTokensEstimate: this.estimatePromptTokens(context),
        maxOutputTokens: executionOptions?.maxOutputTokens,
        timeoutMs: AppConfig.get().OLLAMA_GENERATE_TIMEOUT_MS,
      },
      usedFallback,
    );
  }

  private async streamLlamacpp(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    streamContext: StreamContext,
  ): Promise<LlmResponse> {
    const config = AppConfig.get();
    return this.runExecutor(
      {
        threadId: streamContext.threadId,
        messageId: streamContext.messageId,
        laneId: streamContext.laneId,
        parallelGroupId: streamContext.parallelGroupId,
        provider,
        model,
        url: `${config.LLAMACPP_SERVICE_URL}/api/v1/v1/chat/completions`,
        body: this.buildStreamingChatBody(model, context, threadSettings, executionOptions),
        protocol: AiStreamProtocol.OPENAI_SSE,
        startMs: startTime,
        promptTokensEstimate: this.estimatePromptTokens(context),
        maxOutputTokens: executionOptions?.maxOutputTokens,
        timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
      },
      usedFallback,
    );
  }

  // Local Ollama has no streaming HTTP endpoint, so we reuse the existing
  // buffered call and replay the result as simulated chunks for a live UI.
  private async simulateOllamaStream(
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    streamContext: StreamContext,
  ): Promise<LlmResponse> {
    const executor = this.providerStreamExecutor;
    const buffered = await this.callOllama(
      model,
      context,
      startTime,
      usedFallback,
      threadSettings,
      executionOptions,
    );
    if (executor !== undefined) {
      await executor.runSimulated({
        threadId: streamContext.threadId,
        messageId: streamContext.messageId,
        laneId: streamContext.laneId,
        parallelGroupId: streamContext.parallelGroupId,
        provider: OLLAMA_PROVIDER,
        model: buffered.model,
        fullContent: buffered.content,
        inputTokens: buffered.inputTokens,
        outputTokens: buffered.outputTokens,
        startMs: startTime,
        promptTokensEstimate: this.estimatePromptTokens(context),
        maxOutputTokens: executionOptions?.maxOutputTokens,
      });
    }
    return buffered;
  }

  private async runExecutor(
    base: Omit<StreamExecutionInput, 'abortSignal'>,
    usedFallback: boolean,
  ): Promise<LlmResponse> {
    const executor = this.providerStreamExecutor;
    const cancellation = this.streamCancellation;
    if (executor === undefined || cancellation === undefined) {
      throw new BusinessException('Streaming dependencies unavailable', 'STREAM_NOT_AVAILABLE');
    }
    // Lane runs (parallel/compare) register under their laneId so each model
    // can be cancelled independently; single-chat runs key off threadId.
    const cancelKey = base.laneId ?? base.threadId;
    const controller = cancellation.register(cancelKey);
    try {
      const result = await executor.run({ ...base, abortSignal: controller.signal });
      if (result.content.trim().length === 0 && !result.cancelled) {
        throw new BusinessException(
          `Provider ${base.provider} returned no content`,
          'STREAM_EMPTY_RESPONSE',
        );
      }
      return {
        content: result.content,
        provider: base.provider,
        model: base.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens ?? estimateTokensFromText(result.content),
        latencyMs: Date.now() - base.startMs,
        finishReason: result.cancelled ? 'cancelled' : (result.finishReason ?? 'stop'),
        usedFallback,
      };
    } finally {
      cancellation.release(cancelKey);
    }
  }

  private buildStreamingChatBody(
    model: string,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
  ): OpenAiChatRequest {
    return {
      ...this.buildChatRequestBody(model, context, threadSettings, executionOptions),
      stream: true,
      stream_options: { include_usage: true },
    };
  }

  private estimatePromptTokens(context: AssembledContext): number {
    return estimateTokensFromText(this.contextAssembly.buildPromptString(context));
  }

  private async maybeEscalateFastPath(
    response: LlmResponse,
    candidate: { provider: string; model: string },
    context: AssembledContext,
    payload: MessageRoutedData,
    executionOptions: ExecutionOptions,
    threadSettings: ThreadSettings | undefined,
    startTime: number,
    candidateIndex: number,
  ): Promise<{ response: LlmResponse; escalated: boolean }> {
    if (
      !executionOptions.fastPathEnabled ||
      this.isGenerationResponse(response) ||
      !this.shouldEscalateFastPathResponse(response.content)
    ) {
      return { response, escalated: false };
    }
    this.logger.debug(
      `execute: escalating fast path to full path for message ${payload.messageId}`,
    );
    const escalatedExecutionOptions: ExecutionOptions = {
      fastPathEnabled: false,
      maxOutputTokens: this.resolveMaxOutputTokens(
        payload.routingMode,
        threadSettings,
        false,
        payload.selectedModel,
      ),
      applyShortResponseConstraint: false,
    };
    const escalated = await this.callProvider(
      candidate.provider,
      candidate.model,
      context,
      startTime,
      candidateIndex > 0,
      threadSettings,
      payload.routingMode,
      escalatedExecutionOptions,
    );
    return { response: escalated, escalated: true };
  }

  private evaluateQuality(args: {
    response: LlmResponse;
    finalProviderResponse: LlmResponse;
    candidate: { provider: string; model: string };
    candidates: Array<{ provider: string; model: string }>;
    candidateIndex: number;
    payload: MessageRoutedData;
    context: AssembledContext;
    executionOptions: ExecutionOptions;
    threadSettings: ThreadSettings | undefined;
    userPrompt: string;
    reRouteAttempt: number;
    reRouteReasons: string[];
  }): { kind: 'reRoute'; reasons: string[] } | { kind: 'pass'; response: LlmResponse } {
    if (args.executionOptions.fastPathEnabled) {
      return { kind: 'pass', response: args.finalProviderResponse };
    }
    const recentAssistantContents = args.context.threadMessages
      .filter((message) => message.role === 'ASSISTANT')
      .slice(-3)
      .map((message) => message.content);
    const qualityResult = this.qualityCheckManager.checkResponseQuality(
      args.response.content,
      args.userPrompt,
      args.threadSettings,
      recentAssistantContents,
    );
    const reRouteDecision = this.qualityCheckManager.shouldReRoute(
      qualityResult,
      args.reRouteAttempt,
      args.threadSettings,
    );

    if (reRouteDecision.shouldReRoute && args.candidateIndex < args.candidates.length - 1) {
      const nextCandidate = args.candidates.at(args.candidateIndex + 1);
      this.logger.warn(
        `Weak response detected from ${args.candidate.provider}/${args.candidate.model} (score: ${String(qualityResult.score.toFixed(2))}). Reasons: ${qualityResult.reasons.join(', ')}. Escalating to ${nextCandidate?.provider ?? 'next'}/${nextCandidate?.model ?? 'next'}.`,
      );
      this.chatStreamService.emitFallbackAttempt(args.payload.threadId, {
        failedProvider: args.candidate.provider,
        failedModel: args.candidate.model,
        error: `Weak response (score: ${String(qualityResult.score.toFixed(2))}): ${qualityResult.reasons.join(', ')}`,
        attempt: args.reRouteAttempt + 1,
        totalCandidates: args.candidates.length,
        nextProvider: nextCandidate?.provider,
        nextModel: nextCandidate?.model,
      });
      return { kind: 'reRoute', reasons: qualityResult.reasons };
    }

    if (args.reRouteAttempt > 0) {
      return {
        kind: 'pass',
        response: this.addReRouteMetadata(
          args.response,
          args.payload,
          qualityResult.score,
          args.reRouteAttempt,
          args.reRouteReasons,
        ),
      };
    }
    return { kind: 'pass', response: args.finalProviderResponse };
  }

  private async finalizeWithJudge(
    finalResponse: LlmResponse,
    context: AssembledContext,
    payload: MessageRoutedData,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions,
    fastPathEscalated: boolean,
  ): Promise<{ kind: 'success'; response: LlmResponse }> {
    const judgeResult = await this.runJudgeRefereePipeline(
      finalResponse,
      context,
      payload,
      threadSettings,
      executionOptions.fastPathEnabled,
    );
    if (judgeResult) {
      const judgedResponse =
        judgeResult.escalatedResponse ?? judgeResult.revisedResponse ?? finalResponse;
      return {
        kind: 'success',
        response: {
          ...judgedResponse,
          judgeRefereeMetadata: this.judgeRefereeManager.buildMetadata(judgeResult),
          ...this.buildExecutionMetadata(executionOptions, fastPathEscalated),
        },
      };
    }
    return {
      kind: 'success',
      response: {
        ...finalResponse,
        ...this.buildExecutionMetadata(executionOptions, fastPathEscalated),
      },
    };
  }

  private buildExecutionMetadata(
    executionOptions: ExecutionOptions,
    fastPathEscalated: boolean,
  ): ExecutionMetadata {
    const executionPath: ExecutionMetadata['executionPath'] = fastPathEscalated
      ? 'fast_escalated'
      : (executionOptions.fastPathEnabled
        ? 'fast'
        : 'standard');
    return {
      fastPathUsed: executionOptions.fastPathEnabled,
      fastPathEscalated,
      executionPath,
      targetLatencyMs: executionOptions.fastPathEnabled
        ? FAST_PATH_TARGET_LATENCY_MS
        : STANDARD_TARGET_LATENCY_MS,
    };
  }

  private emitCandidateFailure(
    error: unknown,
    candidate: { provider: string; model: string },
    candidateIndex: number,
    candidates: Array<{ provider: string; model: string }>,
    payload: MessageRoutedData,
  ): void {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.warn(
      `Provider ${candidate.provider}/${candidate.model} failed (attempt ${String(candidateIndex + 1)}/${String(candidates.length)}): ${errorMsg}`,
    );
    const nextCandidate = candidates.at(candidateIndex + 1);
    this.chatStreamService.emitFallbackAttempt(payload.threadId, {
      failedProvider: candidate.provider,
      failedModel: candidate.model,
      error: errorMsg,
      attempt: candidateIndex + 1,
      totalCandidates: candidates.length,
      nextProvider: nextCandidate?.provider,
      nextModel: nextCandidate?.model,
    });
  }

  private failExecution(
    payload: MessageRoutedData,
    lastError: unknown,
    attempts: AttemptRecord[],
  ): never {
    const finalError =
      lastError ??
      new BusinessException(
        'All LLM providers failed to generate a response',
        'LLM_EXECUTION_FAILED',
      );
    const finalErrorMsg = finalError instanceof Error ? finalError.message : 'All providers failed';
    this.chatStreamService.emitError(payload.threadId, finalErrorMsg);
    // Phase 5 — surface the per-attempt log on the error so callers
    // (chat-messages.service / SSE listeners) can render the developer
    // drawer even on full chain exhaustion.
    if (finalError instanceof BusinessException && attempts.length > 0) {
      (finalError as BusinessException & { attempts?: AttemptRecord[] }).attempts = attempts;
    }
    throw finalError;
  }

  private buildCandidateChain(
    payload: MessageRoutedData,
    routingMode: string,
  ): Array<{ provider: string; model: string }> {
    const candidates: Array<{ provider: string; model: string }> = [
      { provider: payload.selectedProvider, model: payload.selectedModel },
    ];

    if (routingMode === 'MANUAL_MODEL') {
      return candidates;
    }

    // Use the full fallback chain from the routing service when available
    if (payload.fallbackChain && payload.fallbackChain.length > 0) {
      for (const entry of payload.fallbackChain) {
        if (!candidates.some((c) => c.provider === entry.provider && c.model === entry.model)) {
          candidates.push({ provider: entry.provider, model: entry.model });
        }
      }
    } else if (payload.fallbackProvider && payload.fallbackModel) {
      candidates.push({ provider: payload.fallbackProvider, model: payload.fallbackModel });
    }

    // Never add cloud providers for privacy-sensitive routing modes
    if (LOCAL_ONLY_ROUTING_MODES.has(routingMode)) {
      this.logger.debug(
        `buildCandidateChain: skipping cloud providers — routingMode=${routingMode}`,
      );
      return candidates;
    }

    return candidates;
  }

  private extractUserPrompt(context: AssembledContext): string {
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    return lastUserMsg?.content ?? '';
  }

  private isGenerationResponse(response: LlmResponse): boolean {
    return response.imageGenerationId !== undefined || response.fileGenerationId !== undefined;
  }

  private resolveExecutionOptions(
    payload: MessageRoutedData,
    userPrompt: string,
    threadSettings?: ThreadSettings,
  ): ExecutionOptions {
    const fastPathEnabled = this.shouldUseFastPath(payload, userPrompt);
    return {
      fastPathEnabled,
      maxOutputTokens: this.resolveMaxOutputTokens(
        payload.routingMode,
        threadSettings,
        fastPathEnabled,
        payload.selectedModel,
      ),
      applyShortResponseConstraint: fastPathEnabled,
    };
  }

  private shouldUseFastPath(payload: MessageRoutedData, userPrompt: string): boolean {
    if (payload.routingMode !== 'AUTO') {
      return false;
    }
    if (payload.judgeEnabled === true) {
      return false;
    }
    if (payload.selectedProvider === FILE_GENERATION_PROVIDER) {
      return false;
    }
    if (payload.selectedProvider.startsWith(IMAGE_PROVIDER_PREFIX)) {
      return false;
    }

    const normalizedPrompt = userPrompt.trim();
    if (!normalizedPrompt) {
      return false;
    }
    if (normalizedPrompt.length > FAST_PATH_MAX_PROMPT_CHARS) {
      return false;
    }

    const newlineCount = (normalizedPrompt.match(/\n/g) ?? []).length;
    if (newlineCount > FAST_PATH_MAX_NEWLINES) {
      return false;
    }

    const wordCount = normalizedPrompt.split(/\s+/).filter(Boolean).length;
    if (wordCount > FAST_PATH_MAX_PROMPT_WORDS) {
      return false;
    }

    if (FAST_PATH_COMPLEXITY_PATTERN.test(normalizedPrompt)) {
      return false;
    }

    return (
      FAST_PATH_OPERATIONAL_PREFIX_PATTERN.test(normalizedPrompt.toLowerCase()) ||
      normalizedPrompt.length <= 80
    );
  }

  private resolveMaxOutputTokens(
    routingMode: string,
    threadSettings: ThreadSettings | undefined,
    fastPathEnabled: boolean,
    model: string,
  ): number | undefined {
    // Explicit user setting wins, capped at the HARD ceiling so a typo
    // in the UI can't ask the provider for 10M tokens.
    if (threadSettings?.maxTokens !== null && threadSettings?.maxTokens !== undefined) {
      const bounded = Math.min(threadSettings.maxTokens, HARD_MAX_OUTPUT_TOKENS);
      return Math.max(MIN_OUTPUT_TOKENS, bounded);
    }
    // AUTO + fast-path: keep small responses fast for trivial prompts.
    if ((routingMode === 'AUTO' || model === 'AUTO') && fastPathEnabled) {
      return FAST_PATH_MAX_OUTPUT_TOKENS;
    }
    // Default behavior: return `undefined` so we do NOT send a
    // max_tokens / num_predict to the provider. The model picks its
    // own stop token and produces a complete answer. Previously we
    // were always capping to DEFAULT_MAX_OUTPUT_TOKENS / AUTO_MAX
    // which truncated substantive answers mid-word (visible in
    // parallel-compare where every model returned exactly 112 tokens).
    return undefined;
  }

  private shouldEscalateFastPathResponse(content: string): boolean {
    const trimmed = content.trim();
    if (trimmed.length < FAST_PATH_MIN_RESPONSE_CHARS) {
      return true;
    }
    const weakPattern = /(i('?| )don'?t know|not sure|unable to|cannot help|unknown)/i;
    return weakPattern.test(trimmed);
  }

  private buildExecutionContext(
    context: AssembledContext,
    fastPathEnabled: boolean,
  ): AssembledContext {
    if (!fastPathEnabled) {
      return context;
    }

    return {
      ...context,
      threadMessages: context.threadMessages.slice(-FAST_PATH_CONTEXT_MAX_MESSAGES),
      memories: context.memories.slice(0, FAST_PATH_CONTEXT_MAX_MEMORIES),
      workspaceCitations: context.workspaceCitations.slice(0, FAST_PATH_CONTEXT_MAX_CITATIONS),
      tokenBudget: Math.min(context.tokenBudget, FAST_PATH_CONTEXT_TOKEN_BUDGET),
    };
  }

  // Phase 6 — SEARCH_FIRST execution. Activated only when the routing
  // decision explicitly selected SEARCH_FIRST. Search-service failures
  // ALWAYS degrade gracefully: returns the original context plus an
  // outcome record explaining why search did not apply.
  private async maybeRunSearchFirst(
    payload: MessageRoutedData,
    executionContext: AssembledContext,
    userPrompt: string,
  ): Promise<{ executionContext: AssembledContext; searchOutcome: SearchFirstOutcome | null }> {
    if (payload.selectedWorkflow !== WORKFLOW_KIND_SEARCH_FIRST) {
      return { executionContext, searchOutcome: null };
    }
    this.logger.log(
      `maybeRunSearchFirst: SEARCH_FIRST workflow active for message ${payload.messageId}`,
    );
    const { context: enriched, outcome } = await this.searchFirstManager.run(
      userPrompt,
      executionContext,
    );
    return { executionContext: enriched, searchOutcome: outcome };
  }

  private applyShortResponseConstraint(prompt: string): string {
    return `${prompt}\n\n${FAST_PATH_RESPONSE_CONSTRAINT}`;
  }

  private async runJudgeRefereePipeline(
    response: LlmResponse,
    context: AssembledContext,
    payload: MessageRoutedData,
    threadSettings?: ThreadSettings,
    fastPathEnabled = false,
  ): Promise<JudgeRefereeResult | null> {
    if (fastPathEnabled && !payload.judgeEnabled) {
      this.logger.debug(
        `runJudgeRefereePipeline: skipped for fast path message ${payload.messageId}`,
      );
      return null;
    }

    const config: JudgeRefereeConfig = {
      enabled: payload.judgeEnabled ?? false,
      category: payload.detectedCategory,
      routingMode: payload.routingMode,
      isLocalOnly: LOCAL_ONLY_ROUTING_MODES.has(payload.routingMode),
    };

    if (!this.judgeRefereeManager.shouldActivate(config)) {
      return null;
    }

    this.logger.log(
      `runJudgeRefereePipeline: activated for ${payload.messageId} category=${config.category ?? 'none'}`,
    );

    return this.judgeRefereeManager.evaluate(response, context, config, payload, threadSettings);
  }

  private addReRouteMetadata(
    response: LlmResponse,
    originalPayload: MessageRoutedData,
    originalScore: number,
    reRouteAttempts: number,
    reRouteReasons: string[],
  ): LlmResponse {
    return {
      ...response,
      reRouted: true,
      originalProvider: originalPayload.selectedProvider,
      originalModel: originalPayload.selectedModel,
      originalScore,
      reRouteAttempts,
      reRouteReasons,
    };
  }

  async callProvider(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
    routingMode?: string,
    executionOptions?: ExecutionOptions,
    tokenContext?: TokenLedgerContext,
  ): Promise<LlmResponse> {
    const response = await this.dispatchProvider(
      provider,
      model,
      context,
      startTime,
      usedFallback,
      threadSettings,
      routingMode,
      executionOptions,
    );
    // Feature 2 — tag the produced usage with the call context (CHAT default).
    // Image / file generation responses carry no token usage so we leave them
    // untagged to keep them out of the token ledger.
    if (this.isGenerationResponse(response)) {
      return response;
    }
    const tagged = { ...response, tokenContext: tokenContext ?? TokenLedgerContext.CHAT };
    this.recordChokepointUsage(context, tagged);
    return tagged;
  }

  // Universal token deduction. EVERY model call — normal chat, regenerate,
  // compare (per model), judge (critic/judge/revision), consensus, escalation,
  // repair, verify, best-of-n, cost-ensemble, role-pack, pipeline, decompose —
  // flows through callProvider, so recording here guarantees all modes consume
  // the user's daily quota, not just normal chat. Fail-soft; generation
  // responses are excluded above (no token usage).
  private recordChokepointUsage(context: AssembledContext, response: LlmResponse): void {
    if (!context.userId) {
      return;
    }
    void this.accessControlService.recordUsage({
      userId: context.userId,
      planId: null,
      inputTokens: response.inputTokens ?? 0,
      outputTokens: response.outputTokens ?? 0,
      provider: response.provider,
      model: response.model,
    });
  }

  private async dispatchProvider(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
    routingMode?: string,
    executionOptions?: ExecutionOptions,
  ): Promise<LlmResponse> {
    this.logger.debug(
      `callProvider: dispatching to provider type — provider=${provider} model=${model} usedFallback=${String(usedFallback)}`,
    );
    if (provider === FILE_GENERATION_PROVIDER) {
      this.logger.debug('callProvider: routing to file generation service');
      return this.callFileGenerationService(context, startTime, usedFallback, threadSettings);
    }
    if (provider.startsWith(IMAGE_PROVIDER_PREFIX)) {
      this.logger.debug('callProvider: routing to image service');
      return this.callImageService(
        provider,
        model,
        context,
        startTime,
        usedFallback,
        context.userId,
        routingMode === 'AUTO',
      );
    }
    if (provider === OLLAMA_CONNECTOR_PROVIDER) {
      return this.callCloudProvider(
        provider,
        this.normalizeCloudOllamaModel(model),
        context,
        startTime,
        usedFallback,
        threadSettings,
        executionOptions,
      );
    }
    if (provider === OLLAMA_PROVIDER) {
      return this.callOllama(
        model,
        context,
        startTime,
        usedFallback,
        threadSettings,
        executionOptions,
      );
    }
    if (provider === LLAMACPP_PROVIDER || provider === LLAMACPP_CONNECTOR_PROVIDER) {
      return this.callLlamacpp(
        provider,
        model,
        context,
        startTime,
        usedFallback,
        threadSettings,
        executionOptions,
      );
    }
    this.logger.debug('callProvider: routing to cloud provider');
    return this.callCloudProvider(
      provider,
      model,
      context,
      startTime,
      usedFallback,
      threadSettings,
      executionOptions,
    );
  }

  async generateOnce(
    provider: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens?: number,
  ): Promise<InternalGenerateResponse> {
    const config = AppConfig.get();
    const { baseUrl, apiKey } = await this.resolveProviderConfig(provider);
    const isOllamaConnector = provider === OLLAMA_CONNECTOR_PROVIDER;
    // Cloud Ollama (and any other provider routed through the OLLAMA
    // connector) speaks the *native* Ollama chat API at `/api/chat`, not
    // the OpenAI-compat path. resolveOllamaConnectorBaseUrl already pins
    // baseUrl to end with `/api`, so the URL here is `${baseUrl}/chat`.
    // Body is the native Ollama shape (`options.num_predict` instead of
    // OpenAI's top-level `max_tokens`); response shape is also native.
    const url = isOllamaConnector ? `${baseUrl}/chat` : `${baseUrl}/chat/completions`;
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    const body: OpenAiChatRequest | OllamaChatRequest = isOllamaConnector
      ? {
          model,
          messages,
          stream: false,
          ...(maxTokens === undefined
            ? {}
            : { options: { num_predict: Math.min(maxTokens, HARD_MAX_OUTPUT_TOKENS) } }),
        }
      : {
          model,
          messages,
          stream: false,
          ...(maxTokens === undefined
            ? {}
            : { max_tokens: Math.min(maxTokens, HARD_MAX_OUTPUT_TOKENS) }),
        };
    const startTime = Date.now();
    const response = await httpRequest<OpenAiChatResponse | OllamaChatResponse>({
      url,
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
    });
    if (!response.ok) {
      throw new BusinessException(
        this.extractHttpErrorMessage(
          response.data,
          `Provider ${provider} returned ${String(response.status)}`,
        ),
        'CLOUD_PROVIDER_REQUEST_FAILED',
      );
    }
    const promptTextForEstimate = `${systemPrompt}\n${userPrompt}`;
    const parsed = isOllamaConnector
      ? this.parseOllamaChatResponse(
          response.data as OllamaChatResponse,
          provider,
          model,
          startTime,
          false,
          promptTextForEstimate,
        )
      : this.parseCloudResponse(
          response.data as OpenAiChatResponse,
          provider,
          model,
          startTime,
          false,
          promptTextForEstimate,
        );
    return {
      content: parsed.content,
      provider: parsed.provider,
      model: parsed.model,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      durationMs: parsed.latencyMs,
    };
  }

  private async callOllama(
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
    executionOptions?: ExecutionOptions,
  ): Promise<LlmResponse> {
    const resolvedModel = await this.resolveModel(model);
    this.logger.log(`callOllama: calling model=${resolvedModel}`);
    const config = AppConfig.get();
    const requestBody = this.buildOllamaRequest(
      resolvedModel,
      context,
      threadSettings,
      executionOptions,
      model,
    );
    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
    });
    if (!response.ok) {
      const errorMessage = this.extractHttpErrorMessage(
        response.data,
        `Ollama service returned status ${String(response.status)}`,
      );
      this.logger.error(
        `callOllama: Ollama returned error status=${String(response.status)} message=${errorMessage}`,
      );
      throw new BusinessException(errorMessage, 'OLLAMA_REQUEST_FAILED');
    }
    return this.buildOllamaResponse(response.data, startTime, usedFallback, requestBody.prompt);
  }

  private buildOllamaRequest(
    resolvedModel: string,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    originalModel: string,
  ): OllamaGenerateRequest {
    const config = AppConfig.get();
    this.logger.debug('callOllama: building prompt string from context');
    const prompt = this.contextAssembly.buildPromptString(context);
    const constrainedPrompt =
      executionOptions?.applyShortResponseConstraint === true
        ? this.applyShortResponseConstraint(prompt)
        : prompt;
    this.logger.debug(`callOllama: prompt built — length=${String(prompt.length)} chars`);
    const imageFiles = context.fileContents.filter((f) => f.mimeType.startsWith('image/'));
    const images = imageFiles
      .map((f) => f.content)
      .filter((c): c is string => c !== null && c.length > 0);
    this.logger.debug(`callOllama: found ${String(images.length)} images for multimodal input`);
    const maxOutputTokens =
      executionOptions?.maxOutputTokens ??
      this.resolveMaxOutputTokens('AUTO', threadSettings, false, originalModel);
    return {
      model: resolvedModel,
      prompt: constrainedPrompt,
      stream: false,
      think: false,
      keep_alive: config.OLLAMA_KEEP_ALIVE,
      options: {
        temperature: threadSettings?.temperature ?? 0.2,
        num_predict: maxOutputTokens,
      },
      ...(images.length > 0 ? { images } : {}),
    };
  }

  private buildOllamaResponse(
    data: OllamaGenerateResponse,
    startTime: number,
    usedFallback: boolean,
    promptText?: string,
  ): LlmResponse {
    const latencyMs = Date.now() - startTime;
    const thinkingLength = data.thinking?.length ?? 0;
    this.logger.debug(
      `callOllama: response received — done=${String(data.done)} responseLen=${String(data.response.length)}`,
    );
    if (data.response.trim().length === 0) {
      this.logger.warn(
        `callOllama: model=${data.model} returned no visible answer (thinkingLen=${String(thinkingLength)})`,
      );
      throw new BusinessException(
        'Local model returned no visible answer',
        'OLLAMA_EMPTY_RESPONSE',
      );
    }
    // Feature 2 — native Ollama generate reports promptEvalCount / evalCount;
    // estimate the missing side from text when either is absent.
    const usage = extractOllamaUsage(data, { promptText, completionText: data.response });
    this.logger.log(
      `callOllama: completed model=${data.model} latencyMs=${String(latencyMs)} inputTokens=${String(usage.promptTokens)} outputTokens=${String(usage.completionTokens)} tokenSource=${usage.source}`,
    );
    return {
      content: data.response,
      provider: OLLAMA_PROVIDER,
      model: data.model,
      ...this.buildTokenUsageFields(usage),
      latencyMs,
      finishReason: data.done ? 'stop' : 'incomplete',
      usedFallback,
    };
  }

  private async callLlamacpp(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
    executionOptions?: ExecutionOptions,
  ): Promise<LlmResponse> {
    this.logger.log(`callLlamacpp: provider=${provider} model=${model}`);
    const config = AppConfig.get();
    const requestBody = this.buildChatRequestBody(model, context, threadSettings, executionOptions);
    const url = `${config.LLAMACPP_SERVICE_URL}/api/v1/v1/chat/completions`;
    this.logger.debug(`callLlamacpp: POST ${url}`);
    const response = await httpRequest<OpenAiChatResponse>({
      url,
      method: 'POST',
      body: requestBody,
      timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorMessage = this.extractHttpErrorMessage(
        response.data,
        `llama.cpp service returned status ${String(response.status)}`,
      );
      this.logger.error(
        `callLlamacpp: llama.cpp returned error status=${String(response.status)} message=${errorMessage}`,
      );
      throw new BusinessException(errorMessage, 'LLAMACPP_REQUEST_FAILED');
    }

    const promptText = this.buildPromptTextForEstimate(context);
    const result = this.parseCloudResponse(
      response.data,
      provider,
      model,
      startTime,
      usedFallback,
      promptText,
    );
    this.logger.log(
      `callLlamacpp: completed model=${model} latencyMs=${String(result.latencyMs)} inputTokens=${String(result.inputTokens ?? 0)} outputTokens=${String(result.outputTokens ?? 0)}`,
    );
    return result;
  }

  private async callCloudProvider(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
    executionOptions?: ExecutionOptions,
  ): Promise<LlmResponse> {
    this.logger.log(`callCloudProvider: calling ${provider}/${model}`);
    const config = AppConfig.get();
    this.logger.debug(`callCloudProvider: resolving provider config for ${provider}`);
    const { baseUrl, apiKey } = await this.resolveProviderConfig(provider);
    this.logger.debug(`callCloudProvider: config resolved — baseUrl=${baseUrl}`);

    const isOllamaConnector = provider === OLLAMA_CONNECTOR_PROVIDER;
    const requestBody = isOllamaConnector
      ? this.buildOllamaChatRequestBody(model, context, threadSettings, executionOptions)
      : this.buildChatRequestBody(model, context, threadSettings, executionOptions);
    const url = isOllamaConnector ? `${baseUrl}/chat` : `${baseUrl}/chat/completions`;
    this.logger.debug(
      `callCloudProvider: request body built — messageCount=${String(requestBody.messages.length)}`,
    );
    this.logger.debug(`callCloudProvider: sending POST to ${url}`);
    const response = await httpRequest<OpenAiChatResponse | OllamaChatResponse>({
      url,
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: requestBody,
      timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
    });

    if (!response.ok) {
      const errorMessage = this.extractHttpErrorMessage(
        response.data,
        `Cloud provider ${provider} returned status ${String(response.status)}`,
      );
      this.logger.error(
        `callCloudProvider: ${provider} returned error status=${String(response.status)} message=${errorMessage}`,
      );
      throw new BusinessException(errorMessage, 'CLOUD_PROVIDER_REQUEST_FAILED');
    }

    this.logger.debug('callCloudProvider: parsing cloud response');
    const promptText = this.buildPromptTextForEstimate(context);
    const result = isOllamaConnector
      ? this.parseOllamaChatResponse(
          response.data as OllamaChatResponse,
          provider,
          model,
          startTime,
          usedFallback,
          promptText,
        )
      : this.parseCloudResponse(
          response.data as OpenAiChatResponse,
          provider,
          model,
          startTime,
          usedFallback,
          promptText,
        );
    this.logger.log(
      `callCloudProvider: completed ${provider}/${model} latencyMs=${String(result.latencyMs)} inputTokens=${String(result.inputTokens ?? 0)} outputTokens=${String(result.outputTokens ?? 0)}`,
    );
    return result;
  }

  private async resolveProviderConfig(
    provider: string,
  ): Promise<{ baseUrl: string; apiKey: string }> {
    this.logger.debug(`resolveProviderConfig: fetching connector config for ${provider}`);
    const connectorConfig = await this.fetchConnectorConfig(provider);
    this.logger.debug(`resolveProviderConfig: connector config received for ${provider}`);
    const providerBaseUrls = PROVIDER_BASE_URLS as Readonly<Record<string, string>>;
    const connectorBaseUrl = connectorConfig.baseUrl?.trim() ?? '';
    const defaultBaseUrl = recordGet(providerBaseUrls, provider) ?? '';
    const baseUrl =
      provider === OLLAMA_CONNECTOR_PROVIDER
        ? this.resolveOllamaConnectorBaseUrl(connectorBaseUrl, defaultBaseUrl)
        : (connectorConfig.baseUrl ?? defaultBaseUrl);

    if (!baseUrl) {
      this.logger.error(`resolveProviderConfig: no base URL for provider ${provider}`);
      throw new BusinessException(
        `No base URL configured for provider ${provider}`,
        'MISSING_PROVIDER_BASE_URL',
      );
    }

    if (!connectorConfig.apiKey) {
      this.logger.error(`resolveProviderConfig: no API key for provider ${provider}`);
      throw new BusinessException(
        `No API key configured for provider ${provider}`,
        'MISSING_PROVIDER_API_KEY',
      );
    }

    this.logger.debug(`resolveProviderConfig: resolved baseUrl=${baseUrl} for ${provider}`);
    return { baseUrl, apiKey: connectorConfig.apiKey };
  }

  private buildChatRequestBody(
    model: string,
    context: AssembledContext,
    threadSettings?: ThreadSettings,
    executionOptions?: ExecutionOptions,
  ): OpenAiChatRequest {
    this.logger.debug(`buildChatRequestBody: building request for model=${model}`);
    const messages = this.contextAssembly.buildChatMessages(context);
    const requestMessages =
      executionOptions?.applyShortResponseConstraint === true
        ? [
            {
              role: 'system',
              content: FAST_PATH_RESPONSE_CONSTRAINT,
            },
            ...messages,
          ]
        : messages;
    this.logger.debug(`buildChatRequestBody: built ${String(messages.length)} chat messages`);
    const requestBody: OpenAiChatRequest = { model, messages: requestMessages, stream: false };

    if (threadSettings?.temperature !== null && threadSettings?.temperature !== undefined) {
      this.logger.debug(
        `buildChatRequestBody: applying temperature=${String(threadSettings.temperature)}`,
      );
      requestBody.temperature = threadSettings.temperature;
    }

    if (executionOptions?.maxOutputTokens !== undefined) {
      requestBody.max_tokens = executionOptions.maxOutputTokens;
    } else if (threadSettings?.maxTokens !== null && threadSettings?.maxTokens !== undefined) {
      this.logger.debug(
        `buildChatRequestBody: applying maxTokens=${String(threadSettings.maxTokens)}`,
      );
      requestBody.max_tokens = Math.min(threadSettings.maxTokens, HARD_MAX_OUTPUT_TOKENS);
    }

    return requestBody;
  }

  private buildOllamaChatRequestBody(
    model: string,
    context: AssembledContext,
    threadSettings?: ThreadSettings,
    executionOptions?: ExecutionOptions,
  ): OllamaChatRequest {
    const openAiMessages = this.contextAssembly.buildChatMessages(context);
    const shape = transformOpenAiMessagesToOllama(openAiMessages);
    if (shape.imageCount > 0) {
      this.logger.debug(
        `buildOllamaChatRequestBody: transformed ${String(shape.imageCount)} image part(s) to native Ollama images[] for model=${model}`,
      );
    }
    for (const warning of shape.warnings) {
      this.logger.warn(
        `buildOllamaChatRequestBody: dropped image (reason=${warning.reason}) — ${warning.detail}`,
      );
    }
    const requestBody: OllamaChatRequest = {
      model: this.normalizeCloudOllamaModel(model),
      messages: shape.messages,
      stream: false,
    };

    if (threadSettings?.temperature !== null && threadSettings?.temperature !== undefined) {
      requestBody.options = {
        ...(requestBody.options ?? {}),
        temperature: threadSettings.temperature,
      };
    }

    const maxOutputTokens =
      executionOptions?.maxOutputTokens ??
      (threadSettings?.maxTokens !== null && threadSettings?.maxTokens !== undefined
        ? Math.min(threadSettings.maxTokens, HARD_MAX_OUTPUT_TOKENS)
        : undefined);

    if (maxOutputTokens !== undefined) {
      requestBody.options = {
        ...(requestBody.options ?? {}),
        num_predict: maxOutputTokens,
      };
    }

    return requestBody;
  }

  private parseCloudResponse(
    data: OpenAiChatResponse,
    provider: string,
    model: string,
    startTime: number,
    usedFallback: boolean,
    promptText?: string,
  ): LlmResponse {
    this.logger.debug(`parseCloudResponse: parsing response from ${provider}/${model}`);
    const latencyMs = Date.now() - startTime;
    const firstChoice = data.choices[0];

    if (!firstChoice) {
      this.logger.error(`parseCloudResponse: ${provider} returned no choices`);
      throw new BusinessException(
        `Cloud provider ${provider} returned no choices`,
        'CLOUD_PROVIDER_EMPTY_RESPONSE',
      );
    }

    this.logger.debug(
      `parseCloudResponse: finishReason=${firstChoice.finish_reason} choiceCount=${String(data.choices.length)}`,
    );
    const responseContent =
      typeof firstChoice.message.content === 'string' ? firstChoice.message.content : '';
    // Feature 2 — fill any missing native usage from a CHAR_DIV_4 estimate so
    // every cloud / llama.cpp call yields a complete, tagged TokenUsage. The
    // extractor prefers native counts and only estimates the missing side.
    const usage = extractOpenAiCompatibleUsage(data, {
      promptText,
      completionText: responseContent,
    });
    this.logger.debug(
      `parseCloudResponse: responseContentLen=${String(responseContent.length)} inputTokens=${String(usage.promptTokens)} outputTokens=${String(usage.completionTokens)} tokenSource=${usage.source}`,
    );

    return {
      content: responseContent,
      provider,
      model,
      ...this.buildTokenUsageFields(usage),
      latencyMs,
      finishReason: firstChoice.finish_reason,
      usedFallback,
    };
  }

  private parseOllamaChatResponse(
    data: OllamaChatResponse,
    provider: string,
    model: string,
    startTime: number,
    usedFallback: boolean,
    promptText?: string,
  ): LlmResponse {
    const latencyMs = Date.now() - startTime;
    const responseContent = data.message?.content ?? '';

    if (responseContent.trim().length === 0) {
      throw new BusinessException(
        `Cloud provider ${provider} returned no message content`,
        'CLOUD_PROVIDER_EMPTY_RESPONSE',
      );
    }

    // Feature 2 — native Ollama chat reports prompt_eval_count / eval_count;
    // estimate the missing side from text when either is absent.
    const usage = extractOllamaUsage(data, { promptText, completionText: responseContent });

    return {
      content: responseContent,
      provider,
      model,
      ...this.buildTokenUsageFields(usage),
      latencyMs,
      finishReason: data.done_reason ?? (data.done ? 'stop' : undefined),
      usedFallback,
    };
  }

  // Feature 2 — best-effort prompt text used ONLY to estimate prompt tokens
  // when the provider omits native usage. Reuses the same prompt assembly the
  // request used so the estimate tracks the real input size. Never throws; on
  // any failure it falls back to the last user message so a missing estimate
  // never blocks a response.
  private buildPromptTextForEstimate(context: AssembledContext): string {
    try {
      return this.contextAssembly.buildPromptString(context);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`buildPromptTextForEstimate: falling back to user prompt — ${msg}`);
      return this.extractUserPrompt(context);
    }
  }

  // Feature 2 — maps a shared TokenUsage onto the LlmResponse token fields.
  // Never throws; always yields complete input/output counts plus the
  // estimated flag and NATIVE/ESTIMATED/MIXED source tag.
  private buildTokenUsageFields(usage: TokenUsage): {
    inputTokens: number;
    outputTokens: number;
    tokenEstimated: boolean;
    tokenSource: TokenUsageSource;
  } {
    return {
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      tokenEstimated: usage.estimated,
      tokenSource: usage.source,
    };
  }

  private async callImageService(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    userId: string,
    isAutoMode?: boolean,
  ): Promise<LlmResponse> {
    this.logger.log(`callImageService: requesting image generation via ${provider}/${model}`);
    const config = AppConfig.get();
    this.logger.debug('callImageService: extracting last user message for prompt');
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    let prompt = lastUserMsg?.content ?? 'generate an image';
    this.logger.debug(`callImageService: base prompt length=${String(prompt.length)}`);

    // If image files are attached:
    // 1. Use vision model to analyze and build a detailed prompt
    // 2. Pass the original image as reference for image-to-image generation
    const imageFiles = context.fileContents.filter((f) => f.mimeType.startsWith('image/'));
    let referenceImageBase64: string | undefined;
    let referenceImageMimeType: string | undefined;

    if (imageFiles.length > 0) {
      this.logger.log(
        `callImageService: ${String(imageFiles.length)} image files attached — building vision prompt`,
      );
      prompt = await this.buildImagePromptFromVision(prompt, context);
      this.logger.debug(`callImageService: vision prompt built — length=${String(prompt.length)}`);
      const firstImage = imageFiles[0];
      if (firstImage?.content) {
        referenceImageBase64 = firstImage.content;
        referenceImageMimeType = firstImage.mimeType;
        this.logger.debug(
          `callImageService: reference image attached — mimeType=${firstImage.mimeType} base64Len=${String(firstImage.content.length)}`,
        );
        // Prepend reference instruction so the image generator knows to match the attached image
        prompt = `REFERENCE IMAGE ATTACHED — Generate an image that closely matches the visual style, composition, colors, and subject matter of the provided reference image. Use the following detailed description as guidance:\n\n${prompt}`;
      }
    } else {
      this.logger.debug('callImageService: no image files attached — using text prompt only');
    }

    this.logger.debug(
      `callImageService: sending request to image service at ${config.IMAGE_SERVICE_URL}`,
    );
    const response = await httpRequest<ImageGenerateResponse>({
      url: `${config.IMAGE_SERVICE_URL}/api/v1/internal/images/generate`,
      method: 'POST',
      body: {
        prompt,
        provider,
        model,
        userId,
        isAutoMode,
        referenceImageBase64,
        referenceImageMimeType,
      },
      timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
    });

    if (!response.ok) {
      this.logger.error(
        `callImageService: image service returned error status=${String(response.status)}`,
      );
      throw new BusinessException(
        `Image service returned status ${String(response.status)}`,
        'IMAGE_SERVICE_REQUEST_FAILED',
      );
    }

    const latencyMs = Date.now() - startTime;
    this.logger.log(
      `callImageService: completed — generationId=${response.data.generationId} latencyMs=${String(latencyMs)}`,
    );

    return {
      content: 'Generating image\u2026',
      provider,
      model,
      latencyMs,
      finishReason: 'stop',
      usedFallback,
      imageGenerationId: response.data.generationId,
    };
  }

  private async callFileGenerationService(
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
  ): Promise<LlmResponse> {
    this.logger.log('callFileGenerationService: starting file generation');
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    const prompt = lastUserMsg?.content ?? 'generate a file';
    const format = this.detectFileFormat(prompt);
    this.logger.debug(
      `callFileGenerationService: prompt length=${String(prompt.length)} format=${format}`,
    );
    const { contentResponse, contentFallbackUsed } = await this.runFileContentPhase(
      context,
      format,
      startTime,
      usedFallback,
      threadSettings,
    );
    const fileContent = this.stripCodeBlockWrapper(contentResponse.content);
    const generationId = await this.dispatchFileGeneration(
      prompt,
      fileContent,
      format,
      contentResponse,
      context.userId,
    );
    const latencyMs = Date.now() - startTime;
    this.logger.log(
      `callFileGenerationService: completed format=${format} generationId=${generationId} latencyMs=${String(latencyMs)}`,
    );
    return {
      content: `Generating ${format.toLowerCase()} file...`,
      provider: FILE_GENERATION_PROVIDER,
      model: 'auto',
      latencyMs,
      finishReason: 'stop',
      usedFallback: usedFallback || contentFallbackUsed,
      fileGenerationId: generationId,
    };
  }

  private async runFileContentPhase(
    context: AssembledContext,
    format: string,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
  ): Promise<{ contentResponse: LlmResponse; contentFallbackUsed: boolean }> {
    const fileExecutionOptions = this.buildFileGenerationExecutionOptions(threadSettings);
    const fileContext: AssembledContext = {
      ...context,
      systemPrompt: `You are a file content generator. The user wants to create a ${format} file. Generate ONLY the raw content for the file — no explanations, no markdown code blocks, no "here is your file" preamble. Output the actual content that should go inside the file. For PDF/DOCX, use markdown formatting (headers, bullets, paragraphs). For CSV, output header row + data rows. For JSON, output valid JSON. For TXT, output plain text. For HTML, output HTML. For MD, output markdown.`,
    };
    const contentCandidates = await this.buildFileContentProviderCandidates();
    let contentResponse: LlmResponse | null = null;
    let contentFallbackUsed = false;
    let lastContentError: unknown = null;
    for (let index = 0; index < contentCandidates.length; index++) {
      const candidate = contentCandidates.at(index);
      if (!candidate) continue;
      this.logger.debug(
        `runFileContentPhase: trying content provider ${String(index + 1)}/${String(contentCandidates.length)} - ${candidate.provider}/${candidate.model}`,
      );
      try {
        contentResponse = await this.callProvider(
          candidate.provider,
          candidate.model,
          fileContext,
          startTime,
          usedFallback || index > 0,
          threadSettings,
          'AUTO',
          fileExecutionOptions,
        );
        contentFallbackUsed = index > 0;
        break;
      } catch (error: unknown) {
        lastContentError = error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `runFileContentPhase: content provider ${candidate.provider}/${candidate.model} failed: ${errorMessage}`,
        );
      }
    }
    if (contentResponse === null) {
      throw (
        lastContentError ??
        new BusinessException(
          'No file content provider could generate the requested file',
          'FILE_GENERATION_CONTENT_FAILED',
        )
      );
    }
    return { contentResponse, contentFallbackUsed };
  }

  private stripCodeBlockWrapper(content: string): string {
    const codeBlockMatch = /^```\w*\n([\s\S]*?)```$/m.exec(content.trim());
    if (codeBlockMatch?.[1]) {
      this.logger.debug('stripCodeBlockWrapper: stripped markdown code block wrapper');
      return codeBlockMatch[1].trim();
    }
    return content;
  }

  private async dispatchFileGeneration(
    prompt: string,
    fileContent: string,
    format: string,
    contentResponse: LlmResponse,
    userId: string,
  ): Promise<string> {
    const config = AppConfig.get();
    const response = await httpRequest<FileGenerateResponse>({
      url: `${config.FILE_GENERATION_SERVICE_URL}/api/v1/internal/file-generations/generate`,
      method: 'POST',
      body: {
        prompt,
        content: fileContent,
        format,
        provider: contentResponse.provider,
        model: contentResponse.model,
        userId,
      },
      timeoutMs: 30_000,
    });
    if (!response.ok) {
      this.logger.error(
        `dispatchFileGeneration: file-gen service returned error status=${String(response.status)}`,
      );
      throw new BusinessException(
        `File generation service returned status ${String(response.status)}`,
        'FILE_GENERATION_SERVICE_REQUEST_FAILED',
      );
    }
    return response.data.generationId;
  }

  private buildFileGenerationExecutionOptions(threadSettings?: ThreadSettings): ExecutionOptions {
    const requestedMaxTokens = threadSettings?.maxTokens;
    const boundedRequestedMaxTokens =
      requestedMaxTokens !== null && requestedMaxTokens !== undefined
        ? Math.min(requestedMaxTokens, HARD_MAX_OUTPUT_TOKENS)
        : HARD_MAX_OUTPUT_TOKENS;

    return {
      fastPathEnabled: false,
      maxOutputTokens: Math.max(DEFAULT_MAX_OUTPUT_TOKENS, boundedRequestedMaxTokens),
      applyShortResponseConstraint: false,
    };
  }

  private async buildFileContentProviderCandidates(): Promise<
    Array<{ provider: string; model: string }>
  > {
    const candidates: Array<{ provider: string; model: string }> = [];
    const localCandidates =
      (await this.localModelSelection?.resolveModelList(3, LocalModelRole.LOCAL_FILE_GENERATION)) ??
      [];

    for (const model of localCandidates) {
      if (model === 'AUTO') {
        continue;
      }
      this.pushUniqueProviderCandidate(candidates, OLLAMA_PROVIDER, model);
    }

    this.pushUniqueProviderCandidate(candidates, 'ANTHROPIC', 'claude-sonnet-4');
    this.pushUniqueProviderCandidate(candidates, 'OPENAI', 'gpt-4o-mini');
    this.pushUniqueProviderCandidate(candidates, 'GEMINI', 'gemini-2.5-flash');

    return candidates;
  }

  private pushUniqueProviderCandidate(
    candidates: Array<{ provider: string; model: string }>,
    provider: string,
    model: string,
  ): void {
    if (
      !candidates.some((candidate) => candidate.provider === provider && candidate.model === model)
    ) {
      candidates.push({ provider, model });
    }
  }

  private async resolveModel(model: string): Promise<string> {
    if (model !== 'AUTO') {
      return model;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private detectFileFormat(prompt: string): string {
    this.logger.debug('detectFileFormat: scanning prompt for format keywords');
    const lower = prompt.toLowerCase();
    if (lower.includes('pdf')) {
      this.logger.debug('detectFileFormat: matched PDF');
      return 'PDF';
    }
    if (lower.includes('docx') || lower.includes('word')) {
      this.logger.debug('detectFileFormat: matched DOCX');
      return 'DOCX';
    }
    if (lower.includes('csv')) {
      this.logger.debug('detectFileFormat: matched CSV');
      return 'CSV';
    }
    if (lower.includes('json')) {
      this.logger.debug('detectFileFormat: matched JSON');
      return 'JSON';
    }
    if (lower.includes('html')) {
      this.logger.debug('detectFileFormat: matched HTML');
      return 'HTML';
    }
    if (lower.includes('markdown') || lower.includes('.md')) {
      this.logger.debug('detectFileFormat: matched MD');
      return 'MD';
    }
    this.logger.debug('detectFileFormat: no specific format matched — defaulting to TXT');
    return 'TXT';
  }

  private async buildImagePromptFromVision(
    userText: string,
    context: AssembledContext,
  ): Promise<string> {
    this.logger.log('Analyzing attached image with vision model before image generation');

    try {
      // Build a vision-specific context with a system prompt that extracts image details
      const visionContext: AssembledContext = {
        ...context,
        systemPrompt: `You are an expert image analyst specializing in creating precise image generation prompts. The user has attached a reference image and wants to generate a new image based on it.

Your task:
1. Study the attached image in EXTREME detail, covering ALL of the following aspects:
   - SUBJECTS: What is shown (people, animals, objects, scenes)? Describe poses, expressions, body language, clothing, accessories, hair, age, gender if applicable.
   - COMPOSITION: Layout, framing (close-up, wide shot, portrait, landscape), rule of thirds, symmetry, focal point, depth of field, camera angle (eye level, bird's eye, low angle).
   - COLORS: Dominant color palette, accent colors, color temperature (warm/cool), saturation level, color harmony (complementary, analogous, monochromatic).
   - LIGHTING: Direction (front, side, back, rim), quality (soft, hard, diffused, dramatic), time of day, shadows, highlights, ambient vs directional.
   - STYLE: Art style (photorealistic, digital art, oil painting, watercolor, anime, cartoon, 3D render, vector, pixel art, sketch, minimalist). Artistic influences or movements.
   - BACKGROUND: Setting, environment, scenery, depth, blur (bokeh), patterns, textures.
   - MOOD/ATMOSPHERE: Emotional tone, ambiance (serene, dramatic, whimsical, dark, vibrant, nostalgic, futuristic).
   - TEXTURES/MATERIALS: Surface qualities (glossy, matte, rough, smooth, metallic, fabric, organic).
   - TEXT/TYPOGRAPHY: Any text visible, font style, placement.

2. Consider the user's request: "${userText}"
   - If they want "similar", "like this", "recreate", describe the original faithfully and completely.
   - If they want modifications, incorporate those specific changes while keeping unmentioned aspects the same.

3. Output ONLY a single detailed image generation prompt (4-8 sentences). Format it as a direct description that an AI image generator will understand. Start with the main subject, then style, then details.

4. CRITICAL RULES:
   - Do NOT say "I see" or "The image shows" — write it as a generation instruction.
   - Do NOT add explanations, preambles, or commentary.
   - Start directly with the subject description (e.g., "A young woman with..." or "A serene mountain landscape...").
   - End with style and quality keywords (e.g., "photorealistic, highly detailed, 8K, professional photography" or "digital art, vibrant colors, trending on ArtStation").
   - Be SPECIFIC — say "warm golden sunset light" not just "nice lighting".
   - Include aspect ratio cues if the original has a distinctive shape.`,
      };

      const visionResponse = await this.callCloudProvider(
        'GEMINI',
        'gemini-2.5-flash',
        visionContext,
        Date.now(),
        false,
      );

      const generatedPrompt = visionResponse.content.trim();
      this.logger.log(`Vision analysis generated prompt: ${generatedPrompt.slice(0, 200)}...`);

      return generatedPrompt.length > 10 ? generatedPrompt : userText;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Vision analysis failed, using original prompt: ${msg}`);
      return userText;
    }
  }

  private async fetchConnectorConfig(provider: string): Promise<ConnectorConfigResponse> {
    const normalizedProvider = provider.toUpperCase();
    this.logger.debug(`fetchConnectorConfig: fetching config for provider=${normalizedProvider}`);
    const config = AppConfig.get();
    const encodedProvider = encodeURIComponent(normalizedProvider);
    const url = `${config.CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config?provider=${encodedProvider}`;

    const response = await httpRequest<ConnectorConfigResponse>({
      url,
      method: 'GET',
      timeoutMs: 10_000,
    });

    if (!response.ok) {
      const errorMessage = this.extractHttpErrorMessage(
        response.data,
        `Failed to fetch connector config for provider ${provider}`,
      );
      throw new BusinessException(errorMessage, 'CONNECTOR_CONFIG_FETCH_FAILED');
    }

    return response.data;
  }

  private extractHttpErrorMessage(responseData: unknown, fallbackMessage: string): string {
    if (responseData !== null && typeof responseData === 'object') {
      const payload = responseData as Record<string, unknown>;
      const message = payload['message'];
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }

      const error = payload['error'];
      if (typeof error === 'string' && error.trim().length > 0) {
        return error;
      }
    }

    return fallbackMessage;
  }

  private normalizeCloudOllamaModel(model: string): string {
    return model.trim().replace(/:cloud$/i, '');
  }

  private resolveOllamaConnectorBaseUrl(connectorBaseUrl: string, fallbackBaseUrl: string): string {
    const trimmed = connectorBaseUrl.trim();
    if (!trimmed) {
      return fallbackBaseUrl;
    }

    const normalized = trimmed.replace(/\/+$/, '');
    const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].some((pattern) =>
      normalized.includes(pattern),
    );
    if (isLocalhost) {
      return fallbackBaseUrl;
    }
    if (normalized.endsWith('/api')) {
      return normalized;
    }
    if (normalized.endsWith('/v1')) {
      return normalized.replace(/\/v1$/, '/api');
    }
    let hostname: string;
    try {
      const withScheme = normalized.startsWith('http') ? normalized : `https://${normalized}`;
      hostname = new URL(withScheme).hostname;
    } catch {
      hostname = '';
    }
    return hostname === 'ollama.com' || hostname.endsWith('.ollama.com')
      ? `${normalized}/api`
      : normalized;
  }
}
