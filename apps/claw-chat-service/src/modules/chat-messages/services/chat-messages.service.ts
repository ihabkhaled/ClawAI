import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { runResearch } from '../../../common/utilities';
import { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ContextAssemblyManager } from '../managers/context-assembly.manager';
import { ConsensusExecutionManager } from '../managers/consensus-execution.manager';
import { AnswerRepairManager } from '../managers/answer-repair.manager';
import { TaskDecompositionManager } from '../managers/task-decomposition.manager';
import { BestOfNManager } from '../managers/best-of-n.manager';
import { CostEnsembleManager } from '../managers/cost-ensemble.manager';
import { EscalationChainManager } from '../managers/escalation-chain.manager';
import { ParallelExecutionManager } from '../managers/parallel-execution.manager';
import { VerifierManager } from '../managers/verifier.manager';
import { PipelineManager } from '../managers/pipeline.manager';
import { RolePackManager } from '../managers/role-pack.manager';
import { ChatStreamService } from './chat-stream.service';
import { type CreateMessageDto } from '../dto/create-message.dto';
import { type ResearchRunResponse } from '../types/research.types';
import { type UserMessageMetadata } from '../types/user-message-metadata.types';
import { type ConsensusMessageDto } from '../dto/consensus-message.dto';
import { type EscalationChainMessageDto } from '../dto/escalation-chain-message.dto';
import { type RepairMessageDto } from '../dto/repair-message.dto';
import { type DecomposeTaskDto } from '../dto/decompose-task.dto';
import { type BestOfNMessageDto } from '../dto/best-of-n-message.dto';
import { type CostEnsembleMessageDto } from '../dto/cost-ensemble-message.dto';
import { type ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import {
  type LlmResponse,
  type MessageRoutedData,
  type RouteRoadmap,
  type ThreadSettings,
} from '../types/execution.types';
import { type ConsensusResponse } from '../types/consensus.types';
import { type EscalationChainResponse } from '../types/escalation-chain.types';
import { type AnswerRepairResponse } from '../types/answer-repair.types';
import { type TaskDecompositionResponse } from '../types/task-decomposition.types';
import { type BestOfNResponse } from '../types/best-of-n.types';
import { type CostEnsembleResponse } from '../types/cost-ensemble.types';
import { type VerifyResponse } from '../types/verifier.types';
import { type ParallelResponse } from '../types/parallel.types';
import { type PipelineResponse } from '../types/pipeline.types';
import { type RolePackResponse } from '../types/role-pack.types';
import { type ParallelMessageDto } from '../dto/parallel-message.dto';
import { type VerifyMessageDto } from '../dto/verify-message.dto';
import { type PipelineMessageDto } from '../dto/pipeline-message.dto';
import { type RolePackMessageDto } from '../dto/role-pack-message.dto';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { type ChatMessage, type ChatThread, RoutingMode } from '../../../generated/prisma';

@Injectable()
export class ChatMessagesService implements OnModuleInit {
  private readonly logger = new Logger(ChatMessagesService.name);
  private readonly structuredLogger: StructuredLogger;

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly parallelExecutionManager: ParallelExecutionManager,
    private readonly consensusExecutionManager: ConsensusExecutionManager,
    private readonly escalationChainManager: EscalationChainManager,
    private readonly answerRepairManager: AnswerRepairManager,
    private readonly taskDecompositionManager: TaskDecompositionManager,
    private readonly bestOfNManager: BestOfNManager,
    private readonly costEnsembleManager: CostEnsembleManager,
    private readonly verifierManager: VerifierManager,
    private readonly pipelineManager: PipelineManager,
    private readonly rolePackManager: RolePackManager,
    private readonly chatStreamService: ChatStreamService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    this.structuredLogger = new StructuredLogger(
      this.rabbitMQService,
      'chat-service',
      EventPattern.LOG_SERVER,
      ChatMessagesService.name,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.subscribeToEvents();
  }

  async createMessage(
    userId: string,
    dto: CreateMessageDto,
    userToken: string,
  ): Promise<ChatMessage> {
    this.logger.log(`createMessage: starting for user ${userId} in thread ${dto.threadId}`);
    const thread = await this.getThreadForMessage(dto.threadId, userId);
    const { effectiveRoutingMode, forcedProvider, forcedModel } = this.resolveRoutingParams(
      dto,
      thread,
    );

    this.logger.debug(
      `createMessage: resolved routing mode=${effectiveRoutingMode}, provider=${forcedProvider ?? 'auto'}, model=${forcedModel ?? 'auto'}, research=${dto.researchMode ?? 'OFF'}`,
    );

    const researchBundle = await this.runResearchIfRequested(
      userId,
      userToken,
      dto,
      forcedProvider,
      forcedModel,
    );

    const message = await this.chatMessagesRepository.create({
      threadId: dto.threadId,
      role: 'USER',
      content: dto.content,
      routingMode: effectiveRoutingMode,
      metadata: this.buildMessageMetadata(dto, researchBundle),
    });

    this.logger.log(`createMessage: created message ${message.id} in thread ${dto.threadId}`);
    this.logMessageCreated(userId, dto.threadId, message.id);
    this.publishMessageCreated(message, userId, effectiveRoutingMode, forcedProvider, forcedModel);

    return message;
  }

  private async runResearchIfRequested(
    userId: string,
    userToken: string,
    dto: CreateMessageDto,
    forcedProvider: string | undefined,
    forcedModel: string | undefined,
  ): Promise<ResearchRunResponse | null> {
    return this.runResearchForIntent(userId, userToken, dto.content, {
      mode: dto.researchMode,
      providerId: dto.researchProviderId,
      forcedProvider,
      forcedModel,
    });
  }

  /**
   * Shared research runner used by every chat flow (main + compare +
   * consensus + escalation + …). Callers pass the intent + an optional
   * mode; a falsy mode or empty token short-circuits to null.
   */
  async runResearchForIntent(
    userId: string,
    userToken: string,
    intent: string,
    options: {
      mode?: string;
      providerId?: string;
      forcedProvider?: string;
      forcedModel?: string;
    },
  ): Promise<ResearchRunResponse | null> {
    if (options.mode === undefined || options.mode === 'OFF') {
      return null;
    }
    if (userToken.length === 0) {
      this.logger.warn(`research: researchMode=${options.mode} but no bearer token; skipping`);
      return null;
    }
    const config = AppConfig.get();
    const run = await runResearch(config.RESEARCH_SERVICE_URL, {
      userToken,
      userId,
      intent,
      workflow: options.mode as ResearchWorkflow,
      searchProviderId: options.providerId,
      requestedProvider: options.forcedProvider,
      requestedModel: options.forcedModel,
    });
    if (run === null) {
      this.logger.warn(`research: run failed for user ${userId} — continuing without evidence`);
    } else {
      this.logger.log(`research: run ${run.id} completed (${options.mode})`);
    }
    return run;
  }

  /** Metadata payload attached to a USER message when research has run. */
  buildResearchMetadata(
    run: ResearchRunResponse | null,
    fileIds: string[] | undefined,
  ): UserMessageMetadata | undefined {
    const metadata: UserMessageMetadata = {};
    if (fileIds !== undefined && fileIds.length > 0) {
      metadata.fileIds = fileIds;
    }
    if (run !== null) {
      metadata.research = { runId: run.id, mode: run.workflow, bundle: run.bundle };
    }
    return Object.keys(metadata).length === 0 ? undefined : metadata;
  }

  async createParallelMessage(userId: string, dto: ParallelMessageDto): Promise<ParallelResponse> {
    const thread =
      dto.threadId && dto.threadId.length > 0
        ? await this.getThreadForMessage(dto.threadId, userId)
        : await this.chatThreadsRepository.create({
            userId,
            title: `Compare: ${dto.content.slice(0, 50)}`,
            routingMode: RoutingMode.MANUAL_MODEL,
          });

    return this.parallelExecutionManager.executeParallel(
      userId,
      thread.id,
      dto.content,
      dto.models,
      dto.fileIds,
    );
  }

  async createConsensusMessage(
    userId: string,
    dto: ConsensusMessageDto,
  ): Promise<ConsensusResponse> {
    const thread =
      dto.threadId && dto.threadId.length > 0
        ? await this.getThreadForMessage(dto.threadId, userId)
        : await this.chatThreadsRepository.create({
            userId,
            title: `Consensus: ${dto.content.slice(0, 50)}`,
            routingMode: RoutingMode.MANUAL_MODEL,
          });

    return this.consensusExecutionManager.executeConsensus(
      userId,
      thread.id,
      dto.content,
      dto.models,
      dto.fileIds,
    );
  }

  async createEscalationChainMessage(
    userId: string,
    dto: EscalationChainMessageDto,
  ): Promise<EscalationChainResponse> {
    const thread =
      dto.threadId && dto.threadId.length > 0
        ? await this.getThreadForMessage(dto.threadId, userId)
        : await this.chatThreadsRepository.create({
            userId,
            title: `Escalation: ${dto.content.slice(0, 50)}`,
            routingMode: RoutingMode.MANUAL_MODEL,
          });

    return this.escalationChainManager.executeEscalationChain(
      userId,
      thread.id,
      dto.content,
      dto.chain,
      dto.fileIds,
    );
  }

  async createRepairMessage(userId: string, dto: RepairMessageDto): Promise<AnswerRepairResponse> {
    return this.answerRepairManager.executeRepair(userId, dto);
  }

  async executeDecomposition(
    userId: string,
    dto: DecomposeTaskDto,
  ): Promise<TaskDecompositionResponse> {
    return this.taskDecompositionManager.executeDecomposition(userId, dto);
  }

  async executeBestOfN(userId: string, dto: BestOfNMessageDto): Promise<BestOfNResponse> {
    return this.bestOfNManager.executeBestOfN(userId, dto);
  }

  async executeCostEnsemble(
    userId: string,
    dto: CostEnsembleMessageDto,
  ): Promise<CostEnsembleResponse> {
    return this.costEnsembleManager.executeCostEnsemble(userId, dto);
  }

  async executeVerify(userId: string, dto: VerifyMessageDto): Promise<VerifyResponse> {
    return this.verifierManager.executeVerify(userId, dto);
  }

  async executePipeline(userId: string, dto: PipelineMessageDto): Promise<PipelineResponse> {
    return this.pipelineManager.executePipeline(userId, dto);
  }

  async executeRolePack(userId: string, dto: RolePackMessageDto): Promise<RolePackResponse> {
    return this.rolePackManager.executeRolePack(userId, dto);
  }

  async getMessages(
    threadId: string,
    userId: string,
    query: ListMessagesQueryDto,
  ): Promise<PaginatedResult<ChatMessage>> {
    this.logger.debug(
      `getMessages: fetching thread ${threadId} page=${String(query.page)} limit=${String(query.limit)}`,
    );
    const thread = await this.chatThreadsRepository.findById(threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    this.validateOwnership(thread, userId);

    const [messages, total] = await Promise.all([
      this.chatMessagesRepository.findByThreadId(threadId, query.page, query.limit),
      this.chatMessagesRepository.countByThreadId(threadId),
    ]);

    this.logger.debug(
      `getMessages: returned ${String(messages.length)} of ${String(total)} messages for thread ${threadId}`,
    );

    return {
      data: messages,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getMessage(id: string, userId: string): Promise<ChatMessage> {
    const message = await this.chatMessagesRepository.findById(id);
    if (!message) {
      throw new EntityNotFoundException('ChatMessage', id);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', message.threadId);
    }
    this.validateOwnership(thread, userId);

    return message;
  }

  async setFeedback(
    userId: string,
    messageId: string,
    feedback: string | null,
  ): Promise<ChatMessage> {
    this.logger.log(
      `setFeedback: setting feedback="${feedback ?? 'null'}" on message ${messageId}`,
    );
    const message = await this.chatMessagesRepository.findById(messageId);
    if (!message) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', message.threadId);
    }
    this.validateOwnership(thread, userId);

    const updated = await this.chatMessagesRepository.updateFeedback(messageId, feedback);
    this.logger.log(`setFeedback: completed for message ${messageId}`);
    return updated;
  }

  async regenerateMessage(id: string, userId: string): Promise<ChatMessage> {
    this.logger.log(`regenerateMessage: starting for message ${id} by user ${userId}`);
    const message = await this.chatMessagesRepository.findById(id);
    if (!message) {
      throw new EntityNotFoundException('ChatMessage', id);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', message.threadId);
    }
    this.validateOwnership(thread, userId);

    const regenProvider = thread.preferredProvider ?? undefined;
    const regenModel = thread.preferredModel ?? undefined;
    const regenRoutingMode =
      regenProvider && regenModel ? RoutingMode.MANUAL_MODEL : message.routingMode;

    this.logger.log(
      `regenerateMessage: publishing message.created for regeneration of ${id} with mode=${regenRoutingMode}`,
    );
    void this.rabbitMQService.publish(EventPattern.MESSAGE_CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: message.content,
      routingMode: regenRoutingMode,
      forcedProvider: regenProvider,
      forcedModel: regenModel,
      regenerate: true,
      timestamp: new Date().toISOString(),
    });

    return message;
  }

  async handleMessageRouted(payload: MessageRoutedData): Promise<void> {
    this.logger.log(
      `handleMessageRouted: starting for message ${payload.messageId} via ${payload.selectedProvider}/${payload.selectedModel}`,
    );
    const [threadMessages, thread] = await Promise.all([
      this.chatMessagesRepository.findRecentByThreadId(payload.threadId, 20),
      this.chatThreadsRepository.findById(payload.threadId),
    ]);

    const chronologicalMessages = [...threadMessages].reverse();
    const threadSettings = this.extractThreadSettings(thread);
    const fileIds = this.extractFileIdsFromMessages(chronologicalMessages);
    const latestUserMetadata = this.extractLatestUserMetadata(chronologicalMessages);

    // Context-aware follow-up detection:
    // If user says "again"/"one more" and the last message was image/file generation,
    // override routing to re-trigger the same generation type
    let effectivePayload = this.detectImageFollowUp(payload, thread, chronologicalMessages);
    effectivePayload = this.detectFileGenerationFollowUp(
      effectivePayload,
      thread,
      chronologicalMessages,
    );

    // Attachment-aware image generation detection:
    // If user attached IMAGE files and text implies "similar/recreate/like this",
    // override to IMAGE_GEMINI even if router didn't detect it
    effectivePayload = this.detectImageFromAttachment(effectivePayload, chronologicalMessages);

    // Inject judge-referee config from thread settings
    if (thread?.judgeEnabled) {
      effectivePayload = { ...effectivePayload, judgeEnabled: true };
    }

    this.logger.debug(
      `handleMessageRouted: assembling context with ${String(chronologicalMessages.length)} messages, fileIds=${String(fileIds?.length ?? 0)}`,
    );
    const context = await this.contextAssemblyManager.assemble(
      thread?.userId ?? 'system',
      chronologicalMessages,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds,
    );

    this.logger.debug(
      `handleMessageRouted: calling LLM execution for ${effectivePayload.selectedProvider}/${effectivePayload.selectedModel}`,
    );
    try {
      const llmResponse = await this.chatExecutionManager.execute(
        effectivePayload,
        context,
        threadSettings,
      );
      const contextMetadata = {
        memoryCount: context.memories.length,
        fileIds: fileIds ?? [],
      };
      const assistantMessage = await this.storeAssistantResponse(
        payload,
        llmResponse,
        contextMetadata,
        latestUserMetadata,
      );
      await this.updateThreadAfterResponse(payload.threadId, llmResponse);

      this.chatStreamService.emitCompletion(
        payload.threadId,
        llmResponse.provider,
        llmResponse.model,
      );
      this.logAssistantResponse(payload, llmResponse);
      this.publishMessageCompleted(
        payload,
        assistantMessage,
        llmResponse,
        thread,
        chronologicalMessages,
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'All providers failed';
      this.logger.error(
        `handleMessageRouted: failed for message ${payload.messageId} - ${errorMsg}`,
      );
      await this.storeErrorResponse(payload, errorMsg);
      throw error;
    }
  }

  private async subscribeToEvents(): Promise<void> {
    await this.rabbitMQService.subscribe(EventPattern.MESSAGE_ROUTED, async (data: unknown) => {
      await this.onMessageRouted(data);
    });

    this.logger.log('Subscribed to chat execution events');
  }

  private async onMessageRouted(data: unknown): Promise<void> {
    const payload = data as Record<string, unknown>;
    const messageId = payload['messageId'] as string | undefined;
    const threadId = payload['threadId'] as string | undefined;
    const selectedProvider = payload['selectedProvider'] as string | undefined;
    const selectedModel = payload['selectedModel'] as string | undefined;
    const routingMode = payload['routingMode'] as string | undefined;
    const routerModel = payload['routerModel'] as string | null | undefined;
    const fallbackProvider = payload['fallbackProvider'] as string | undefined;
    const fallbackModel = payload['fallbackModel'] as string | undefined;
    const fallbackChain = payload['fallbackChain'] as
      | Array<{ provider: string; model: string }>
      | undefined;
    const timestamp = payload['timestamp'] as string | undefined;
    const detectedCategory = payload['detectedCategory'] as string | undefined;

    if (!messageId || !threadId || !selectedProvider || !selectedModel || !routingMode) {
      this.logger.warn('Received message.routed with missing required fields');
      return;
    }

    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Received routed message for ${messageId} via ${selectedProvider}/${selectedModel}`,
      action: 'message_routed_received',
      service: ChatMessagesService.name,
      messageId,
      threadId,
      provider: selectedProvider,
      model: selectedModel,
    });

    try {
      await this.handleMessageRouted({
        messageId,
        threadId,
        selectedProvider,
        selectedModel,
        routingMode,
        routerModel: routerModel ?? null,
        fallbackProvider,
        fallbackModel,
        fallbackChain,
        timestamp: timestamp ?? new Date().toISOString(),
        detectedCategory,
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to handle message.routed for message ${messageId}: ${errorMsg}`);
      this.structuredLogger.logAction({
        level: LogLevel.ERROR,
        message: `Failed to handle message.routed for message ${messageId}`,
        action: 'message_routed_error',
        service: ChatMessagesService.name,
        messageId,
        threadId,
        errorMessage: errorMsg,
      });
    }
  }

  private extractThreadSettings(thread: ChatThread | null): ThreadSettings | undefined {
    if (!thread) {
      return undefined;
    }
    return {
      systemPrompt: thread.systemPrompt,
      temperature: thread.temperature,
      maxTokens: thread.maxTokens,
      judgeModel: thread.judgeModel,
      qualityThreshold: thread.qualityThreshold,
      maxReRouteAttempts: thread.maxReRouteAttempts,
    };
  }

  private extractFileIdsFromMessages(messages: ChatMessage[]): string[] | undefined {
    const latestUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    const metadata = latestUserMsg?.metadata as Record<string, unknown> | null;
    return Array.isArray(metadata?.['fileIds']) ? (metadata['fileIds'] as string[]) : undefined;
  }

  private extractLatestUserMetadata(messages: ChatMessage[]): Record<string, unknown> | null {
    const latestUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    return (latestUserMsg?.metadata as Record<string, unknown> | null) ?? null;
  }

  private async storeErrorResponse(payload: MessageRoutedData, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId: payload.threadId,
      role: 'ASSISTANT',
      content: `⚠️ ${errorMsg}`,
      provider: payload.selectedProvider,
      model: payload.selectedModel,
      routingMode: payload.routingMode as RoutingMode,
      routerModel: payload.routerModel ?? null,
      usedFallback: true,
      metadata: { error: true },
    });
  }

  private async storeAssistantResponse(
    payload: MessageRoutedData,
    llmResponse: LlmResponse,
    contextMetadata?: { memoryCount: number; fileIds: string[] },
    latestUserMetadata?: Record<string, unknown> | null,
  ): Promise<ChatMessage> {
    const hasVisibleContent = llmResponse.content.trim().length > 0;
    const storedContent = hasVisibleContent
      ? llmResponse.content
      : 'Warning: no visible final answer was produced for this reply. Please regenerate to retry.';
    const requestedModelDisplayName =
      typeof latestUserMetadata?.['modelDisplayName'] === 'string'
        ? latestUserMetadata['modelDisplayName']
        : null;
    const finalDisplayName = llmResponse.model;
    const routeRoadmap: RouteRoadmap = {
      routingMode: payload.routingMode,
      routerModel: payload.routerModel ?? null,
      selectedProvider: payload.selectedProvider,
      selectedModel: payload.selectedModel,
      finalProvider: llmResponse.provider,
      finalModel: llmResponse.model,
      finalDisplayName,
      steps:
        payload.routingMode === 'AUTO' && payload.routerModel
          ? [
              {
                stage: 'router',
                provider: 'local-ollama',
                model: payload.routerModel,
                displayName: payload.routerModel,
              },
              {
                stage: 'decision',
                provider: payload.selectedProvider,
                model: payload.selectedModel,
              },
              {
                stage: 'execution',
                provider: llmResponse.provider,
                model: llmResponse.model,
                displayName: finalDisplayName,
              },
            ]
          : [
              {
                stage: 'execution',
                provider: llmResponse.provider,
                model: llmResponse.model,
                displayName: finalDisplayName,
              },
            ],
    };

    return this.chatMessagesRepository.create({
      threadId: payload.threadId,
      role: 'ASSISTANT',
      content: storedContent,
      provider: llmResponse.provider,
      model: llmResponse.model,
      routingMode: payload.routingMode as RoutingMode,
      routerModel: payload.routingMode === 'AUTO' ? (payload.routerModel ?? null) : null,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      latencyMs: llmResponse.latencyMs,
      usedFallback: llmResponse.usedFallback,
      metadata: {
        ...(contextMetadata
          ? { memoryCount: contextMetadata.memoryCount, fileIds: contextMetadata.fileIds }
          : {}),
        ...(llmResponse.imageGenerationId
          ? { type: 'image_generation', generationId: llmResponse.imageGenerationId }
          : {}),
        ...(llmResponse.fileGenerationId
          ? { type: 'file_generation', generationId: llmResponse.fileGenerationId }
          : {}),
        ...(llmResponse.reRouted
          ? {
              reRouted: true,
              originalProvider: llmResponse.originalProvider,
              originalModel: llmResponse.originalModel,
              originalScore: llmResponse.originalScore,
              reRouteAttempts: llmResponse.reRouteAttempts,
              reRouteReasons: llmResponse.reRouteReasons,
            }
          : {}),
        ...(llmResponse.fastPathUsed ? { fastPathUsed: true } : {}),
        ...(llmResponse.fastPathEscalated ? { fastPathEscalated: true } : {}),
        ...(llmResponse.executionPath ? { executionPath: llmResponse.executionPath } : {}),
        ...(llmResponse.targetLatencyMs ? { targetLatencyMs: llmResponse.targetLatencyMs } : {}),
        ...(!hasVisibleContent ? { emptyContent: true } : {}),
        ...(requestedModelDisplayName ? { requestedModelDisplayName } : {}),
        routeRoadmap,
        ...(llmResponse.judgeRefereeMetadata ?? {}),
      },
    });
  }

  private async updateThreadAfterResponse(
    threadId: string,
    llmResponse: LlmResponse,
  ): Promise<void> {
    await this.chatThreadsRepository.update(threadId, {
      lastProvider: llmResponse.provider,
      lastModel: llmResponse.model,
    });
  }

  private logAssistantResponse(payload: MessageRoutedData, llmResponse: LlmResponse): void {
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Assistant response stored for message ${payload.messageId}`,
      action: 'assistant_response_stored',
      service: ChatMessagesService.name,
      messageId: payload.messageId,
      threadId: payload.threadId,
      provider: llmResponse.provider,
      model: llmResponse.model,
      latencyMs: llmResponse.latencyMs,
      ...(llmResponse.reRouted
        ? {
            reRouted: true,
            originalProvider: llmResponse.originalProvider,
            originalModel: llmResponse.originalModel,
            originalScore: llmResponse.originalScore,
            reRouteAttempts: llmResponse.reRouteAttempts,
          }
        : {}),
      ...(llmResponse.judgeRefereeMetadata
        ? {
            judgeDecision: llmResponse.judgeRefereeMetadata.judgeDecision,
            criticModel: llmResponse.judgeRefereeMetadata.criticModel,
            judgeModel: llmResponse.judgeRefereeMetadata.judgeModel,
            criticScore: llmResponse.judgeRefereeMetadata.criticScore,
            judgeConfidence: llmResponse.judgeRefereeMetadata.judgeConfidence,
          }
        : {}),
      ...(payload.routerModel ? { metadata: { routerModel: payload.routerModel } } : {}),
    });
  }

  private publishMessageCompleted(
    payload: MessageRoutedData,
    assistantMessage: ChatMessage,
    llmResponse: LlmResponse,
    thread: ChatThread | null,
    messages: ChatMessage[],
  ): void {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    void this.rabbitMQService.publish(EventPattern.MESSAGE_COMPLETED, {
      messageId: payload.messageId,
      threadId: payload.threadId,
      assistantMessageId: assistantMessage.id,
      userId: thread?.userId,
      provider: llmResponse.provider,
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      latencyMs: llmResponse.latencyMs,
      content: assistantMessage.content,
      userContent: lastUserMsg?.content,
      timestamp: new Date().toISOString(),
      ...(payload.routerModel ? { routerModel: payload.routerModel } : {}),
      ...(llmResponse.executionPath ? { executionPath: llmResponse.executionPath } : {}),
      ...(llmResponse.targetLatencyMs ? { targetLatencyMs: llmResponse.targetLatencyMs } : {}),
      ...(llmResponse.fastPathUsed ? { fastPathUsed: true } : {}),
      ...(llmResponse.fastPathEscalated ? { fastPathEscalated: true } : {}),
      ...(llmResponse.reRouted
        ? {
            reRouted: true,
            originalProvider: llmResponse.originalProvider,
            originalModel: llmResponse.originalModel,
            reRouteAttempts: llmResponse.reRouteAttempts,
          }
        : {}),
      ...(llmResponse.judgeRefereeMetadata
        ? {
            judgeDecision: llmResponse.judgeRefereeMetadata.judgeDecision,
            criticModel: llmResponse.judgeRefereeMetadata.criticModel,
            judgeModel: llmResponse.judgeRefereeMetadata.judgeModel,
          }
        : {}),
    });
  }

  private async getThreadForMessage(threadId: string, userId: string): Promise<ChatThread> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    this.validateOwnership(thread, userId);
    return thread;
  }

  private resolveRoutingParams(
    dto: CreateMessageDto,
    thread: ChatThread,
  ): {
    effectiveRoutingMode: RoutingMode;
    forcedProvider: string | undefined;
    forcedModel: string | undefined;
  } {
    const effectiveRoutingMode = dto.routingMode ?? thread.routingMode;
    const forcedProvider =
      effectiveRoutingMode === RoutingMode.MANUAL_MODEL
        ? (dto.provider ?? thread.preferredProvider ?? undefined)
        : undefined;
    const forcedModel =
      effectiveRoutingMode === RoutingMode.MANUAL_MODEL
        ? (dto.model ?? thread.preferredModel ?? undefined)
        : undefined;

    return { effectiveRoutingMode, forcedProvider, forcedModel };
  }

  private buildMessageMetadata(
    dto: CreateMessageDto,
    researchRun: ResearchRunResponse | null,
  ): UserMessageMetadata | undefined {
    const metadata: UserMessageMetadata = {};
    if (dto.fileIds && dto.fileIds.length > 0) {
      metadata.fileIds = dto.fileIds;
    }
    if (typeof dto.modelDisplayName === 'string' && dto.modelDisplayName.length > 0) {
      metadata.modelDisplayName = dto.modelDisplayName;
    }
    if (researchRun !== null) {
      metadata.research = {
        runId: researchRun.id,
        mode: researchRun.workflow,
        bundle: researchRun.bundle,
      };
    }
    return Object.keys(metadata).length === 0 ? undefined : metadata;
  }

  private logMessageCreated(userId: string, threadId: string, messageId: string): void {
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `User message created in thread ${threadId}`,
      action: 'message_created',
      service: ChatMessagesService.name,
      userId,
      threadId,
      messageId,
    });
  }

  private publishMessageCreated(
    message: ChatMessage,
    userId: string,
    routingMode: RoutingMode,
    forcedProvider: string | undefined,
    forcedModel: string | undefined,
  ): void {
    void this.rabbitMQService.publish(EventPattern.MESSAGE_CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: message.content,
      routingMode,
      forcedProvider,
      forcedModel,
      timestamp: new Date().toISOString(),
    });
  }

  private validateOwnership(thread: ChatThread, userId: string): void {
    if (thread.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this thread',
        'FORBIDDEN_THREAD_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private detectImageFollowUp(
    payload: MessageRoutedData,
    thread: ChatThread | null,
    messages: ChatMessage[],
  ): MessageRoutedData {
    // Only override AUTO routing — don't interfere with manual model selection
    if (payload.routingMode !== 'AUTO') {
      return payload;
    }

    // Already routed to image provider — no override needed
    if (payload.selectedProvider.startsWith('IMAGE_')) {
      return payload;
    }

    // Check if thread's last interaction was image generation
    const lastProvider = thread?.lastProvider;
    if (!lastProvider?.startsWith('IMAGE_')) {
      return payload;
    }

    // Check if user's message is a short follow-up
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    if (!lastUserMsg) {
      return payload;
    }

    const lower = lastUserMsg.content.toLowerCase().trim();
    const isFollowUp =
      lower.length < 100 &&
      (lower === 'again' ||
        lower === 'one more' ||
        lower === 'another one' ||
        lower === 'do it again' ||
        lower === 'retry' ||
        lower === 'regenerate' ||
        lower === 'redo' ||
        lower === 'more' ||
        lower.startsWith('another') ||
        lower.startsWith('one more') ||
        lower.startsWith('do another') ||
        lower.startsWith('make another') ||
        lower.startsWith('generate another') ||
        lower.startsWith('create another'));

    if (!isFollowUp) {
      return payload;
    }

    // Find the original image prompt from the last image generation message
    const lastImageMsg = [...messages].reverse().find((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      return meta?.['type'] === 'image_generation';
    });

    // Override routing to use the same image provider
    this.logger.log(
      `Context follow-up detected: "${lower}" → re-routing to ${lastProvider}/${thread?.lastModel ?? 'default'}`,
    );

    return {
      ...payload,
      selectedProvider: lastProvider,
      selectedModel: thread?.lastModel ?? payload.selectedModel,
      routingMode: payload.routingMode,
      fallbackProvider: lastImageMsg ? undefined : payload.fallbackProvider,
      fallbackModel: lastImageMsg ? undefined : payload.fallbackModel,
    };
  }

  private detectFileGenerationFollowUp(
    payload: MessageRoutedData,
    _thread: ChatThread | null,
    messages: ChatMessage[],
  ): MessageRoutedData {
    if (payload.routingMode !== 'AUTO') {
      return payload;
    }
    if (payload.selectedProvider === 'FILE_GENERATION') {
      return payload;
    }

    // Check if last assistant message was file generation
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'ASSISTANT');
    const meta = lastAssistant?.metadata as Record<string, unknown> | null;
    if (meta?.['type'] !== 'file_generation') {
      return payload;
    }

    // Check for short follow-up
    const lastUser = [...messages].reverse().find((m) => m.role === 'USER');
    if (!lastUser) {
      return payload;
    }
    const lower = lastUser.content.toLowerCase().trim();
    const isFollowUp =
      lower.length < 100 &&
      (lower === 'again' ||
        lower === 'one more' ||
        lower === 'another one' ||
        lower === 'do it again' ||
        lower === 'retry' ||
        lower === 'regenerate' ||
        lower === 'redo' ||
        lower === 'more' ||
        lower.startsWith('another') ||
        lower.startsWith('one more') ||
        lower.startsWith('do another'));

    if (!isFollowUp) {
      return payload;
    }

    this.logger.log(
      `File generation follow-up detected: "${lower}" → re-routing to FILE_GENERATION`,
    );

    return {
      ...payload,
      selectedProvider: 'FILE_GENERATION',
      selectedModel: 'auto',
    };
  }

  private detectImageFromAttachment(
    payload: MessageRoutedData,
    messages: ChatMessage[],
  ): MessageRoutedData {
    // Already routed to image generation
    if (payload.selectedProvider.startsWith('IMAGE_')) {
      return payload;
    }

    // Check if the latest user message has image attachments
    const lastUser = [...messages].reverse().find((m) => m.role === 'USER');
    if (!lastUser) {
      return payload;
    }

    const meta = lastUser.metadata as Record<string, unknown> | null;
    const fileIds = Array.isArray(meta?.['fileIds']) ? (meta['fileIds'] as string[]) : [];
    if (fileIds.length === 0) {
      return payload;
    }

    // Check if the user's text implies they want image generation from the attachment
    const lower = lastUser.content.toLowerCase();
    const imageIntentPhrases = [
      'similar',
      'like this',
      'recreate',
      'reproduce',
      'copy',
      'same style',
      'identical',
      'match',
      'imitate',
      'version of this',
      'based on this',
      'inspired by',
      'variation',
      'modify this',
      'edit this',
      'change this',
      'transform this',
      'convert this',
      'make this',
      'redo this',
      'similar to this',
      'like the attached',
      'same as this',
      'generate from this',
      'create from this',
      'remake',
      'generate similar',
      'create similar',
      'generate like',
      'looks like this',
      'style of this',
      'another like this',
      'one more like',
      'same kind',
      'same type',
      'replicate',
    ];

    const hasImageIntent = imageIntentPhrases.some((p) => lower.includes(p));
    if (!hasImageIntent) {
      return payload;
    }

    this.logger.log(
      `Image-from-attachment detected: "${lower.slice(0, 50)}" with ${String(fileIds.length)} files → overriding to IMAGE_GEMINI`,
    );

    return {
      ...payload,
      selectedProvider: 'IMAGE_GEMINI',
      selectedModel: 'gemini-2.5-flash-image',
    };
  }
}
