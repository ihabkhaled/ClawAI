import { HttpStatus, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  LocalModelRole,
  type ResolvedEffort,
  type ResolvedSpeed,
  TokenLedgerContext,
  type TokenUsage,
  TokenUsageSource,
} from '@claw/shared-types';
import {
  extractGeminiUsage,
  extractOllamaUsage,
  extractOpenAiCompatibleUsage,
  SPEED_PATH_ANTHROPIC_SPEED,
  SPEED_PATH_OPENAI_SERVICE_TIER,
  withObservedSpeed,
} from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest, recordGet } from '../../../common/utilities';
import { BusinessException } from '../../../common/errors';
import { ModelExposureClient } from '../clients/model-exposure.client';
import { ModelAuthorizationDenialReason } from '../enums/model-authorization-denial-reason.enum';
import { ModelAuthorizationMetricsService } from '../services/model-authorization-metrics.service';
import {
  ANTHROPIC_PROVIDER,
  FILE_GENERATION_PROVIDER,
  GEMINI_OPENAI_COMPATIBILITY_SUFFIX,
  GEMINI_PROVIDER,
  IMAGE_PROVIDER_PREFIX,
  LLAMACPP_CONNECTOR_PROVIDER,
  LLAMACPP_PROVIDER,
  LOCAL_ONLY_ROUTING_MODES,
  OLLAMA_CONNECTOR_PROVIDER,
  OLLAMA_PROVIDER,
  PROVIDER_BASE_URLS,
} from '../../../common/constants';
import {
  type AnthropicMessagesRequest,
  type CloudProviderRequestBody,
  type ConnectorConfigResponse,
  type FileGenerateResponse,
  type GeminiNativeChatRequest,
  type ImageGenerateResponse,
  type LlmResponse,
  type MessageRoutedData,
  type OllamaChatMessage,
  type OllamaChatRequest,
  type OllamaChatResponse,
  type OllamaGenerateRequest,
  type OllamaGenerateResponse,
  type OpenAiChatMessage,
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
import type { NormalizedToolCall, TranslatedToolCatalog } from '../types/provider-tool.types';
import {
  resolveToolChoicePayload,
  resolveToolDialect,
} from '../utilities/provider-tool-dialect.utility';
import {
  buildObservedSpeed,
  effortFlagForRequest,
  effortLevelForRequest,
  isEffortDowngraded,
  isSpeedUnavailable,
  resolveExecutionEffort,
  resolveExecutionSpeed,
  speedTierForRequest,
} from '../utilities/provider-effort.utility';
import {
  buildAnthropicToolTurnMessages,
  buildOllamaToolTurnMessages,
  buildOpenAiToolTurnMessages,
  normalizeToolCalls,
  toOpenAiToolSpecs,
  translateToolCatalog,
} from '../utilities/provider-tool-translation.utility';
import {
  ANTHROPIC_TOOL_DEFAULT_MAX_TOKENS,
  OPENAI_TOOL_CALLS_FINISH_REASON,
} from '../constants/provider-tool.constants';
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
import {
  AiStreamProtocol,
  OllamaToolPhase,
  ProgressActorType,
  ProviderToolDialect,
  StreamEventType,
  ToolChoiceMode,
} from '../../../common/enums';
import { modelRejectsSamplingParams } from '../utilities/anthropic-sampling.utility';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';
import { boundImageGenerationPrompt } from '../utilities/image-generation-prompt.utility';
import { transformOpenAiMessagesToOllama } from '../utilities/ollama-message-shape.utility';
import { transformOpenAiMessagesToAnthropic } from '../utilities/anthropic-message-shape.utility';
import { buildGeminiRequestBody } from '../utilities/gemini-request-builder.utility';
import {
  hasVideoAttachment,
  resolveVideoAttachmentCandidates,
} from '../utilities/video-attachment-routing.utility';
import type { GeminiFileUploadFn, GeminiGenerateContentResponse } from '../types/gemini.types';
import { GeminiFilesApiManager } from './gemini-files-api.manager';
import type {
  StreamContext,
  StreamExecutionInput,
  StreamExecutionResult,
} from '../types/stream-execution.types';
import type { VisibleProgressStatus } from '../types/stream.types';
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
import {
  computeDefaultMaxTokens,
  pickDefaultCtxSizeForProvider,
} from '../constants/output-token-bounds.constants';
import type { ExecutionOptions } from '../types/execution-options.types';
import { OLLAMA_TOOL_LOOP_WRAPUP_INSTRUCTION } from '../constants/agentic-loop.constants';
import {
  executeOllamaCloudToolCall,
  truncateResult,
} from '../utilities/ollama-cloud-tool-runner.utility';
import {
  describeProviderErrorResponse,
  isProviderErrorResponse,
} from '../utilities/provider-error-response.utility';
import { TOOL_WEB_FETCH, TOOL_WEB_SEARCH } from '../constants/ollama-cloud-tools.constants';
import type {
  OllamaCloudToolCall,
  OllamaToolTranscript,
  OllamaToolTranscriptTurn,
} from '../types/ollama-cloud-tool.types';
import { providerFailureCode } from '../utilities/runtime-v2-provider-failure.utility';

@Injectable()
export class ChatExecutionManager implements OnModuleInit {
  private readonly logger = new Logger(ChatExecutionManager.name);
  private readonly modelExposure = new ModelExposureClient();
  private readonly authorizationMetrics = new ModelAuthorizationMetricsService();

  constructor(
    private readonly contextAssembly: ContextAssemblyManager,
    private readonly qualityCheckManager: QualityCheckManager,
    private readonly judgeRefereeManager: JudgeRefereeManager,
    private readonly chatStreamService: ChatStreamService,
    private readonly searchFirstManager: SearchFirstManager,
    private readonly accessControlService: AccessControlService,
    private readonly geminiFilesApiManager: GeminiFilesApiManager,
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
    if (payload.selectedProvider === 'UNAVAILABLE') {
      throw new BusinessException(
        'No reachable AI text model is available. Enable a cloud connector or start a local model runtime, then retry.',
        'NO_REACHABLE_EXECUTION_MODEL',
      );
    }
    if (payload.routingMode === 'AUTO') {
      this.chatStreamService.emitRouterStarted(payload.threadId, payload.routerModel);
    }
    const startTime = Date.now();
    const candidates = resolveVideoAttachmentCandidates(
      payload,
      context,
      this.buildCandidateChain(payload, payload.routingMode),
    );
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

    return this.failExecution(lastError, attempts);
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
      if (error instanceof BusinessException && error.code === 'STREAM_CANCELLED') {
        throw error;
      }
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
    // A provider can answer 200 with an error body. Gemini returned a
    // RESOURCE_EXHAUSTED envelope that was stored and shown as the assistant's
    // reply, and because nothing threw, the chain never advanced to a provider
    // that was working. Treat it as this candidate failing so the next one runs.
    if (
      response.finishReason !== 'cancelled' &&
      !this.isGenerationResponse(response) &&
      isProviderErrorResponse(response.content)
    ) {
      const reason = describeProviderErrorResponse(response.content);
      const error = new BusinessException(reason, 'PROVIDER_ERROR_RESPONSE');
      this.emitCandidateFailure(
        error,
        args.candidate,
        args.candidateIndex,
        args.candidates,
        args.payload,
      );
      return { kind: 'failure', error };
    }
    if (response.finishReason === 'cancelled') {
      return {
        kind: 'success',
        response: {
          ...response,
          ...this.buildExecutionMetadata(args.executionOptions, false),
        },
      };
    }
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

  private shouldUseGeminiNativeRequest(provider: string, context: AssembledContext): boolean {
    return (
      provider === GEMINI_PROVIDER &&
      (AppConfig.get().ENABLE_GEMINI_FILES_API || hasVideoAttachment(context))
    );
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
    tokenContext?: TokenLedgerContext,
  ): Promise<LlmResponse> {
    const dispatched = await this.dispatchStreamCandidate(
      candidate,
      context,
      startTime,
      usedFallback,
      threadSettings,
      executionOptions,
      streamContext,
    );
    // Universal token deduction for the streaming path. The buffered
    // `callProvider` path records via `recordChokepointUsage` at the
    // end of the call; this mirror records for EVERY streaming hop
    // (single-chat SSE, parallel/compare lanes via streamModelForLane,
    // simulated local-ollama replays, Ollama Cloud tool-loop wrap-up
    // replays). Tagged with TokenLedgerContext so the ledger row can
    // be attributed to the right mode (chat / compare / etc.). Without
    // this, the streaming path silently bypassed daily-quota consumption
    // — every prompt yesterday on /chat or /chat/compare appeared free.
    const tagged: LlmResponse = {
      ...dispatched,
      tokenContext: dispatched.tokenContext ?? tokenContext ?? TokenLedgerContext.CHAT,
    };
    this.recordChokepointUsage(context, tagged);
    return tagged;
  }

  private async dispatchStreamCandidate(
    candidate: { provider: string; model: string },
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    streamContext: StreamContext,
  ): Promise<LlmResponse> {
    if (this.shouldUseGeminiNativeRequest(candidate.provider, context)) {
      return this.simulateGeminiNativeStream(
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
    const isOllamaConnector = provider === OLLAMA_CONNECTOR_PROVIDER;
    if (isOllamaConnector) {
      // Ollama Cloud agentic models loop on tool_calls; the native
      // streaming protocol cannot be re-driven mid-stream after the
      // client executes a tool, so we run the buffered tool loop and
      // replay the final answer as simulated chunks to keep the UI
      // animated end-to-end.
      return this.simulateOllamaCloudStream(
        provider,
        model,
        context,
        startTime,
        usedFallback,
        threadSettings,
        executionOptions,
        streamContext,
      );
    }
    const { baseUrl, apiKey } = await this.resolveProviderConfig(provider);
    const effectiveModel = model;
    const { url, body, protocol, headers } = await this.resolveStreamCloudRequest({
      provider,
      model,
      context,
      threadSettings,
      executionOptions,
      baseUrl,
      apiKey,
      isOllamaConnector,
    });
    return this.runExecutor(
      {
        threadId: streamContext.threadId,
        messageId: streamContext.messageId,
        laneId: streamContext.laneId,
        parallelGroupId: streamContext.parallelGroupId,
        provider,
        model: effectiveModel,
        url,
        headers,
        body,
        protocol,
        startMs: startTime,
        promptTokensEstimate: this.estimatePromptTokens(context),
        maxOutputTokens: executionOptions?.maxOutputTokens,
        timeoutMs: AppConfig.get().OLLAMA_GENERATE_TIMEOUT_MS,
      },
      usedFallback,
      executionOptions,
    );
  }

  private async resolveStreamCloudRequest(args: {
    provider: string;
    model: string;
    context: AssembledContext;
    threadSettings: ThreadSettings | undefined;
    executionOptions: ExecutionOptions | undefined;
    baseUrl: string;
    apiKey: string;
    isOllamaConnector: boolean;
  }): Promise<{
    url: string;
    body: unknown;
    protocol: AiStreamProtocol;
    headers: Record<string, string>;
  }> {
    const config = AppConfig.get();
    const { provider, model, context, threadSettings, executionOptions, baseUrl, apiKey } = args;
    if (args.isOllamaConnector) {
      // Native Ollama emits `message.tool_calls` complete in a single NDJSON
      // frame rather than fragmented, and the reader accumulates it the same
      // way it does OpenAI deltas.
      return {
        url: `${baseUrl}/chat`,
        body: {
          ...this.buildOllamaChatRequestBody(model, context, threadSettings, executionOptions),
          stream: true,
        },
        protocol: AiStreamProtocol.OLLAMA_NDJSON,
        headers: { Authorization: `Bearer ${apiKey}` },
      };
    }
    if (provider === ANTHROPIC_PROVIDER && config.ENABLE_ANTHROPIC_NATIVE_PDF) {
      return {
        url: `${baseUrl}/chat/completions`,
        body: this.buildAnthropicNativeStreamingBody(
          model,
          context,
          threadSettings,
          executionOptions,
        ),
        protocol: AiStreamProtocol.OPENAI_SSE,
        headers: { Authorization: `Bearer ${apiKey}` },
      };
    }
    return {
      url: `${baseUrl}/chat/completions`,
      body: this.buildStreamingChatBody(provider, model, context, threadSettings, executionOptions),
      protocol: AiStreamProtocol.OPENAI_SSE,
      headers: { Authorization: `Bearer ${apiKey}` },
    };
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
        body: this.buildStreamingChatBody(
          provider,
          model,
          context,
          threadSettings,
          executionOptions,
        ),
        protocol: AiStreamProtocol.OPENAI_SSE,
        startMs: startTime,
        promptTokensEstimate: this.estimatePromptTokens(context),
        maxOutputTokens: executionOptions?.maxOutputTokens,
        timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
      },
      usedFallback,
      executionOptions,
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

  // Ollama Cloud streaming path. Native /api/chat streaming cannot be
  // re-driven mid-stream after the client executes a tool_call, so for
  // agentic models (deepseek-v4-pro / kimi-k2 / GLM-5.1) we MUST run
  // the buffered tool loop and replay the final answer as simulated
  // chunks. Non-agentic Ollama Cloud models simply do one buffered
  // call with no tool_calls and the same replay path applies.
  private async simulateOllamaCloudStream(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    streamContext: StreamContext,
  ): Promise<LlmResponse> {
    const executor = this.providerStreamExecutor;
    const buffered = await this.callCloudProvider(
      provider,
      model,
      context,
      startTime,
      usedFallback,
      threadSettings,
      executionOptions,
      streamContext,
    );
    if (executor !== undefined) {
      await executor.runSimulated({
        threadId: streamContext.threadId,
        messageId: streamContext.messageId,
        laneId: streamContext.laneId,
        parallelGroupId: streamContext.parallelGroupId,
        provider,
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

  private async simulateGeminiNativeStream(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    streamContext: StreamContext,
  ): Promise<LlmResponse> {
    const executor = this.providerStreamExecutor;
    const cancellation = this.streamCancellation;
    if (cancellation === undefined) {
      throw new BusinessException('Streaming dependencies unavailable', 'STREAM_NOT_AVAILABLE');
    }
    const cancelKey = streamContext.laneId ?? streamContext.threadId;
    const controller = cancellation.register(cancelKey);
    try {
      const buffered = await this.callCloudProvider(
        provider,
        model,
        context,
        startTime,
        usedFallback,
        threadSettings,
        executionOptions,
        streamContext,
        controller.signal,
      );
      if (executor === undefined) {
        return buffered;
      }
      const replay = await executor.runSimulated({
        threadId: streamContext.threadId,
        messageId: streamContext.messageId,
        laneId: streamContext.laneId,
        parallelGroupId: streamContext.parallelGroupId,
        provider,
        model: buffered.model,
        fullContent: buffered.content,
        inputTokens: buffered.inputTokens,
        outputTokens: buffered.outputTokens,
        startMs: startTime,
        promptTokensEstimate: this.estimatePromptTokens(context),
        maxOutputTokens: executionOptions?.maxOutputTokens,
        abortSignal: controller.signal,
      });
      return replay.cancelled
        ? {
            ...buffered,
            content: replay.content,
            outputTokens: replay.outputTokens ?? estimateTokensFromText(replay.content),
            finishReason: 'cancelled',
          }
        : buffered;
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        throw new BusinessException('Generation cancelled', 'STREAM_CANCELLED');
      }
      throw error;
    } finally {
      cancellation.release(cancelKey);
    }
  }

  private async runExecutor(
    base: Omit<StreamExecutionInput, 'abortSignal'>,
    usedFallback: boolean,
    executionOptions?: ExecutionOptions,
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
      // The stream's protocol determines the tool dialect: an OpenAI-SSE run
      // fragments `arguments` as a JSON string, an Ollama-NDJSON run delivers
      // it as an object. The reader emits whichever its protocol produced.
      const toolCalls = this.extractNativeToolCalls(
        result.toolCalls,
        base.provider,
        base.protocol === AiStreamProtocol.OLLAMA_NDJSON
          ? ProviderToolDialect.OLLAMA
          : ProviderToolDialect.OPENAI,
        executionOptions,
      );
      // A tool-call turn streams NO content — the model is requesting a tool,
      // not answering. This is the streaming twin of the buffered
      // CLOUD_PROVIDER_EMPTY_RESPONSE trap: without the tool-call check, every
      // successful streamed tool call would terminate the run as an empty
      // response.
      if (result.content.trim().length === 0 && !result.cancelled && toolCalls.length === 0) {
        throw new BusinessException(
          `Provider ${base.provider} returned no content`,
          'STREAM_EMPTY_RESPONSE',
        );
      }
      const finishReason = result.cancelled ? 'cancelled' : (result.finishReason ?? 'stop');
      // Bug-hunt 2026-05-31, Fix 2 — when the model stopped because it
      // hit the ctx/length cap, leave a loud trail in the logs so an
      // operator scrolling through chat-service output can correlate a
      // mid-sentence reply with ctx exhaustion. The FE banner (driven by
      // metadata.truncatedAtContextLimit) is the user-visible signal.
      if (finishReason === 'length') {
        this.logger.warn(
          `runExecutor: finish_reason=length — likely ctx_size exhausted; provider=${base.provider} model=${base.model} promptTokens=${String(base.promptTokensEstimate)} outputLen=${String(result.content.length)}`,
        );
      }
      return {
        content: result.content,
        provider: base.provider,
        model: base.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens ?? estimateTokensFromText(result.content),
        latencyMs: Date.now() - base.startMs,
        finishReason,
        usedFallback,
        // Carried so it can be persisted. Empty for a model that emits none,
        // and omitted entirely rather than stored as an empty string.
        ...(result.reasoning.trim().length > 0 ? { reasoning: result.reasoning } : {}),
        ...(toolCalls.length > 0
          ? {
              toolCalls,
              finishedForTools: finishReason === OPENAI_TOOL_CALLS_FINISH_REASON,
            }
          : {}),
        ...this.buildSpeedReport(base, result, executionOptions),
      };
    } finally {
      cancellation.release(cancelKey);
    }
  }

  private buildStreamingChatBody(
    provider: string,
    model: string,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
  ): OpenAiChatRequest {
    const body = this.buildChatRequestBody(
      provider,
      model,
      context,
      threadSettings,
      executionOptions,
    );
    // Bug-hunt 2026-05-31, Fix 3 — when neither the caller nor the thread
    // pinned a max_tokens, compute a safe default from the resident
    // ctx size minus the prompt estimate minus a safety margin. This
    // bounds runaway generation AND lets `finish_reason: 'length'`
    // signal "we hit OUR cap" rather than "we hit the runtime's
    // ctx ceiling" (which is silent and mid-sentence).
    //
    // Bug-hunt 2026-05-31, Fix 4 — the ctx baseline is now provider-aware
    // (local-ollama → 4_096, all others → 32_768) so CPU local-ollama
    // models don't time out trying to produce ~31_500 tokens.
    body.max_tokens ??= computeDefaultMaxTokens(
      pickDefaultCtxSizeForProvider(provider),
      this.estimatePromptTokens(context),
    );
    if (body.tools !== undefined) {
      this.logger.debug(
        `buildStreamingChatBody: streaming with ${String(body.tools.length)} native tool(s) — ProviderStreamReader merges tool_call deltas by index`,
      );
    }
    return {
      ...body,
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
    let executionPath: ExecutionMetadata['executionPath'] = 'standard';
    if (fastPathEscalated) {
      executionPath = 'fast_escalated';
    } else if (executionOptions.fastPathEnabled) {
      executionPath = 'fast';
    }
    return {
      fastPathUsed: executionOptions.fastPathEnabled,
      fastPathEscalated,
      executionPath,
      targetLatencyMs: executionOptions.fastPathEnabled
        ? FAST_PATH_TARGET_LATENCY_MS
        : STANDARD_TARGET_LATENCY_MS,
    };
  }

  /**
   * The error a caller should see when every candidate failed.
   *
   * A specific failure is worth keeping: a manual model selection has no
   * fallback, and "request failed with status 401" tells the user exactly what
   * to fix, where a generic chain message would not. What must NOT survive is
   * the vendor's own response body — a credit-exhausted Gemini put raw JSON
   * with a billing URL into the chat transcript as though the assistant had
   * said it. So the original error is preserved unless its message is itself a
   * provider payload, which is precisely the leak.
   */
  private buildChainFailureError(lastError: unknown, attempts: AttemptRecord[]): unknown {
    if (lastError === undefined || lastError === null) {
      return new BusinessException(
        this.describeChainFailure(attempts, lastError),
        'LLM_EXECUTION_FAILED',
      );
    }
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    if (isProviderErrorResponse(message)) {
      return new BusinessException(
        this.describeChainFailure(attempts, lastError),
        'LLM_EXECUTION_FAILED',
      );
    }
    return lastError;
  }

  /**
   * A user-facing summary of an exhausted fallback chain.
   *
   * Names which providers were tried, because "all providers failed" with a
   * one-provider chain and with a six-provider chain are very different
   * situations and the difference is what the operator needs. Vendor text is
   * deliberately excluded: it is unbounded, it has carried billing URLs and
   * account identifiers, and it reads as though the assistant said it.
   */
  private describeChainFailure(attempts: AttemptRecord[], lastError: unknown): string {
    const tried = attempts
      .map((attempt) => `${attempt.provider}/${attempt.model}`)
      .filter((label, index, all) => all.indexOf(label) === index);
    if (tried.length === 0) {
      return lastError instanceof BusinessException
        ? lastError.message
        : 'No AI provider could be reached. Please try again shortly.';
    }
    return `Every available AI provider failed to respond (tried ${tried.join(', ')}). Please try again shortly.`;
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

  private failExecution(lastError: unknown, attempts: AttemptRecord[]): never {
    const finalError = this.buildChainFailureError(lastError, attempts);
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
      criticEnabled: payload.judgeEnabled === true && payload.criticEnabled === true,
      criticModel:
        payload.judgeEnabled === true && payload.criticEnabled === true
          ? (payload.criticModel ?? threadSettings?.criticModel ?? null)
          : null,
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

  // Refuses a deployment that is no longer offered. Fails closed: if
  // connector-service cannot answer, the execution does not happen. Cached
  // briefly inside the client so a busy thread does not add a hop per turn.
  private async assertExposedForExecution(provider: string, model: string): Promise<void> {
    const startedAt = Date.now();
    if (await this.modelExposure.isExposed(provider, model)) {
      this.authorizationMetrics.recordAllowed(Date.now() - startedAt);
      return;
    }
    // Counted apart from the entry gate. A refusal here means a model got past
    // the front door and was still stopped — a routing or fallback path chose
    // it — which is a different thing to investigate than a user asking for a
    // model they are not entitled to.
    this.authorizationMetrics.recordDenied(
      ModelAuthorizationDenialReason.EXECUTION_EXPOSURE,
      Date.now() - startedAt,
    );
    this.logger.warn(`callProvider: refused unexposed model ${provider}/${model}`);
    throw new BusinessException(
      'The selected model is not available',
      'MODEL_NOT_EXPOSED',
      HttpStatus.FORBIDDEN,
    );
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
    // The last gate before a provider is called, and the only one every
    // execution path shares: manual sends, AUTO, fallback, escalation,
    // consensus and compare all arrive here. Checking exposure at this single
    // point is what stops a model nobody exposed from executing no matter which
    // route reached it — a manual send is refused earlier, but an AUTO decision
    // or a fallback promotion is chosen by the router, not the caller.
    await this.assertExposedForExecution(provider, model);
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
    // Defensive default: same rationale as buildOllamaChatRequestBody — Ollama
    // Cloud's server-side num_predict default is too low for long answers.
    // Bug-hunt 2026-05-31, Fix 4 — pick the ctx baseline by provider so
    // local-ollama gets a tight 4_096 default and won't time out on CPU.
    const effectiveMaxTokens =
      maxTokens ??
      computeDefaultMaxTokens(
        pickDefaultCtxSizeForProvider(provider),
        estimateTokensFromText(`${systemPrompt}\n${userPrompt}`),
      );
    const cappedMaxTokens = Math.min(effectiveMaxTokens, HARD_MAX_OUTPUT_TOKENS);
    const body: OpenAiChatRequest | OllamaChatRequest = isOllamaConnector
      ? {
          model,
          messages,
          stream: false,
          options: { num_predict: cappedMaxTokens },
        }
      : {
          model,
          messages,
          stream: false,
          max_tokens: cappedMaxTokens,
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
        providerFailureCode(response.status),
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
    // `/api/generate` is prompt-completion — no message array, no roles,
    // nothing to attach tools to. When this call carries a Runtime V2 tool
    // catalog it must go to the native `/chat` surface instead, which is the
    // only local-Ollama path that can express a tool call at all.
    if (this.hasNativeToolCatalog(executionOptions)) {
      return this.callOllamaChat(
        resolvedModel,
        context,
        startTime,
        usedFallback,
        threadSettings,
        executionOptions,
      );
    }
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

  // Local-Ollama agent lane. Reuses the exact same translation, transcript
  // rendering and reverse mapping as the Cloud-Ollama lane — the only
  // difference is the hop through ollama-service rather than a direct call.
  private async callOllamaChat(
    resolvedModel: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
  ): Promise<LlmResponse> {
    const config = AppConfig.get();
    const body = this.buildOllamaChatRequestBody(
      resolvedModel,
      context,
      threadSettings,
      executionOptions,
    );
    this.logger.log(
      `callOllamaChat: POST /ollama/chat model=${resolvedModel} tools=${String(body.tools?.length ?? 0)}`,
    );
    const response = await httpRequest<OllamaChatResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/chat`,
      method: 'POST',
      body: { ...body, model: resolvedModel, keepAlive: config.OLLAMA_KEEP_ALIVE },
      timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
    });
    if (!response.ok) {
      const errorMessage = this.extractHttpErrorMessage(
        response.data,
        `Ollama service returned status ${String(response.status)}`,
      );
      this.logger.error(`callOllamaChat: failed status=${String(response.status)}`);
      throw new BusinessException(errorMessage, 'OLLAMA_REQUEST_FAILED');
    }
    return this.parseOllamaChatResponse(
      response.data,
      OLLAMA_PROVIDER,
      resolvedModel,
      startTime,
      usedFallback,
      this.buildPromptTextForEstimate(context),
      executionOptions,
    );
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
    const resolvedMaxOutputTokens =
      executionOptions?.maxOutputTokens ??
      this.resolveMaxOutputTokens('AUTO', threadSettings, false, originalModel);
    // Bug-hunt 2026-05-31, Fix 3 — local Ollama manages ctx internally,
    // but we still want to pass an explicit `num_predict` from our side
    // so the runtime cannot silently truncate at its own ceiling. When
    // neither the caller nor the thread pinned a cap, compute a safe
    // default from `ctxSize - promptTokensEstimate - SAFETY_MARGIN`.
    //
    // Bug-hunt 2026-05-31, Fix 4 — this is the local-Ollama path; we
    // explicitly use the OLLAMA_PROVIDER baseline (4_096) here so CPU
    // 14B/27B models don't time out trying to produce ~31_500 tokens
    // inside the 5-min HTTP timeout.
    const maxOutputTokens =
      resolvedMaxOutputTokens ??
      computeDefaultMaxTokens(
        pickDefaultCtxSizeForProvider(OLLAMA_PROVIDER),
        estimateTokensFromText(prompt),
      );
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
      // Propagate the truthful done_reason ("length", "stop", "tool_calls", …)
      // from Ollama when present so the truncation signal survives — the
      // previous boolean fallback (`done ? 'stop' : 'incomplete'`) was
      // throwing away `done_reason: 'length'` and hiding mid-sentence
      // ctx-size exhaustion. Bug-hunt 2026-05-31, Fix 2.
      finishReason: data.done_reason ?? (data.done ? 'stop' : 'incomplete'),
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
    const requestBody = this.buildChatRequestBody(
      provider,
      model,
      context,
      threadSettings,
      executionOptions,
    );
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
      executionOptions,
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
    _streamContext?: StreamContext,
    abortSignal?: AbortSignal,
  ): Promise<LlmResponse> {
    this.logger.log(`callCloudProvider: calling ${provider}/${model}`);
    const config = AppConfig.get();
    this.logger.debug(`callCloudProvider: resolving provider config for ${provider}`);
    const { baseUrl, apiKey } = await this.resolveProviderConfig(provider);
    this.logger.debug(`callCloudProvider: config resolved — baseUrl=${baseUrl}`);

    const isOllamaConnector = provider === OLLAMA_CONNECTOR_PROVIDER;
    const isNativeGemini = this.shouldUseGeminiNativeRequest(provider, context);
    const requestBody = await this.buildCloudProviderRequestBody({
      provider,
      model,
      context,
      apiKey,
      threadSettings,
      executionOptions,
      isOllamaConnector,
      abortSignal,
    });
    const url = this.resolveCloudProviderUrl(baseUrl, model, isOllamaConnector, isNativeGemini);
    this.logger.debug(
      `callCloudProvider: request body built — messageCount=${String(this.countCloudRequestMessages(requestBody))}`,
    );
    this.logger.debug(`callCloudProvider: sending POST to ${url}`);
    const responseData = await this.postCloudProviderRequest(
      provider,
      url,
      apiKey,
      isNativeGemini,
      requestBody,
      config.OLLAMA_GENERATE_TIMEOUT_MS,
      abortSignal,
    );
    this.logger.debug('callCloudProvider: parsing cloud response');
    const promptText = this.buildPromptTextForEstimate(context);
    const result = this.parseCloudProviderResponse(
      responseData,
      isNativeGemini,
      provider,
      model,
      startTime,
      usedFallback,
      promptText,
      executionOptions,
    );
    this.logger.log(
      `callCloudProvider: completed ${provider}/${model} latencyMs=${String(result.latencyMs)} inputTokens=${String(result.inputTokens ?? 0)} outputTokens=${String(result.outputTokens ?? 0)}`,
    );
    return result;
  }

  private resolveCloudProviderUrl(
    baseUrl: string,
    model: string,
    isOllamaConnector: boolean,
    isNativeGemini: boolean,
  ): string {
    if (isOllamaConnector) {
      return `${baseUrl}/chat`;
    }
    if (isNativeGemini) {
      const trimmedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const nativeBaseUrl = trimmedBaseUrl.endsWith(GEMINI_OPENAI_COMPATIBILITY_SUFFIX)
        ? trimmedBaseUrl.slice(0, -GEMINI_OPENAI_COMPATIBILITY_SUFFIX.length)
        : trimmedBaseUrl;
      return `${nativeBaseUrl}/models/${encodeURIComponent(model)}:generateContent`;
    }
    return `${baseUrl}/chat/completions`;
  }

  private countCloudRequestMessages(requestBody: CloudProviderRequestBody): number {
    return 'messages' in requestBody ? requestBody.messages.length : requestBody.contents.length;
  }

  private async postCloudProviderRequest(
    provider: string,
    url: string,
    apiKey: string,
    isNativeGemini: boolean,
    requestBody: CloudProviderRequestBody,
    timeoutMs: number,
    abortSignal?: AbortSignal,
  ): Promise<OpenAiChatResponse | OllamaChatResponse | GeminiGenerateContentResponse> {
    const response = await httpRequest<
      OpenAiChatResponse | OllamaChatResponse | GeminiGenerateContentResponse
    >({
      url,
      method: 'POST',
      headers: isNativeGemini
        ? { 'x-goog-api-key': apiKey }
        : { Authorization: `Bearer ${apiKey}` },
      body: requestBody,
      timeoutMs,
      signal: abortSignal,
    });
    if (!response.ok) {
      const errorMessage = this.extractHttpErrorMessage(
        response.data,
        `Cloud provider ${provider} returned status ${String(response.status)}`,
      );
      this.logger.error(
        `callCloudProvider: ${provider} returned error status=${String(response.status)} message=${errorMessage}`,
      );
      throw new BusinessException(errorMessage, providerFailureCode(response.status));
    }
    return response.data;
  }

  private parseCloudProviderResponse(
    data: OpenAiChatResponse | OllamaChatResponse | GeminiGenerateContentResponse,
    isNativeGemini: boolean,
    provider: string,
    model: string,
    startTime: number,
    usedFallback: boolean,
    promptText: string,
    executionOptions?: ExecutionOptions,
  ): LlmResponse {
    if (isNativeGemini) {
      return this.parseGeminiResponse(
        data as GeminiGenerateContentResponse,
        provider,
        model,
        startTime,
        usedFallback,
        promptText,
      );
    }
    if (provider === OLLAMA_CONNECTOR_PROVIDER) {
      return this.parseOllamaChatResponse(
        data as OllamaChatResponse,
        provider,
        model,
        startTime,
        usedFallback,
        promptText,
        executionOptions,
      );
    }
    return this.parseCloudResponse(
      data as OpenAiChatResponse,
      provider,
      model,
      startTime,
      usedFallback,
      promptText,
      executionOptions,
    );
  }

  // Ollama Cloud agentic tool loop.
  //
  // Posts /api/chat with tools enabled, and while the model emits
  // `tool_calls`, executes each call via /api/web_search or /api/web_fetch,
  // appends the result as a `tool` message, and re-POSTs. Returns the
  // final LlmResponse with `toolTranscript` set so the FE can render an
  // expandable trace under the assistant message.
  //
  // Caps: OLLAMA_TOOL_LOOP_MAX_ITERATIONS turns,
  // OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS wall clock (both env-overridable
  // via AppConfig — see `app.config.ts`). When either cap is hit, the
  // loop emits a TOOL_LOOP_CAP_REACHED lifecycle event and issues ONE
  // final POST without the `tools` field, forcing the model to produce a
  // text-only synthesis from the evidence already gathered. The
  // transcript carries `capReached=true` AND `gracefullyWrapped=true` on
  // that path. If the wrap-up POST itself fails, the partial accumulated
  // content is returned with `gracefullyWrapped=false` so the FE can
  // render a clear error hint instead of a misleading complete answer.
  async runOllamaCloudToolLoop(args: {
    provider: string;
    model: string;
    initialBody: OllamaChatRequest;
    baseUrl: string;
    apiKey: string;
    startTime: number;
    usedFallback: boolean;
    context: AssembledContext;
    streamThreadId?: string;
  }): Promise<LlmResponse> {
    const { provider, model, initialBody, baseUrl, apiKey, startTime, streamThreadId } = args;
    const config = AppConfig.get();
    const url = `${baseUrl}/chat`;
    const maxIterations = config.OLLAMA_TOOL_LOOP_MAX_ITERATIONS;
    const totalTimeoutMs = config.OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS;
    const loopResult = await this.driveToolLoopTurns({
      url,
      apiKey,
      baseUrl,
      provider,
      model,
      initialBody,
      startTime,
      streamThreadId,
      maxIterations,
      totalTimeoutMs,
      generateTimeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
      userId: args.context.userId,
      usageRunId: `${streamThreadId ?? 'buffered'}:${String(startTime)}`,
    });
    // Graceful wrap-up — when we hit either cap with pending tool_calls,
    // issue one final POST with NO `tools` so the model is forced to
    // synthesize an answer from the evidence already gathered. Replaces
    // the previous behaviour of returning a generic "safety cap" error
    // string as the user-visible reply.
    let { lastData } = loopResult;
    let gracefullyWrapped = false;
    if (loopResult.capReached) {
      const wrapUp = await this.runToolLoopWrapUp({
        url,
        apiKey,
        initialBody,
        messages: loopResult.messages,
        provider,
        timeoutMs: config.OLLAMA_GENERATE_TIMEOUT_MS,
        streamThreadId,
        maxIterations,
        totalTimeoutMs,
      });
      if (wrapUp !== null) {
        lastData = wrapUp;
        gracefullyWrapped = true;
      }
    }

    return this.finalizeToolLoopResult({
      provider,
      model,
      usedFallback: args.usedFallback,
      context: args.context,
      startTime,
      iteration: loopResult.iteration,
      capReached: loopResult.capReached,
      gracefullyWrapped,
      turns: loopResult.turns,
      lastData,
    });
  }

  // Drives the agentic turn loop until either the model stops emitting
  // tool_calls, the iteration cap, or the wall-clock budget is hit.
  // Mutates a local `messages` list with assistant + tool messages so the
  // wrap-up POST sees the full history. Returns the accumulated transcript
  // turns, the final response, and whether either cap fired.
  private async driveToolLoopTurns(args: {
    url: string;
    apiKey: string;
    baseUrl: string;
    provider: string;
    model: string;
    initialBody: OllamaChatRequest;
    startTime: number;
    streamThreadId: string | undefined;
    maxIterations: number;
    totalTimeoutMs: number;
    generateTimeoutMs: number;
    userId: string;
    usageRunId: string;
  }): Promise<{
    iteration: number;
    capReached: boolean;
    turns: OllamaToolTranscriptTurn[];
    messages: OllamaChatMessage[];
    lastData: OllamaChatResponse | undefined;
  }> {
    const messages: OllamaChatMessage[] = [...args.initialBody.messages];
    const turns: OllamaToolTranscriptTurn[] = [];
    let iteration = 0;
    let capReached = false;
    let lastData: OllamaChatResponse | undefined;
    while (iteration < args.maxIterations) {
      iteration += 1;
      if (this.toolLoopTimedOut(args.startTime, iteration, args.totalTimeoutMs)) {
        capReached = true;
        break;
      }
      const turnResult = await this.postOneToolLoopTurn({
        url: args.url,
        apiKey: args.apiKey,
        initialBody: args.initialBody,
        messages,
        provider: args.provider,
        iteration,
        timeoutMs: args.generateTimeoutMs,
      });
      lastData = turnResult.data;
      if (turnResult.toolCalls.length === 0) {
        break;
      }
      await this.advanceToolLoopWithToolCalls({
        messages,
        turns,
        turnContent: turnResult.content,
        toolCalls: turnResult.toolCalls,
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        timeoutMs: args.generateTimeoutMs,
        streamThreadId: args.streamThreadId,
        provider: args.provider,
        model: args.model,
        iteration,
        userId: args.userId,
        usageRunId: args.usageRunId,
      });
    }
    if (this.toolLoopExhaustedWithPendingCalls(iteration, lastData, args.maxIterations)) {
      capReached = true;
    }
    return { iteration, capReached, turns, messages, lastData };
  }

  // Issues ONE final POST without the `tools` field, asking the model to
  // synthesize a comprehensive answer from the evidence already gathered.
  // Emits a TOOL_LOOP_CAP_REACHED lifecycle event before the POST so the
  // FE can render a "research budget reached" hint. Returns the parsed
  // response on success, or `null` if the POST itself fails — the caller
  // falls back to the partial accumulated content with
  // `gracefullyWrapped=false` in that case.
  private async runToolLoopWrapUp(args: {
    url: string;
    apiKey: string;
    initialBody: OllamaChatRequest;
    messages: OllamaChatMessage[];
    provider: string;
    timeoutMs: number;
    streamThreadId: string | undefined;
    maxIterations: number;
    totalTimeoutMs: number;
  }): Promise<OllamaChatResponse | null> {
    const { url, apiKey, initialBody, messages, provider, timeoutMs, streamThreadId } = args;
    this.emitToolLoopCapReached(streamThreadId, args.maxIterations, args.totalTimeoutMs);
    const wrappedMessages: OllamaChatMessage[] = [
      ...messages,
      { role: 'system', content: OLLAMA_TOOL_LOOP_WRAPUP_INSTRUCTION },
    ];
    // Strip the `tools` field so the model has no choice but to produce
    // a text answer. Keep every other initialBody knob (model, options,
    // temperature, …) so the wrap-up call stays consistent with the run.
    const { tools: _omittedTools, ...rest } = initialBody as OllamaChatRequest & {
      tools?: unknown;
    };
    const body: OllamaChatRequest = { ...rest, messages: wrappedMessages };
    try {
      const response = await httpRequest<OllamaChatResponse>({
        url,
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
        timeoutMs,
      });
      if (!response.ok) {
        this.logger.warn(
          `runToolLoopWrapUp: ${provider} wrap-up POST failed status=${String(response.status)} — falling back to partial content`,
        );
        return null;
      }
      const content = response.data.message?.content ?? '';
      this.logger.log(
        `runToolLoopWrapUp: wrap-up synthesized ${String(content.length)} chars for ${provider}`,
      );
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        `runToolLoopWrapUp: wrap-up POST threw — ${message} — falling back to partial content`,
      );
      return null;
    }
  }

  // SSE lifecycle event so the FE can render a small "research budget
  // reached — synthesizing a final answer" note under the assistant
  // message while the wrap-up POST is in flight.
  private emitToolLoopCapReached(
    threadId: string | undefined,
    maxIterations: number,
    totalTimeoutMs: number,
  ): void {
    if (threadId === undefined) {
      return;
    }
    this.chatStreamService.emitProgressStage(threadId, StreamEventType.TOOL_LOOP_CAP_REACHED, {
      label: 'Research budget reached',
      description: `Synthesizing a final answer from the evidence already gathered (cap: ${String(maxIterations)} turns / ${String(Math.round(totalTimeoutMs / 1000))}s).`,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Ollama agentic tools',
      stageId: 'ollama-tool:cap-reached',
      status: 'active',
    });
  }

  // Wall-clock guard for the agentic loop. Returns true (and warns) when
  // the cumulative elapsed time since loop entry exceeds the configured
  // total budget, so the outer loop can flip capReached and bail.
  private toolLoopTimedOut(startTime: number, iteration: number, totalTimeoutMs: number): boolean {
    const elapsed = Date.now() - startTime;
    if (elapsed >= totalTimeoutMs) {
      this.logger.warn(
        `runOllamaCloudToolLoop: total timeout reached after ${String(elapsed)}ms — capping at turn ${String(iteration - 1)}`,
      );
      return true;
    }
    return false;
  }

  // POST one /chat turn and return the parsed message + tool_calls. Throws
  // CLOUD_PROVIDER_REQUEST_FAILED on non-2xx so the caller bubbles up to
  // the normal cloud-provider error path.
  private async postOneToolLoopTurn(args: {
    url: string;
    apiKey: string;
    initialBody: OllamaChatRequest;
    messages: OllamaChatMessage[];
    provider: string;
    iteration: number;
    timeoutMs: number;
  }): Promise<{ data: OllamaChatResponse; toolCalls: OllamaCloudToolCall[]; content: string }> {
    const { url, apiKey, initialBody, messages, provider, iteration, timeoutMs } = args;
    const body: OllamaChatRequest = { ...initialBody, messages };
    this.logger.debug(
      `runOllamaCloudToolLoop: turn=${String(iteration)} POST ${url} messageCount=${String(messages.length)}`,
    );
    const response = await httpRequest<OllamaChatResponse>({
      url,
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      timeoutMs,
    });
    if (!response.ok) {
      const errorMessage = this.extractHttpErrorMessage(
        response.data,
        `Cloud provider ${provider} returned status ${String(response.status)}`,
      );
      this.logger.error(
        `runOllamaCloudToolLoop: turn=${String(iteration)} ${provider} returned status=${String(response.status)} message=${errorMessage}`,
      );
      throw new BusinessException(errorMessage, providerFailureCode(response.status));
    }
    const toolCalls = response.data.message?.tool_calls ?? [];
    const content = response.data.message?.content ?? '';
    this.logger.debug(
      `runOllamaCloudToolLoop: turn=${String(iteration)} contentLen=${String(content.length)} toolCalls=${String(toolCalls.length)}`,
    );
    return { data: response.data, toolCalls, content };
  }

  // When the model emitted tool_calls in a turn, echo the assistant
  // message (carrying the tool_calls) back into history, dispatch every
  // tool, then append each result as a `tool` message ready for the next
  // turn's POST. Mutates `messages` and `turns` in place.
  private async advanceToolLoopWithToolCalls(args: {
    messages: OllamaChatMessage[];
    turns: OllamaToolTranscriptTurn[];
    turnContent: string;
    toolCalls: OllamaCloudToolCall[];
    baseUrl: string;
    apiKey: string;
    timeoutMs: number;
    streamThreadId: string | undefined;
    provider: string;
    model: string;
    iteration: number;
    userId: string;
    usageRunId: string;
  }): Promise<void> {
    const { messages, turns, turnContent, toolCalls } = args;
    messages.push({ role: 'assistant', content: turnContent, tool_calls: toolCalls });
    const toolResults = await this.executeToolCalls({
      toolCalls,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      timeoutMs: args.timeoutMs,
      streamThreadId: args.streamThreadId,
      provider: args.provider,
      model: args.model,
      iteration: args.iteration,
      userId: args.userId,
      usageRunId: args.usageRunId,
    });
    for (const entry of toolResults) {
      messages.push({ role: 'tool', content: entry.result, tool_call_id: entry.toolCallId });
      turns.push(entry.transcriptTurn);
    }
  }

  // True iff the loop hit the iteration cap AND the model was still
  // emitting tool_calls — i.e. the agent failed to converge on an answer
  // within OLLAMA_TOOL_LOOP_MAX_ITERATIONS turns.
  private toolLoopExhaustedWithPendingCalls(
    iteration: number,
    lastData: OllamaChatResponse | undefined,
    maxIterations: number,
  ): boolean {
    if (iteration < maxIterations || lastData === undefined) {
      return false;
    }
    const stillCalling = (lastData.message?.tool_calls ?? []).length > 0;
    if (stillCalling) {
      this.logger.warn(
        `runOllamaCloudToolLoop: max iterations (${String(maxIterations)}) reached with tool_calls still pending`,
      );
    }
    return stillCalling;
  }

  // Build the final LlmResponse for the agentic loop: resolves visible
  // content (falling back to a cap-reached marker if empty), computes
  // token usage + latency, and attaches the tool-transcript metadata for
  // FE rendering. When `gracefullyWrapped=true`, the lastData carries
  // the synthesized wrap-up answer; otherwise the cap-reached marker is
  // used so the user sees a clear hint rather than empty text.
  private finalizeToolLoopResult(args: {
    provider: string;
    model: string;
    usedFallback: boolean;
    context: AssembledContext;
    startTime: number;
    iteration: number;
    capReached: boolean;
    gracefullyWrapped: boolean;
    turns: OllamaToolTranscriptTurn[];
    lastData: OllamaChatResponse | undefined;
  }): LlmResponse {
    const {
      provider,
      model,
      usedFallback,
      context,
      startTime,
      iteration,
      capReached,
      gracefullyWrapped,
      turns,
      lastData,
    } = args;
    const finalContent = this.resolveFinalToolLoopContent(
      lastData,
      capReached,
      gracefullyWrapped,
      turns.length,
    );
    const promptText = this.buildPromptTextForEstimate(context);
    const usage = extractOllamaUsage(lastData ?? {}, { promptText, completionText: finalContent });
    const latencyMs = Date.now() - startTime;
    const transcript: OllamaToolTranscript = {
      turns,
      iterations: iteration,
      capReached,
      totalDurationMs: latencyMs,
      ...(capReached ? { gracefullyWrapped } : {}),
    };
    this.logger.log(
      `runOllamaCloudToolLoop: completed ${provider}/${model} turns=${String(turns.length)} iterations=${String(iteration)} capReached=${String(capReached)} gracefullyWrapped=${String(gracefullyWrapped)} latencyMs=${String(latencyMs)} contentLen=${String(finalContent.length)}`,
    );
    return {
      content: finalContent,
      provider,
      model,
      ...this.buildTokenUsageFields(usage),
      latencyMs,
      finishReason: lastData?.done_reason ?? (lastData?.done === true ? 'stop' : undefined),
      usedFallback,
      ...(turns.length > 0 ? { toolTranscript: transcript } : {}),
    };
  }

  // Per-turn dispatcher. Executes every tool_call serially so we can
  // emit lifecycle events in deterministic order and bail fast on the
  // first failure. Each invocation tracks its own transcript entry so
  // the FE can show ok/error per call.
  private async executeToolCalls(args: {
    toolCalls: OllamaCloudToolCall[];
    baseUrl: string;
    apiKey: string;
    timeoutMs: number;
    streamThreadId: string | undefined;
    provider: string;
    model: string;
    iteration: number;
    userId: string;
    usageRunId: string;
  }): Promise<
    Array<{ toolCallId: string; result: string; transcriptTurn: OllamaToolTranscriptTurn }>
  > {
    const results: Array<{
      toolCallId: string;
      result: string;
      transcriptTurn: OllamaToolTranscriptTurn;
    }> = [];
    let index = 0;
    for (const call of args.toolCalls) {
      const i = index;
      index += 1;
      const callStart = Date.now();
      const toolName = call.function.name;
      const callId = call.id ?? `${toolName}-${String(args.iteration)}-${String(i)}`;
      this.emitToolLifecycle(
        args.streamThreadId,
        toolName,
        call.function.arguments,
        OllamaToolPhase.STARTED,
      );
      let resultText: string;
      let ok = true;
      let errorMessage: string | undefined;
      try {
        resultText = await executeOllamaCloudToolCall(call, {
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          timeoutMs: args.timeoutMs,
          onDispatch: async () =>
            this.accessControlService.recordFeatureUsage(
              args.userId,
              toolName === TOOL_WEB_SEARCH ? 'WEB_SEARCH' : 'WEB_FETCH',
              `${args.usageRunId}:${String(args.iteration)}:${callId}`,
            ),
        });
      } catch (error: unknown) {
        ok = false;
        errorMessage = error instanceof Error ? error.message : 'unknown';
        // Surface the error to the model so it can recover (e.g. retry
        // with a different URL). Truncate for safety.
        resultText = truncateResult(JSON.stringify({ error: errorMessage, tool: toolName }));
        this.logger.warn(
          `executeToolCalls: tool=${toolName} call_id=${callId} failed — ${errorMessage}`,
        );
      }
      const durationMs = Date.now() - callStart;
      this.emitToolLifecycle(
        args.streamThreadId,
        toolName,
        call.function.arguments,
        OllamaToolPhase.COMPLETED,
      );
      const transcriptTurn: OllamaToolTranscriptTurn = {
        turn: args.iteration,
        tool: toolName,
        args: call.function.arguments,
        resultPreview: resultText.slice(0, 500),
        durationMs,
        ok,
        ...(errorMessage === undefined ? {} : { error: errorMessage }),
      };
      results.push({ toolCallId: callId, result: resultText, transcriptTurn });
    }
    return results;
  }

  private resolveFinalToolLoopContent(
    lastData: OllamaChatResponse | undefined,
    capReached: boolean,
    gracefullyWrapped: boolean,
    turnCount: number,
  ): string {
    const finalContent = lastData?.message?.content ?? '';
    if (finalContent.trim().length > 0) {
      return finalContent;
    }
    // Cap reached AND the wrap-up POST failed (or didn't run) — leave a
    // clear marker so the user knows the assistant ran out of budget
    // before producing a final answer.
    if (capReached && !gracefullyWrapped) {
      const config = AppConfig.get();
      return `The agentic web tool loop exceeded its safety cap (${String(config.OLLAMA_TOOL_LOOP_MAX_ITERATIONS)} turns / ${String(Math.round(config.OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS / 1000))}s) before the model produced a final answer, and the wrap-up synthesis call also failed. ${String(turnCount)} tool call(s) were executed — see the trace below. Please regenerate or shorten the prompt.`;
    }
    return 'The model returned no visible answer. Please regenerate.';
  }

  private emitToolLifecycle(
    threadId: string | undefined,
    toolName: string,
    toolArgs: Record<string, unknown>,
    phase: OllamaToolPhase,
  ): void {
    if (threadId === undefined) {
      return;
    }
    const label = this.buildToolLifecycleLabel(toolName, toolArgs, phase);
    const description = this.buildToolLifecycleDescription(toolName, toolArgs);
    const eventType =
      phase === OllamaToolPhase.STARTED
        ? StreamEventType.TOOL_STARTED
        : StreamEventType.TOOL_COMPLETED;
    const status: VisibleProgressStatus =
      phase === OllamaToolPhase.COMPLETED ? 'completed' : 'active';
    this.chatStreamService.emitProgressStage(threadId, eventType, {
      label,
      description,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Ollama agentic tools',
      stageId: `ollama-tool:${toolName}:${phase}`,
      status,
    });
  }

  private buildToolLifecycleLabel(
    toolName: string,
    toolArgs: Record<string, unknown>,
    phase: OllamaToolPhase,
  ): string {
    const started = phase === OllamaToolPhase.STARTED;
    if (toolName === TOOL_WEB_SEARCH) {
      return started ? 'Searching the web' : 'Web search complete';
    }
    if (toolName === TOOL_WEB_FETCH) {
      return started ? this.buildWebFetchLabel(toolArgs) : 'Page fetched';
    }
    return started ? `Running tool ${toolName}` : `Tool ${toolName} complete`;
  }

  private buildToolLifecycleDescription(
    toolName: string,
    toolArgs: Record<string, unknown>,
  ): string | undefined {
    if (toolName === TOOL_WEB_SEARCH && typeof toolArgs.query === 'string') {
      return `Query: ${toolArgs.query.slice(0, 120)}`;
    }
    if (toolName === TOOL_WEB_FETCH && typeof toolArgs.url === 'string') {
      return `URL: ${toolArgs.url.slice(0, 200)}`;
    }
    return undefined;
  }

  private buildWebFetchLabel(toolArgs: Record<string, unknown>): string {
    const url = typeof toolArgs.url === 'string' ? toolArgs.url : '';
    if (url.length === 0) {
      return 'Fetching page';
    }
    return `Fetching ${url.slice(0, 80)}`;
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

  // Translates the admitted Runtime V2 tool catalog for one request shape.
  //
  // The dialect is a property of the request SHAPE we are about to build, not
  // of the provider: an Anthropic model sent through the OpenAI-compatible
  // body speaks the OpenAI tool dialect. Callers therefore pass the dialect of
  // the branch they took rather than letting this derive it from the provider.
  //
  // Deterministic on its inputs, so calling it again in the response parser
  // reproduces exactly the same reverse-lookup table without threading state.
  private resolveNativeToolCatalog(
    provider: string,
    dialect: ProviderToolDialect,
    executionOptions: ExecutionOptions | undefined,
  ): TranslatedToolCatalog | undefined {
    const definitions = executionOptions?.toolCatalog;
    if (!definitions || definitions.length === 0) {
      return undefined;
    }
    const config = AppConfig.get();
    if (!config.CHAT_NATIVE_TOOL_CALLING_ENABLED || dialect === ProviderToolDialect.NONE) {
      return undefined;
    }
    // Two independent conditions, both required. The shape dialect says the
    // request body CAN carry tools; the provider table says this provider is
    // known to serve them. An unrecognized provider gets no tools even on an
    // OpenAI-compatible body, because we have no evidence it will not simply
    // reject the field.
    if (resolveToolDialect(provider, true) === ProviderToolDialect.NONE) {
      this.logger.warn(
        `resolveNativeToolCatalog: provider ${provider} has no known native tool surface — falling back to the prompt-JSON lane`,
      );
      return undefined;
    }
    const translated = translateToolCatalog(definitions, dialect);
    if (translated.byteSize > config.CHAT_TOOL_CATALOG_MAX_BYTES) {
      throw new BusinessException(
        `Native tool catalog is ${String(translated.byteSize)} bytes, over the ${String(config.CHAT_TOOL_CATALOG_MAX_BYTES)} byte budget`,
        'RUNTIME_TOOL_CATALOG_TOO_LARGE',
      );
    }
    return translated;
  }

  // True when this call is carrying a Runtime V2 tool catalog at all. Used to
  // steer away from request shapes that cannot express our schemas.
  private hasNativeToolCatalog(executionOptions: ExecutionOptions | undefined): boolean {
    return (
      AppConfig.get().CHAT_NATIVE_TOOL_CALLING_ENABLED &&
      (executionOptions?.toolCatalog?.length ?? 0) > 0
    );
  }

  private resolveToolChoiceMode(executionOptions: ExecutionOptions | undefined): ToolChoiceMode {
    return executionOptions?.toolChoice ?? ToolChoiceMode.AUTO;
  }

  // Resolves the requested effort against what this exact model accepts and
  // writes the provider parameter, if any. A downgrade is logged at WARN
  // rather than applied silently: asking for MAX and quietly receiving `low`
  // is indistinguishable from a model that simply reasoned less, and the user
  // paid for the former.
  private resolveEffortForDialect(
    executionOptions: ExecutionOptions | undefined,
    dialect: ProviderToolDialect,
  ): ResolvedEffort | undefined {
    const resolved = resolveExecutionEffort(executionOptions, dialect);
    if (resolved === undefined) {
      return undefined;
    }
    if (isEffortDowngraded(resolved)) {
      this.logger.warn(
        `resolveEffortForDialect: requested ${resolved.requested} resolved to ${resolved.resolvedProfile} (${resolved.resolutionKind}) — ${resolved.warning ?? 'no detail'}`,
      );
    } else if (resolved.warning !== undefined) {
      this.logger.debug(`resolveEffortForDialect: ${resolved.warning}`);
    }
    return resolved;
  }

  // Resolves the requested speed tier. An unavailable tier is logged at WARN
  // and leaves the request at standard service with a 1x multiplier — never a
  // 2x label on a standard run, which would both mislead the user and
  // over-reserve cost for throughput nobody received.
  // Reports what the speed contract granted, with MEASURED throughput attached
  // when the stream actually measured it. Absent when no tier was requested,
  // so ordinary responses are unchanged.
  private buildSpeedReport(
    base: Omit<StreamExecutionInput, 'abortSignal'>,
    result: StreamExecutionResult,
    executionOptions: ExecutionOptions | undefined,
  ): { speed?: ResolvedSpeed } {
    const resolved = resolveExecutionSpeed(
      executionOptions,
      base.protocol === AiStreamProtocol.OLLAMA_NDJSON ? undefined : SPEED_PATH_OPENAI_SERVICE_TIER,
    );
    if (resolved === undefined) {
      return {};
    }
    const observed = buildObservedSpeed(
      result.finalMetrics?.timeToFirstTokenMs,
      result.finalMetrics?.tokensPerSecond,
      Date.now() - base.startMs,
    );
    return { speed: withObservedSpeed(resolved, observed) };
  }

  private resolveSpeedForLane(
    executionOptions: ExecutionOptions | undefined,
    parameterPath: string | undefined,
  ): ResolvedSpeed | undefined {
    const resolved = resolveExecutionSpeed(executionOptions, parameterPath);
    if (resolved === undefined) {
      return undefined;
    }
    if (isSpeedUnavailable(resolved)) {
      this.logger.warn(
        `resolveSpeedForLane: requested ${resolved.requested} unavailable — running standard at ${String(resolved.resourceMultiplier)}x. ${resolved.warning ?? ''}`,
      );
    }
    return resolved;
  }

  // The temperature to actually send, or undefined to send none.
  //
  // A model that has dropped sampling rejects the whole request rather than
  // ignoring the parameter, so an unsupported temperature has to be left out
  // instead of passed through. Silence would be worse than the 400 it prevents,
  // hence the log line: the answer really is less deterministic than the
  // thread's setting asks for.
  private resolveTemperature(
    model: string,
    threadSettings: ThreadSettings | undefined,
    caller: string,
  ): number | undefined {
    const temperature = threadSettings?.temperature;
    if (temperature === null || temperature === undefined) {
      return undefined;
    }
    if (modelRejectsSamplingParams(model)) {
      this.logger.debug(`${caller}: omitting temperature — ${model} rejects sampling params`);
      return undefined;
    }
    this.logger.debug(`${caller}: applying temperature=${String(temperature)}`);
    return temperature;
  }

  private buildChatRequestBody(
    provider: string,
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
    // This builder always emits the OpenAI-compatible shape, so the tool
    // dialect here is unconditionally OPENAI — including for Anthropic models
    // routed through their OpenAI-compatibility surface.
    const toolCatalog = this.resolveNativeToolCatalog(
      provider,
      ProviderToolDialect.OPENAI,
      executionOptions,
    );
    const requestBody: OpenAiChatRequest = {
      model,
      messages: [...requestMessages, ...buildOpenAiToolTurnMessages(context.toolTurns ?? [])],
      stream: false,
    };

    if (toolCatalog) {
      const choice = resolveToolChoicePayload(
        this.resolveToolChoiceMode(executionOptions),
        ProviderToolDialect.OPENAI,
      );
      requestBody.tools = toOpenAiToolSpecs(toolCatalog.specs);
      requestBody.tool_choice = choice.openAi;
      this.logger.debug(
        `buildChatRequestBody: attached ${String(toolCatalog.specs.length)} native tools (${String(toolCatalog.byteSize)} bytes) toolChoice=${String(choice.openAi)}`,
      );
    }

    const openAiEffort = effortLevelForRequest(
      this.resolveEffortForDialect(executionOptions, ProviderToolDialect.OPENAI),
    );
    if (openAiEffort !== undefined) {
      requestBody.reasoning = { effort: openAiEffort };
    }

    const speedTier = speedTierForRequest(
      this.resolveSpeedForLane(executionOptions, SPEED_PATH_OPENAI_SERVICE_TIER),
    );
    if (speedTier !== undefined) {
      requestBody.service_tier = speedTier;
    }

    const temperature = this.resolveTemperature(model, threadSettings, 'buildChatRequestBody');
    if (temperature !== undefined) {
      requestBody.temperature = temperature;
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

  // Slice D — request-body dispatcher used by callCloudProvider. Picks the
  // native Anthropic / Gemini shape when the corresponding feature flag is on
  // and the provider matches; otherwise falls through to the OpenAI-compat
  // shape (which Gemini and OpenAI both accept) or the native Ollama shape
  // for the Cloud Ollama connector.
  private async buildCloudProviderRequestBody(args: {
    provider: string;
    model: string;
    context: AssembledContext;
    apiKey: string;
    threadSettings: ThreadSettings | undefined;
    executionOptions: ExecutionOptions | undefined;
    isOllamaConnector: boolean;
    abortSignal?: AbortSignal;
  }): Promise<CloudProviderRequestBody> {
    const config = AppConfig.get();
    const { provider, model, context, apiKey, threadSettings, executionOptions } = args;
    if (args.isOllamaConnector) {
      return this.buildOllamaChatRequestBody(model, context, threadSettings, executionOptions);
    }
    const carriesTools = this.hasNativeToolCatalog(executionOptions);
    if (provider === ANTHROPIC_PROVIDER && config.ENABLE_ANTHROPIC_NATIVE_PDF) {
      if (carriesTools) {
        // The Anthropic-native branch posts a Messages-shaped body to
        // `/chat/completions` and parses the reply with parseCloudResponse
        // (OpenAI shape). Attaching Anthropic-shaped tools here would produce
        // `tool_use` blocks that this parser cannot read, so the run would
        // look like a silent no-op. Leaving tools off is the truthful outcome:
        // the drift guard then reports a degraded lane instead of a fake one.
        // The ANTHROPIC dialect is fully implemented and tested in
        // provider-tool-translation.utility.ts, ready for a real Messages-API
        // transport. Note that with ENABLE_ANTHROPIC_NATIVE_PDF off (the
        // default) Anthropic falls through to the OpenAI branch below and DOES
        // get native tools.
        this.logger.warn(
          `buildCloudProviderRequestBody: native tools suppressed for ${provider} — the ENABLE_ANTHROPIC_NATIVE_PDF body shape has no matching tool-call parser`,
        );
      }
      return this.buildAnthropicMessagesRequestBody(
        model,
        context,
        threadSettings,
        executionOptions,
        false,
      );
    }
    // Gemini's native generateContent shape uses an OpenAPI subset that rejects
    // `additionalProperties` and `maxLength` — which every Runtime V2
    // inputSchema carries. When tools are in play we must take the
    // OpenAI-compatible branch instead, which accepts the schemas verbatim.
    if (!carriesTools && this.shouldUseGeminiNativeRequest(provider, context)) {
      return this.buildGeminiNativeRequestBody(
        model,
        context,
        apiKey,
        threadSettings,
        executionOptions,
        args.abortSignal,
      );
    }
    return this.buildChatRequestBody(provider, model, context, threadSettings, executionOptions);
  }

  // Slice D — Anthropic native Messages API body builder. Routes every
  // OpenAI image_url part through transformOpenAiMessagesToAnthropic so PDFs
  // land as `document` blocks (Anthropic's only shape that lets the model
  // actually read PDF bytes) and images land as `image` blocks.
  private buildAnthropicMessagesRequestBody(
    model: string,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    stream: boolean,
  ): AnthropicMessagesRequest {
    const openAiMessages = this.contextAssembly.buildChatMessages(context);
    const baseMessages = this.applyShortConstraintToOpenAiMessages(
      openAiMessages,
      executionOptions,
    );
    const { system, conversation } = this.partitionAnthropicSystem(baseMessages);
    const shape = transformOpenAiMessagesToAnthropic(conversation);
    if (shape.pdfCount > 0 || shape.imageCount > 0) {
      this.logger.debug(
        `buildAnthropicMessagesRequestBody: transformed pdfCount=${String(shape.pdfCount)} imageCount=${String(shape.imageCount)} for model=${model}`,
      );
    }
    for (const warning of shape.warnings) {
      this.logger.warn(
        `buildAnthropicMessagesRequestBody: dropped part (reason=${warning.reason}) — ${warning.detail}`,
      );
    }
    const toolTurnMessages = buildAnthropicToolTurnMessages(context.toolTurns ?? []);
    const requestBody: AnthropicMessagesRequest = {
      model,
      messages: [...shape.messages, ...toolTurnMessages],
      stream,
    };
    if (system.length > 0) {
      requestBody.system = system;
    }
    const anthropicTemperature = this.resolveTemperature(
      model,
      threadSettings,
      'buildAnthropicMessagesRequestBody',
    );
    if (anthropicTemperature !== undefined) {
      requestBody.temperature = anthropicTemperature;
    }
    const resolvedMaxTokens = this.resolveBoundedMaxTokens(threadSettings, executionOptions);
    if (resolvedMaxTokens !== undefined) {
      requestBody.max_tokens = resolvedMaxTokens;
    } else if (toolTurnMessages.length > 0) {
      // Anthropic rejects any Messages request that omits max_tokens, and a
      // tool-loop continuation must never be the request that discovers this.
      requestBody.max_tokens = ANTHROPIC_TOOL_DEFAULT_MAX_TOKENS;
    }
    const anthropicEffort = effortLevelForRequest(
      this.resolveEffortForDialect(executionOptions, ProviderToolDialect.ANTHROPIC),
    );
    if (anthropicEffort !== undefined) {
      requestBody.output_config = { effort: anthropicEffort };
    }
    const anthropicSpeed = speedTierForRequest(
      this.resolveSpeedForLane(executionOptions, SPEED_PATH_ANTHROPIC_SPEED),
    );
    if (anthropicSpeed !== undefined) {
      requestBody.speed = anthropicSpeed;
    }
    return requestBody;
  }

  private buildAnthropicNativeStreamingBody(
    model: string,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
  ): AnthropicMessagesRequest {
    return this.buildAnthropicMessagesRequestBody(
      model,
      context,
      threadSettings,
      executionOptions,
      true,
    );
  }

  private partitionAnthropicSystem(messages: OpenAiChatMessage[]): {
    system: string;
    conversation: OpenAiChatMessage[];
  } {
    const systemTexts: string[] = [];
    const conversation: OpenAiChatMessage[] = [];
    for (const message of messages) {
      if (message.role.toLowerCase() === 'system') {
        const text =
          typeof message.content === 'string'
            ? message.content
            : message.content
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('\n');
        if (text.length > 0) {
          systemTexts.push(text);
        }
        continue;
      }
      conversation.push(message);
    }
    return { system: systemTexts.join('\n'), conversation };
  }

  private applyShortConstraintToOpenAiMessages(
    messages: OpenAiChatMessage[],
    executionOptions: ExecutionOptions | undefined,
  ): OpenAiChatMessage[] {
    if (executionOptions?.applyShortResponseConstraint !== true) {
      return messages;
    }
    return [{ role: 'system', content: FAST_PATH_RESPONSE_CONSTRAINT }, ...messages];
  }

  private resolveBoundedMaxTokens(
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
  ): number | undefined {
    if (executionOptions?.maxOutputTokens !== undefined) {
      return executionOptions.maxOutputTokens;
    }
    if (threadSettings?.maxTokens !== null && threadSettings?.maxTokens !== undefined) {
      return Math.min(threadSettings.maxTokens, HARD_MAX_OUTPUT_TOKENS);
    }
    return undefined;
  }

  // Slice D — Gemini native generateContent body builder. Routes every
  // OpenAI image_url part through buildGeminiRequestBody, uploading large
  // payloads to the Files API via GeminiFilesApiManager and inlining the
  // rest as base64. Upload failures propagate so oversized data is never
  // copied back into an invalid inline request.
  private async buildGeminiNativeRequestBody(
    model: string,
    context: AssembledContext,
    apiKey: string,
    threadSettings: ThreadSettings | undefined,
    executionOptions: ExecutionOptions | undefined,
    abortSignal?: AbortSignal,
  ): Promise<GeminiNativeChatRequest> {
    const config = AppConfig.get();
    const openAiMessages = this.contextAssembly.buildGeminiChatMessages(context);
    const baseMessages = this.applyShortConstraintToOpenAiMessages(
      openAiMessages,
      executionOptions,
    );
    const fileUploadFn = this.buildGeminiFileUploadFn(context, apiKey, abortSignal);
    const shape = await buildGeminiRequestBody(
      baseMessages,
      fileUploadFn,
      config.GEMINI_FILES_API_SIZE_THRESHOLD_BYTES,
    );
    if (shape.fileDataCount > 0 || shape.inlineCount > 0) {
      this.logger.debug(
        `buildGeminiNativeRequestBody: parts inline=${String(shape.inlineCount)} file_data=${String(shape.fileDataCount)} for model=${model}`,
      );
    }
    for (const warning of shape.warnings) {
      this.logger.warn(
        `buildGeminiNativeRequestBody: part warning (reason=${warning.reason}) — ${warning.detail}`,
      );
    }
    const requestBody: GeminiNativeChatRequest = {
      contents: shape.body.contents,
    };
    if (shape.body.systemInstruction !== undefined) {
      requestBody.systemInstruction = shape.body.systemInstruction;
    }
    const temperature = threadSettings?.temperature;
    const maxOutputTokens = this.resolveBoundedMaxTokens(threadSettings, executionOptions);
    if ((temperature !== null && temperature !== undefined) || maxOutputTokens !== undefined) {
      requestBody.generationConfig = {
        ...(temperature !== null && temperature !== undefined ? { temperature } : {}),
        ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
      };
    }
    return requestBody;
  }

  // Builds the per-attachment upload function the Gemini request builder
  // invokes for each large `image_url` part. We look up the matching file
  // from the assembled context (matching by base64 content) so we can pass
  // its `id` as the cache key — same attachment across compare lanes is
  // uploaded once.
  private buildGeminiFileUploadFn(
    context: AssembledContext,
    apiKey: string,
    abortSignal?: AbortSignal,
  ): GeminiFileUploadFn {
    const manager = this.geminiFilesApiManager;
    return async (data: Buffer, mimeType: string): Promise<string> => {
      const fileId = this.resolveGeminiFileIdForUpload(context, data, mimeType);
      return manager.getCachedOrUpload(fileId, data, mimeType, apiKey, abortSignal);
    };
  }

  private resolveGeminiFileIdForUpload(
    context: AssembledContext,
    data: Buffer,
    mimeType: string,
  ): string {
    const base64 = data.toString('base64');
    for (const file of context.fileContents) {
      if (file.mimeType === mimeType && file.content === base64) {
        return file.id;
      }
    }
    // Fall back to a content-derived id so identical bytes still dedupe in
    // the cache even when the file is not in `context.fileContents` (e.g.
    // synthesised image_url from a tool call).
    return `inline:${mimeType}:${base64.length}:${base64.slice(0, 16)}`;
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
      messages: [...shape.messages, ...buildOllamaToolTurnMessages(context.toolTurns ?? [])],
      stream: false,
    };

    if (threadSettings?.temperature !== null && threadSettings?.temperature !== undefined) {
      requestBody.options = {
        ...(requestBody.options ?? {}),
        temperature: threadSettings.temperature,
      };
    }

    const explicitMaxOutputTokens =
      executionOptions?.maxOutputTokens ??
      (threadSettings?.maxTokens !== null && threadSettings?.maxTokens !== undefined
        ? Math.min(threadSettings.maxTokens, HARD_MAX_OUTPUT_TOKENS)
        : undefined);

    // Defensive default: when neither the user nor the thread settings supply a
    // cap, Ollama Cloud's server-side default for num_predict is ~256, which
    // truncates non-trivial answers (bug 2026-05-31: Ollama Cloud Connector
    // returning ~750 chars for long prompts). Compute a sensible ctx-aware
    // default so the model isn't capped by the server side default.
    //
    // Bug-hunt 2026-05-31, Fix 4 — this builder is only invoked for the
    // Ollama *Cloud* connector (isOllamaConnector path), so we use the
    // OLLAMA_CONNECTOR_PROVIDER baseline (32_768) here. The local-Ollama
    // path goes through buildOllamaRequest, not this method.
    const promptTokensEstimate = estimateTokensFromText(
      shape.messages.map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n'),
    );
    const numPredict =
      explicitMaxOutputTokens ??
      Math.min(
        computeDefaultMaxTokens(
          pickDefaultCtxSizeForProvider(OLLAMA_CONNECTOR_PROVIDER),
          promptTokensEstimate,
        ),
        HARD_MAX_OUTPUT_TOKENS,
      );

    requestBody.options = {
      ...(requestBody.options ?? {}),
      num_predict: numPredict,
    };

    // Native Ollama tool descriptors. The model decides whether to call them;
    // non-agentic models ignore the field. This service is responsible for
    // executing the emitted tool_calls — for Runtime V2 that execution happens
    // client-side in the extension, across the SSE hop.
    //
    // Until now this comment promised an assignment that the code never made
    // (removed in 9c4106e2, comment left behind), which is why no model on
    // this lane has ever been offered a tool. The assignment below is that
    // promise, kept.
    //
    // Native Ollama `/api/chat` has no forced-tool-choice field, so
    // ToolChoiceMode.REQUIRED cannot be expressed here — resolveToolChoicePayload
    // reports that as `degraded` rather than silently pretending it applied.
    const toolCatalog = this.resolveNativeToolCatalog(
      OLLAMA_CONNECTOR_PROVIDER,
      ProviderToolDialect.OLLAMA,
      executionOptions,
    );
    if (toolCatalog) {
      const choice = resolveToolChoicePayload(
        this.resolveToolChoiceMode(executionOptions),
        ProviderToolDialect.OLLAMA,
      );
      requestBody.tools = toOpenAiToolSpecs(toolCatalog.specs);
      this.logger.debug(
        `buildOllamaChatRequestBody: attached ${String(toolCatalog.specs.length)} native tools (${String(toolCatalog.byteSize)} bytes) toolChoiceDegraded=${String(choice.degraded)}`,
      );
    }

    // Native Ollama exposes reasoning as `think`. When the capability registry
    // has proven level values for this model the resolver returns a level
    // instead, and the level lane is not expressible here — so only the
    // boolean form is applied, and the resolver's own warning records that
    // intermediate levels are indistinguishable on this lane.
    const ollamaEffort = this.resolveEffortForDialect(executionOptions, ProviderToolDialect.OLLAMA);
    const thinkFlag = effortFlagForRequest(ollamaEffort);
    // Off unless the caller asked for reasoning, mirroring the local lane which
    // made the same choice for the same reason. Left to think by default a
    // reasoning model spends the entire turn in `thinking` and returns empty
    // `content`: kimi-k2.7-code answered with 148 tokens of reasoning,
    // done_reason "stop", and nothing to show the user, which surfaced as
    // CLOUD_PROVIDER_EMPTY_RESPONSE and killed the run.
    requestBody.think = thinkFlag ?? false;

    return requestBody;
  }

  private parseGeminiResponse(
    data: GeminiGenerateContentResponse,
    provider: string,
    model: string,
    startTime: number,
    usedFallback: boolean,
    promptText?: string,
  ): LlmResponse {
    const firstCandidate = data.candidates?.at(0);
    const responseContent = (firstCandidate?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('');
    if (responseContent.trim().length === 0) {
      throw new BusinessException(
        `Cloud provider ${provider} returned no candidate content`,
        'CLOUD_PROVIDER_EMPTY_RESPONSE',
      );
    }
    const usage = extractGeminiUsage(data, {
      promptText,
      completionText: responseContent,
    });
    const finishReason =
      firstCandidate?.finishReason === 'MAX_TOKENS'
        ? 'length'
        : firstCandidate?.finishReason?.toLowerCase();
    return {
      content: responseContent,
      provider,
      model,
      ...this.buildTokenUsageFields(usage),
      latencyMs: Date.now() - startTime,
      finishReason,
      usedFallback,
    };
  }

  private parseCloudResponse(
    data: OpenAiChatResponse,
    provider: string,
    model: string,
    startTime: number,
    usedFallback: boolean,
    promptText?: string,
    executionOptions?: ExecutionOptions,
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

    const toolCalls = this.extractNativeToolCalls(
      firstChoice.message.tool_calls,
      provider,
      ProviderToolDialect.OPENAI,
      executionOptions,
    );

    return {
      content: responseContent,
      provider,
      model,
      ...this.buildTokenUsageFields(usage),
      latencyMs,
      finishReason: firstChoice.finish_reason,
      usedFallback,
      ...(toolCalls.length > 0
        ? {
            toolCalls,
            finishedForTools: firstChoice.finish_reason === OPENAI_TOOL_CALLS_FINISH_REASON,
          }
        : {}),
    };
  }

  // Reverse-maps provider tool calls onto Runtime tool identity. Rebuilding the
  // catalog here is intentional: translateToolCatalog is deterministic, so the
  // lookup is byte-identical to the one used to build the request, with no run
  // state threaded through the request/response boundary.
  private extractNativeToolCalls(
    raw: unknown,
    provider: string,
    dialect: ProviderToolDialect,
    executionOptions: ExecutionOptions | undefined,
  ): readonly NormalizedToolCall[] {
    const toolCatalog = this.resolveNativeToolCatalog(provider, dialect, executionOptions);
    if (!toolCatalog) {
      return [];
    }
    const calls = normalizeToolCalls(raw, dialect, toolCatalog.lookup);
    if (calls.length > 0) {
      this.logger.debug(
        `extractNativeToolCalls: ${String(calls.length)} native tool call(s) — ${calls.map((call) => `${call.toolName}/${call.operation}`).join(', ')}`,
      );
    }
    return calls;
  }

  private parseOllamaChatResponse(
    data: OllamaChatResponse,
    provider: string,
    model: string,
    startTime: number,
    usedFallback: boolean,
    promptText?: string,
    executionOptions?: ExecutionOptions,
  ): LlmResponse {
    const latencyMs = Date.now() - startTime;
    const responseContent = data.message?.content ?? '';
    const toolCalls = this.extractNativeToolCalls(
      data.message?.tool_calls,
      provider,
      ProviderToolDialect.OLLAMA,
      executionOptions,
    );

    // A native tool-call turn legitimately carries EMPTY content — the model
    // is asking for a tool, not answering. Treating that as an empty response
    // is what produced the terminal "Cloud provider OLLAMA returned no message
    // content" failure, so the emptiness check must consider tool calls too.
    if (responseContent.trim().length === 0 && toolCalls.length === 0) {
      // Bounded shape only — never the text itself. A reasoning model that
      // spends the turn thinking and answers nothing is a different fault from
      // a provider that returned an empty envelope, and the two were
      // indistinguishable in the logs.
      const thinkingLength = data.message?.thinking?.length ?? 0;
      // promptEvalCount separates the two ways this can happen, which read
      // identically without it: a positive count means the provider did read
      // our prompt and the model chose to say nothing, while zero alongside
      // doneReason=load means it never evaluated a prompt at all — the request
      // reached it as a bare model load.
      this.logger.warn(
        `callCloudProvider: ${provider}/${model} returned no content ` +
          `(thinkingChars=${String(thinkingLength)} doneReason=${data.done_reason ?? 'none'} ` +
          `evalCount=${String(data.eval_count ?? 0)} ` +
          `promptEvalCount=${String(data.prompt_eval_count ?? 0)})`,
      );
      throw new BusinessException(
        thinkingLength > 0
          ? `Model ${model} reasoned but produced no answer. Retry, or choose a model that returns a direct answer.`
          : `Cloud provider ${provider} returned no message content`,
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
      ...(toolCalls.length > 0 ? { toolCalls, finishedForTools: true } : {}),
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

    prompt = boundImageGenerationPrompt(prompt);

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
