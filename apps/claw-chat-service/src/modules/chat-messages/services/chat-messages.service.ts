import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel, Permission, TokenLedgerContext } from '@claw/shared-types';
import { allowedModelKeys, type PlanFeature } from '@claw/shared-entitlements';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { AppConfig } from '../../../app/config/app.config';
import { mapResearchModeToWorkflow, recordGet, runResearch } from '../../../common/utilities';
import {
  FILE_FOLLOW_UP_PREFIXES,
  IMAGE_FOLLOW_UP_PREFIXES,
  IMAGE_INTENT_PHRASES,
  SHORT_FOLLOW_UP_EXACT_MATCHES,
  SHORT_FOLLOW_UP_MAX_LENGTH,
} from '../constants/follow-up-detection.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ContextReceiptService } from '../../context-receipts/services/context-receipt.service';
import { receiptFromAssembledContext } from '../../../common/utilities/receipt-from-context.utility';
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
import { ResearchEnricherManager } from '../managers/research-enricher.manager';
import { RuntimeV2LoopManager } from '../managers/runtime-v2-loop.manager';
import { ChatStreamService } from './chat-stream.service';
import { AccessControlService } from './access-control.service';
import { type CreateMessageDto } from '../dto/create-message.dto';
import { type ResearchRunResponse } from '../types/research.types';
import {
  type ResearchTranscript,
  type ResearchTranscriptSource,
} from '../types/research-transcript.types';
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
  type ResearchExecutionSummary,
  type RouteRoadmap,
  type StoredProgressSummaryStep,
  type ThreadSettings,
} from '../types/execution.types';
import { type ConsensusResponse } from '../types/consensus.types';
import { type EscalationChainResponse } from '../types/escalation-chain.types';
import { type AnswerRepairResponse } from '../types/answer-repair.types';
import { type TaskDecompositionResponse } from '../types/task-decomposition.types';
import { type BestOfNResponse } from '../types/best-of-n.types';
import { type CostEnsembleResponse } from '../types/cost-ensemble.types';
import { type VerifyResponse } from '../types/verifier.types';
import {
  type ParallelCriticConfig,
  type ParallelJudgeConfig,
  type ParallelResponse,
} from '../types/parallel.types';
import { type PipelineResponse } from '../types/pipeline.types';
import { type RolePackResponse } from '../types/role-pack.types';
import { type ParallelMessageDto } from '../dto/parallel-message.dto';
import { type VerifyMessageDto } from '../dto/verify-message.dto';
import { type PipelineMessageDto } from '../dto/pipeline-message.dto';
import { type RolePackMessageDto } from '../dto/role-pack-message.dto';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { type ChatMessage, type ChatThread, Prisma, RoutingMode } from '../../../generated/prisma';
import type { AssembledContext } from '../types/context.types';

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
    private readonly contextReceiptService: ContextReceiptService,
    private readonly accessControlService: AccessControlService,
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly runtimeV2LoopManager: RuntimeV2LoopManager,
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
      `createMessage: resolved routing mode=${effectiveRoutingMode}, provider=${forcedProvider ?? 'auto'}, model=${forcedModel ?? 'auto'}, research=${dto.researchMode ?? ResearchMode.NONE}`,
    );

    // Backend enforcement: reject a forbidden manually-selected model and a
    // user whose daily quota is exhausted, before any work is done. The
    // returned entitlements feed AUTO-mode router gating below. Research mode
    // additionally requires the plan-level allowResearchMode unlock.
    const entitlements = await this.assertSendAccess(
      userId,
      dto,
      thread,
      forcedProvider,
      forcedModel,
    );
    const allowedModels = entitlements ? allowedModelKeys(entitlements) : [];

    this.chatStreamService.emitRequestAccepted(dto.threadId);

    const researchBundle = await this.runResearchIfRequested(
      userId,
      userToken,
      dto,
      dto.threadId,
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
    this.publishMessageCreated(
      message,
      userId,
      effectiveRoutingMode,
      forcedProvider,
      forcedModel,
      allowedModels,
    );

    return message;
  }

  // Resolves plan-feature requirements for a single-message send and asserts
  // them against the user's entitlements. Returns the resolved entitlements
  // (or null when failing open). Throws PLAN_FEATURE_DISABLED if research is
  // requested but the user's plan does not unlock it.
  private async assertSendAccess(
    userId: string,
    dto: CreateMessageDto,
    thread: ChatThread,
    forcedProvider: string | undefined,
    forcedModel: string | undefined,
  ): Promise<Awaited<ReturnType<AccessControlService['assertCanSendMessage']>>> {
    const requireFeature: PlanFeature | undefined =
      dto.researchMode !== undefined && dto.researchMode !== ResearchMode.NONE
        ? 'allowResearchMode'
        : undefined;
    const entitlements = await this.accessControlService.assertCanSendMessage(userId, {
      provider: forcedProvider,
      model: forcedModel,
      ...(requireFeature ? { requireFeature } : {}),
    });
    // Defense-in-depth — also gate the RESEARCH_USE RBAC permission when the
    // research toggle is set. Matches the compare-path gate in
    // assertCompareAccess so a direct API call cannot bypass the matrix.
    if (requireFeature !== undefined) {
      await this.accessControlService.assertResearchAccess(userId);
    }
    await this.assertThreadReviewAccess(userId, thread);
    return entitlements;
  }

  private async assertThreadReviewAccess(userId: string, thread: ChatThread): Promise<void> {
    if (thread.judgeEnabled !== true) {
      return;
    }
    const features: PlanFeature[] = ['allowJudgeMode'];
    if (thread.criticEnabled === true) {
      features.push('allowCriticReview');
    }
    await this.accessControlService.assertCanSendMessage(userId, { requireFeature: features });
    await this.accessControlService.assertCanSendMessage(userId, {
      requirePermission: Permission.JUDGE_USE,
    });
  }

  // Centralized research-mode gate for the 9 orchestration entry points
  // (consensus, escalation-chain, repair, verify, decompose, best-of-n,
  // cost-ensemble, role-pack, pipeline). Combines the plan-level
  // allowResearchMode unlock with the RESEARCH_USE permission so a USER
  // without either is rejected with a 403 before any enricher hop runs.
  // No-op when researchMode is NONE / undefined, so v1 callers are unaffected.
  private async assertOrchestrationResearchGate(
    userId: string,
    researchMode: ResearchMode | undefined,
  ): Promise<void> {
    if (researchMode === undefined || researchMode === ResearchMode.NONE) {
      return;
    }
    await this.accessControlService.assertResearchAccess(userId);
  }

  private async runResearchIfRequested(
    userId: string,
    userToken: string,
    dto: CreateMessageDto,
    threadId: string,
    forcedProvider: string | undefined,
    forcedModel: string | undefined,
  ): Promise<ResearchRunResponse | null> {
    if (dto.researchMode !== undefined && dto.researchMode !== ResearchMode.NONE) {
      this.chatStreamService.emitResearchStarted(threadId, dto.researchMode);
    }
    return this.runResearchForIntent(userId, userToken, threadId, dto.content, {
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
    threadId: string,
    intent: string,
    options: {
      mode?: ResearchMode | string;
      providerId?: string;
      forcedProvider?: string;
      forcedModel?: string;
    },
  ): Promise<ResearchRunResponse | null> {
    if (options.mode === undefined || options.mode === ResearchMode.NONE) {
      return null;
    }
    if (userToken.length === 0) {
      this.logger.warn(`research: researchMode=${options.mode} but no bearer token; skipping`);
      return null;
    }
    const workflow = mapResearchModeToWorkflow(options.mode as ResearchMode);
    const config = AppConfig.get();
    const run = await runResearch(config.RESEARCH_SERVICE_URL, {
      userToken,
      userId,
      intent,
      workflow,
      searchProviderId: options.providerId,
      requestedProvider: options.forcedProvider,
      requestedModel: options.forcedModel,
    });
    if (run === null) {
      this.logger.warn(`research: run failed for user ${userId} — continuing without evidence`);
    } else {
      this.logger.log(`research: run ${run.id} completed (${options.mode})`);
      const bundle = this.extractResearchBundle(run);
      this.chatStreamService.emitResearchCompleted(threadId, bundle.itemCount, bundle.toolsUsed);
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

  // Shared enricher runner used by the normal-chat path (and reusable by
  // orchestration managers). Catches every failure and returns a transcript
  // whose `warnings` field captures the failure reason — research MUST NEVER
  // block the chat call. The model runs with whatever evidence it got (zero
  // is acceptable). On SSE-visible failures the caller is expected to also
  // emit RESEARCH_FAILED through chatStreamService — handled in
  // runResearchIfRequested below.
  async runEnricherTranscript(
    userToken: string,
    mode: ResearchMode,
    query: string,
    providerId: string | undefined,
  ): Promise<ResearchTranscript> {
    if (userToken.length === 0) {
      return this.buildEmptyEnricherTranscript(mode, query, providerId, [
        'research.missingBearerToken',
      ]);
    }
    const startedAt = Date.now();
    try {
      const result = await this.researchEnricherManager.enrich({
        mode,
        query,
        userAuthHeader: `Bearer ${userToken}`,
      });
      return this.buildSuccessEnricherTranscript(
        mode,
        query,
        providerId,
        result.sources,
        Math.max(1, Date.now() - startedAt),
        result.searchRequestCount,
        result.fetchRequestCount,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        `runEnricherTranscript: enricher failed mode=${mode} — ${message}; continuing without evidence`,
      );
      return this.buildEmptyEnricherTranscript(
        mode,
        query,
        providerId,
        [`research.enrichmentFailed:${message}`],
        Math.max(1, Date.now() - startedAt),
      );
    }
  }

  private buildSuccessEnricherTranscript(
    mode: ResearchMode,
    query: string,
    providerId: string | undefined,
    rawSources: ReadonlyArray<{
      title: string;
      url: string;
      snippet?: string;
      extracted?: string;
    }>,
    latencyMs: number,
    searchRequestCount: number,
    fetchRequestCount: number,
  ): ResearchTranscript {
    const sources: ResearchTranscriptSource[] = rawSources.map((source) => ({
      title: source.title,
      url: source.url,
      ...(source.snippet !== undefined ? { snippet: source.snippet } : {}),
      ...(source.extracted !== undefined ? { extracted: source.extracted } : {}),
    }));
    return {
      mode,
      ...(providerId !== undefined ? { providerId } : {}),
      query,
      sources,
      latencyMs,
      warnings: [],
      searchRequestCount,
      fetchRequestCount,
    };
  }

  private buildEmptyEnricherTranscript(
    mode: ResearchMode,
    query: string,
    providerId: string | undefined,
    warnings: string[],
    latencyMs = 0,
  ): ResearchTranscript {
    return {
      mode,
      ...(providerId !== undefined ? { providerId } : {}),
      query,
      sources: [],
      latencyMs,
      warnings,
      searchRequestCount: 0,
      fetchRequestCount: 0,
    };
  }

  async createParallelMessage(
    userId: string,
    dto: ParallelMessageDto,
    userToken: string,
  ): Promise<ParallelResponse> {
    await this.assertCompareAccess(userId, dto);
    const thread = await this.resolveCompareThread(userId, dto);
    const judgeConfig: ParallelJudgeConfig = {
      enabled: dto.judgeEnabled === true,
      model: dto.judgeModel ?? null,
    };
    const criticConfig: ParallelCriticConfig = {
      enabled: dto.criticEnabled === true,
      model: dto.criticModel ?? null,
    };
    return this.parallelExecutionManager.executeParallel(
      userId,
      thread.id,
      dto.content,
      dto.models,
      judgeConfig,
      criticConfig,
      dto.fileIds,
      {
        mode: dto.researchMode,
        query: dto.researchQuery,
        userToken,
      },
    );
  }

  // Plan-feature + RBAC gates for compare mode. Extracted so
  // createParallelMessage stays under the 30-line service limit and the gates
  // can be unit-tested in isolation. Research is gated by BOTH the plan-level
  // allowResearchMode flag AND the RESEARCH_USE permission (USER_DEFAULT
  // grants RESEARCH_USE so the default unblocks the dropdown once the plan
  // unlocks it). Compare itself is gated by BOTH the plan-level
  // allowCompareMode flag AND the COMPARE_USE permission (parallel here with
  // research). Judge runs additionally require JUDGE_USE.
  private async assertCompareAccess(userId: string, dto: ParallelMessageDto): Promise<void> {
    const features: PlanFeature[] = ['allowCompareMode'];
    if (dto.judgeEnabled === true) {
      features.push('allowJudgeMode');
    }
    // Critic is a first-class sibling of Judge — gate it on its own plan
    // feature so admins can let Pro keep Judge but withhold Critic if desired.
    // The DTO refine guarantees criticEnabled implies judgeEnabled, so the
    // judge gate is already in the array above when this fires.
    if (dto.criticEnabled === true) {
      features.push('allowCriticReview');
    }
    if (dto.researchMode !== undefined && dto.researchMode !== ResearchMode.NONE) {
      features.push('allowResearchMode');
    }
    await this.accessControlService.assertCanSendMessage(userId, { requireFeature: features });
    // Backend-enforced RBAC permission gates. Frontend route guards already
    // hide the entry points; this is defense-in-depth so a direct API call
    // (curl, scripts, a custom client) cannot bypass the matrix.
    await this.accessControlService.assertCanSendMessage(userId, {
      requirePermission: Permission.COMPARE_USE,
    });
    if (dto.judgeEnabled === true) {
      await this.accessControlService.assertCanSendMessage(userId, {
        requirePermission: Permission.JUDGE_USE,
      });
    }
    if (dto.researchMode !== undefined && dto.researchMode !== ResearchMode.NONE) {
      await this.accessControlService.assertCanSendMessage(userId, {
        requirePermission: Permission.RESEARCH_USE,
      });
    }
  }

  private async resolveCompareThread(userId: string, dto: ParallelMessageDto): Promise<ChatThread> {
    if (dto.threadId && dto.threadId.length > 0) {
      return this.getThreadForMessage(dto.threadId, userId);
    }
    return this.chatThreadsRepository.create({
      userId,
      title: `Compare: ${dto.content.slice(0, 50)}`,
      routingMode: RoutingMode.MANUAL_MODEL,
    });
  }

  async createConsensusMessage(
    userId: string,
    dto: ConsensusMessageDto,
    userToken: string,
  ): Promise<ConsensusResponse> {
    await this.assertOrchestrationResearchGate(userId, dto.researchMode);
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
      dto.researchMode,
      dto.researchProviderId,
      userToken,
    );
  }

  async createEscalationChainMessage(
    userId: string,
    dto: EscalationChainMessageDto,
    userToken: string,
  ): Promise<EscalationChainResponse> {
    // Gate research at the chain level — the per-step DTO field is forwarded
    // verbatim to each escalation step; the user-facing gate fires once at
    // the entry point regardless of how many steps request research.
    const chainResearchMode = dto.chain.find(
      (step) => step.researchMode !== undefined && step.researchMode !== ResearchMode.NONE,
    )?.researchMode;
    await this.assertOrchestrationResearchGate(userId, chainResearchMode);
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
      chainResearchMode,
      userToken,
    );
  }

  async createRepairMessage(
    userId: string,
    dto: RepairMessageDto,
    userToken: string,
  ): Promise<AnswerRepairResponse> {
    await this.assertOrchestrationResearchGate(userId, dto.researchMode);
    return this.answerRepairManager.executeRepair(userId, dto, userToken);
  }

  async executeDecomposition(
    userId: string,
    dto: DecomposeTaskDto,
    userToken: string,
  ): Promise<TaskDecompositionResponse> {
    await this.assertOrchestrationResearchGate(userId, dto.researchMode);
    return this.taskDecompositionManager.executeDecomposition(userId, dto, userToken);
  }

  async executeBestOfN(
    userId: string,
    dto: BestOfNMessageDto,
    userToken: string,
  ): Promise<BestOfNResponse> {
    await this.assertOrchestrationResearchGate(userId, dto.researchMode);
    return this.bestOfNManager.executeBestOfN(userId, dto, userToken);
  }

  async executeCostEnsemble(
    userId: string,
    dto: CostEnsembleMessageDto,
    userToken: string,
  ): Promise<CostEnsembleResponse> {
    await this.assertOrchestrationResearchGate(userId, dto.researchMode);
    return this.costEnsembleManager.executeCostEnsemble(userId, dto, userToken);
  }

  async executeVerify(
    userId: string,
    dto: VerifyMessageDto,
    userToken: string,
  ): Promise<VerifyResponse> {
    // Verifier is a separate orchestration lab gated by ROUTER_USE — same
    // permission tier as Consensus / Escalation / Best-of-N. It is
    // intentionally NOT the same gate as the per-lane Judge / Critic
    // toggles inside compare mode (those keep their own allowJudgeMode /
    // allowCriticReview / JUDGE_USE checks), which is why this endpoint
    // does not depend on JUDGE_USE.
    await this.accessControlService.assertCanSendMessage(userId, {
      requirePermission: Permission.ROUTER_USE,
    });
    await this.assertOrchestrationResearchGate(userId, dto.researchMode);
    return this.verifierManager.executeVerify(userId, dto, userToken);
  }

  async executePipeline(
    userId: string,
    dto: PipelineMessageDto,
    userToken: string,
  ): Promise<PipelineResponse> {
    await this.assertOrchestrationResearchGate(userId, dto.researchMode);
    return this.pipelineManager.executePipeline(userId, dto, userToken);
  }

  async executeRolePack(
    userId: string,
    dto: RolePackMessageDto,
    userToken: string,
  ): Promise<RolePackResponse> {
    await this.assertOrchestrationResearchGate(userId, dto.researchMode);
    return this.rolePackManager.executeRolePack(userId, dto, userToken);
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
    void this.rabbitMQService.publish(
      EventPattern.MESSAGE_FEEDBACK_SET,
      this.buildFeedbackEvent(updated, feedback),
    );
    this.logger.log(`setFeedback: completed for message ${messageId}`);
    return updated;
  }

  private buildFeedbackEvent(
    updated: ChatMessage,
    feedback: string | null,
  ): Record<string, unknown> {
    const metadata = this.readMetadata(updated.metadata);
    const routeRoadmap = this.readNestedObject(metadata, 'routeRoadmap');
    return {
      messageId: updated.id,
      threadId: updated.threadId,
      feedback,
      routingMessageId: this.readMetaString(metadata, 'sourceMessageId'),
      provider: updated.provider ?? undefined,
      model: updated.model ?? undefined,
      routingMode: updated.routingMode ?? undefined,
      routerModel: updated.routerModel ?? null,
      judgeDecision: this.readMetaString(metadata, 'judgeDecision'),
      judgeConfidence: this.readMetaNumber(metadata, 'judgeConfidence'),
      detectedCategory: this.readMetaString(routeRoadmap, 'selectedExecutionPath'),
      timestamp: new Date().toISOString(),
    };
  }

  private readNestedObject(
    source: Record<string, unknown> | null,
    key: string,
  ): Record<string, unknown> | null {
    const value = recordGet(source, key);
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private readMetaString(source: Record<string, unknown> | null, key: string): string | undefined {
    const value = recordGet(source, key);
    return typeof value === 'string' ? value : undefined;
  }

  private readMetaNumber(source: Record<string, unknown> | null, key: string): number | undefined {
    const value = recordGet(source, key);
    return typeof value === 'number' ? value : undefined;
  }

  private readMetadata(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
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
    await this.assertThreadReviewAccess(userId, thread);

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
    const startedAt = Date.now();
    this.chatStreamService.emitRequestAccepted(payload.threadId);
    const [threadMessages, thread] = await Promise.all([
      this.chatMessagesRepository.findRecentByThreadId(payload.threadId, 20),
      this.chatThreadsRepository.findById(payload.threadId),
    ]);
    const chronologicalMessages = [...threadMessages].reverse();
    const routedMessages = this.resolveRoutedMessageWindow(
      chronologicalMessages,
      payload.messageId,
    );
    const threadSettings = this.extractThreadSettings(thread);
    const fileIds = this.extractFileIdsFromMessages(routedMessages);
    const latestUserMetadata = this.extractLatestUserMetadata(routedMessages);
    const effectivePayload = this.applyFollowUpOverrides(payload, thread, routedMessages);
    const context = await this.contextAssemblyManager.assemble(
      thread?.userId ?? 'system',
      routedMessages,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds,
      undefined,
      payload.routingMode as RoutingMode,
    );
    try {
      await this.runLlmAndStore(
        effectivePayload,
        payload,
        context,
        threadSettings,
        fileIds,
        thread,
        routedMessages,
        latestUserMetadata,
      );
    } catch (error: unknown) {
      await this.handleMessageRoutedFailure(error, payload, thread, routedMessages, startedAt);
      throw error;
    }
  }

  private async handleMessageRoutedFailure(
    error: unknown,
    payload: MessageRoutedData,
    thread: ChatThread | null,
    chronologicalMessages: ChatMessage[],
    startedAt: number,
  ): Promise<void> {
    const errorMsg = error instanceof Error ? error.message : 'All providers failed';
    const errorCode = error instanceof BusinessException ? error.code : undefined;
    const errorMessageKey = error instanceof BusinessException ? error.messageKey : undefined;
    const failureLatencyMs = Math.max(1, Date.now() - startedAt);
    this.logger.error(`handleMessageRouted: failed for message ${payload.messageId} - ${errorMsg}`);
    const errorMessage = await this.storeErrorResponse(
      payload,
      errorMsg,
      errorCode,
      errorMessageKey,
    );
    this.chatStreamService.emitError(payload.threadId, errorMsg, {
      ...(errorCode === undefined ? {} : { code: errorCode }),
      ...(errorMessageKey === undefined ? {} : { messageKey: errorMessageKey }),
    });
    this.publishMessageCompleted(
      payload,
      errorMessage,
      {
        content: errorMessage.content,
        provider: errorMessage.provider ?? payload.selectedProvider,
        model: errorMessage.model ?? payload.selectedModel,
        latencyMs: failureLatencyMs,
        usedFallback: true,
      },
      thread,
      chronologicalMessages,
      { executionSuccess: false, finalStatus: 'failed', errorMessage: errorMsg },
    );
  }

  private applyFollowUpOverrides(
    payload: MessageRoutedData,
    thread: ChatThread | null,
    chronologicalMessages: ChatMessage[],
  ): MessageRoutedData {
    let effectivePayload = this.detectImageFollowUp(payload, thread, chronologicalMessages);
    effectivePayload = this.detectFileGenerationFollowUp(
      effectivePayload,
      thread,
      chronologicalMessages,
    );
    effectivePayload = this.detectImageFromAttachment(effectivePayload, chronologicalMessages);
    if (thread?.judgeEnabled) {
      effectivePayload = {
        ...effectivePayload,
        judgeEnabled: true,
        criticEnabled: thread.criticEnabled,
        criticModel: thread.criticEnabled ? thread.criticModel : null,
      };
    }
    return effectivePayload;
  }

  private async runLlmAndStore(
    effectivePayload: MessageRoutedData,
    originalPayload: MessageRoutedData,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    fileIds: string[] | undefined,
    thread: ChatThread | null,
    chronologicalMessages: ChatMessage[],
    latestUserMetadata: Record<string, unknown> | null,
  ): Promise<void> {
    this.logger.debug(
      `runLlmAndStore: calling LLM execution for ${effectivePayload.selectedProvider}/${effectivePayload.selectedModel}`,
    );
    const llmResponse = await this.chatExecutionManager.execute(
      effectivePayload,
      context,
      threadSettings,
    );
    const contextMetadata = { memoryCount: context.memories.length, fileIds: fileIds ?? [] };
    const assistantMessage = await this.storeAssistantResponse(
      originalPayload,
      llmResponse,
      contextMetadata,
      latestUserMetadata,
    );
    // Integration V2 — persist the "why was this used?" receipt asynchronously.
    void this.contextReceiptService
      .write(
        assistantMessage.id,
        originalPayload.threadId,
        thread?.userId ?? 'system',
        receiptFromAssembledContext(context, llmResponse.inputTokens ?? 0),
      )
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        this.logger.warn(`runLlmAndStore: receipt write failed — ${msg}`);
      });
    await this.updateThreadAfterResponse(originalPayload.threadId, llmResponse);
    this.chatStreamService.emitCompletion(
      originalPayload.threadId,
      llmResponse.provider,
      llmResponse.model,
    );
    this.logAssistantResponse(originalPayload, llmResponse);
    this.publishMessageCompleted(
      originalPayload,
      assistantMessage,
      llmResponse,
      thread,
      chronologicalMessages,
    );
  }

  private async subscribeToEvents(): Promise<void> {
    await this.rabbitMQService.subscribe(EventPattern.MESSAGE_ROUTED, async (data: unknown) => {
      await this.onMessageRouted(data);
    });

    this.logger.log('Subscribed to chat execution events');
  }

  private async onMessageRouted(data: unknown): Promise<void> {
    const parsed = this.parseMessageRoutedPayload(data);
    if (parsed === null) {
      this.logger.warn('Received message.routed with missing required fields');
      return;
    }
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Received routed message for ${parsed.messageId} via ${parsed.selectedProvider}/${parsed.selectedModel}`,
      action: 'message_routed_received',
      service: ChatMessagesService.name,
      messageId: parsed.messageId,
      threadId: parsed.threadId,
      provider: parsed.selectedProvider,
      model: parsed.selectedModel,
    });
    try {
      if (await this.runtimeV2LoopManager.tryHandleRouted(parsed)) return;
      await this.handleMessageRouted(parsed);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to handle message.routed for message ${parsed.messageId}: ${errorMsg}`,
      );
      this.structuredLogger.logAction({
        level: LogLevel.ERROR,
        message: `Failed to handle message.routed for message ${parsed.messageId}`,
        action: 'message_routed_error',
        service: ChatMessagesService.name,
        messageId: parsed.messageId,
        threadId: parsed.threadId,
        errorMessage: errorMsg,
      });
    }
  }

  private parseMessageRoutedPayload(data: unknown): MessageRoutedData | null {
    const payload = data as Record<string, unknown>;
    const messageId = payload['messageId'] as string | undefined;
    const threadId = payload['threadId'] as string | undefined;
    const selectedProvider = payload['selectedProvider'] as string | undefined;
    const selectedModel = payload['selectedModel'] as string | undefined;
    const routingMode = payload['routingMode'] as string | undefined;
    if (!messageId || !threadId || !selectedProvider || !selectedModel || !routingMode) {
      return null;
    }
    return {
      messageId,
      threadId,
      selectedProvider,
      selectedModel,
      routingMode,
      routerModel: (payload['routerModel'] as string | null | undefined) ?? null,
      fallbackProvider: payload['fallbackProvider'] as string | undefined,
      fallbackModel: payload['fallbackModel'] as string | undefined,
      fallbackChain: payload['fallbackChain'] as
        Array<{ provider: string; model: string }> | undefined,
      timestamp: (payload['timestamp'] as string | undefined) ?? new Date().toISOString(),
      detectedCategory: payload['detectedCategory'] as string | undefined,
      // Phase 6 — workflow live wiring. Routing-service v1 didn't emit
      // these, so undefined is normal and means "execute DIRECT_LLM".
      selectedWorkflow: (payload['selectedWorkflow'] as string | null | undefined) ?? null,
      workflowReason: (payload['workflowReason'] as string | null | undefined) ?? null,
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
      judgeModel: thread.judgeModel,
      criticEnabled: thread.criticEnabled,
      criticModel: thread.criticModel,
      qualityThreshold: thread.qualityThreshold,
      maxReRouteAttempts: thread.maxReRouteAttempts,
    };
  }

  private resolveRoutedMessageWindow(
    messages: ChatMessage[],
    routedMessageId: string,
  ): ChatMessage[] {
    const routedMessageIndex = messages.findIndex(
      (message) => message.id === routedMessageId && message.role === 'USER',
    );
    if (routedMessageIndex < 0) {
      throw new BusinessException(
        'The routed user message is no longer available in the conversation window',
        'ROUTED_MESSAGE_NOT_FOUND',
        HttpStatus.CONFLICT,
      );
    }
    return messages.slice(0, routedMessageIndex + 1);
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

  private async storeErrorResponse(
    payload: MessageRoutedData,
    errorMsg: string,
    errorCode?: string,
    errorMessageKey?: string,
  ): Promise<ChatMessage> {
    return this.chatMessagesRepository.create({
      threadId: payload.threadId,
      role: 'ASSISTANT',
      content: `⚠️ ${errorMsg}`,
      provider: payload.selectedProvider,
      model: payload.selectedModel,
      routingMode: payload.routingMode as RoutingMode,
      routerModel: payload.routerModel ?? null,
      usedFallback: true,
      metadata: {
        error: true,
        sourceMessageId: payload.messageId,
        ...(errorCode === undefined ? {} : { errorCode }),
        ...(errorMessageKey === undefined ? {} : { errorMessageKey }),
      },
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
    const researchSummary = this.extractResearchSummary(latestUserMetadata);
    const progressSummary = this.buildStoredProgressSummary(payload, llmResponse, researchSummary);
    const routeRoadmap = this.buildRouteRoadmap(payload, llmResponse, researchSummary);
    const metadata = this.buildAssistantMetadata({
      payload,
      llmResponse,
      contextMetadata,
      latestUserMetadata,
      hasVisibleContent,
      routeRoadmap,
      progressSummary,
    });
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
      metadata: metadata as Prisma.InputJsonValue,
    });
  }

  private buildRouteRoadmap(
    payload: MessageRoutedData,
    llmResponse: LlmResponse,
    researchSummary: ResearchExecutionSummary | null,
  ): RouteRoadmap {
    return {
      routingMode: payload.routingMode,
      routerModel: payload.routerModel ?? null,
      selectedProvider: payload.selectedProvider,
      selectedModel: payload.selectedModel,
      finalProvider: llmResponse.provider,
      finalModel: llmResponse.model,
      finalDisplayName: llmResponse.model,
      steps: this.buildRouteRoadmapSteps(payload, llmResponse, researchSummary),
      research: researchSummary,
    };
  }

  private buildRouteRoadmapSteps(
    payload: MessageRoutedData,
    llmResponse: LlmResponse,
    researchSummary: ResearchExecutionSummary | null,
  ): RouteRoadmap['steps'] {
    const researchStep: RouteRoadmap['steps'] =
      researchSummary !== null
        ? [
            {
              stage: 'research' as const,
              provider: 'research-service',
              model: researchSummary.workflow,
              displayName: 'Research workflow',
              description: `${String(researchSummary.itemCount)} evidence items collected`,
            },
          ]
        : [];
    const executionStep = {
      stage: 'execution' as const,
      provider: llmResponse.provider,
      model: llmResponse.model,
      displayName: llmResponse.model,
    };
    if (payload.routingMode === 'AUTO' && payload.routerModel) {
      return [
        {
          stage: 'router' as const,
          provider: 'local-ollama',
          model: payload.routerModel,
          displayName: payload.routerModel,
        },
        {
          stage: 'decision' as const,
          provider: payload.selectedProvider,
          model: payload.selectedModel,
        },
        ...researchStep,
        executionStep,
      ];
    }
    return [...researchStep, executionStep];
  }

  private buildAssistantMetadata(args: {
    payload: MessageRoutedData;
    llmResponse: LlmResponse;
    contextMetadata?: { memoryCount: number; fileIds: string[] };
    latestUserMetadata?: Record<string, unknown> | null;
    hasVisibleContent: boolean;
    routeRoadmap: RouteRoadmap;
    progressSummary: StoredProgressSummaryStep[];
  }): Record<string, unknown> {
    const {
      payload,
      llmResponse,
      contextMetadata,
      latestUserMetadata,
      hasVisibleContent,
      routeRoadmap,
      progressSummary,
    } = args;
    return {
      ...this.buildContextMetaPart(contextMetadata),
      ...this.buildResearchMetaPart(latestUserMetadata),
      ...this.buildResearchTranscriptMetaPart(latestUserMetadata),
      ...this.buildGenerationMetaPart(llmResponse),
      sourceMessageId: payload.messageId,
      // What the user asked for versus what actually answered. With AUTO the
      // two differ whenever the chain falls over, and the transcript only ever
      // recorded the winner — so a reply that quietly came from the third
      // provider was indistinguishable from one the router picked first.
      requestedRoutingMode: payload.routingMode,
      requestedProvider: payload.selectedProvider,
      requestedModel: payload.selectedModel,
      respondedProvider: llmResponse.provider,
      respondedModel: llmResponse.model,
      ...this.buildReRouteMetaPart(llmResponse),
      ...this.buildFastPathMetaPart(llmResponse),
      ...this.buildTokenUsageMetaPart(llmResponse),
      ...this.buildWorkflowMetaPart(llmResponse, payload),
      ...this.buildTruncationMetaPart(llmResponse),
      ...this.buildToolTranscriptMetaPart(llmResponse),
      ...(!hasVisibleContent ? { emptyContent: true } : {}),
      ...this.buildDisplayNameMetaPart(latestUserMetadata),
      routeRoadmap,
      progressSummary,
      ...(llmResponse.judgeRefereeMetadata ?? {}),
    };
  }

  // Persists the Ollama Cloud agentic tool-call transcript so the FE can
  // render an expandable "Used X web tools" badge under the assistant
  // message after a page refresh. Empty when the model did not call any
  // tools (the common path for non-agentic models).
  private buildToolTranscriptMetaPart(llmResponse: LlmResponse): Record<string, unknown> {
    if (llmResponse.toolTranscript === undefined) {
      return {};
    }
    return { toolTranscript: llmResponse.toolTranscript };
  }

  // Persists the lightweight ResearchEnricherManager transcript so the FE can
  // render an expandable "Used N web sources" badge under the assistant
  // message after a page refresh. Empty when research was NONE / undefined or
  // when the enricher failed without producing a transcript. Distinct from
  // the heavy `metadata.research` bundle (full EvidenceBundle from
  // /research/runs) — this is the flat source list with per-run latency and
  // warnings, mirroring the buildToolTranscriptMetaPart pattern. When the
  // USER message carries the heavy bundle but no explicit transcript
  // (normal-chat path that ran the workflow runner instead of the enricher),
  // we synthesize a transcript from the bundle so every flow that touched
  // research surfaces the same shape on the assistant message.
  private buildResearchTranscriptMetaPart(
    latestUserMetadata: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    if (!latestUserMetadata) {
      return {};
    }
    const transcript = latestUserMetadata['researchTranscript'];
    if (transcript !== undefined && transcript !== null && typeof transcript === 'object') {
      return { researchTranscript: transcript };
    }
    const synthesized = this.synthesizeTranscriptFromBundle(latestUserMetadata);
    return synthesized !== null ? { researchTranscript: synthesized } : {};
  }

  // Builds a transcript-shaped record from the heavy `metadata.research.bundle`
  // payload persisted by the workflow runner. Lets the normal-chat path
  // expose the same `researchTranscript` shape on the assistant message
  // without invoking the lightweight enricher twice.
  private synthesizeTranscriptFromBundle(
    latestUserMetadata: Record<string, unknown>,
  ): ResearchTranscript | null {
    const researchRecord = this.readNestedObject(latestUserMetadata, 'research');
    if (researchRecord === null) {
      return null;
    }
    const mode = this.readMetaString(researchRecord, 'mode');
    if (mode === undefined) {
      return null;
    }
    const bundleRecord = this.readNestedObject(researchRecord, 'bundle');
    if (bundleRecord === null) {
      return {
        mode: this.coerceResearchMode(mode),
        query: this.readMetaString(latestUserMetadata, 'modelDisplayName') ?? '',
        sources: [],
        latencyMs: 0,
        warnings: [],
        searchRequestCount: 0,
        fetchRequestCount: 0,
      };
    }
    const items = recordGet(bundleRecord, 'items');
    const sources: ResearchTranscriptSource[] = Array.isArray(items)
      ? items
          .filter(
            (item): item is Record<string, unknown> => item !== null && typeof item === 'object',
          )
          .map((item) => this.toTranscriptSource(item))
      : [];
    const warningsRaw = recordGet(bundleRecord, 'warnings');
    const warnings = Array.isArray(warningsRaw)
      ? warningsRaw.filter((value): value is string => typeof value === 'string')
      : [];
    return {
      mode: this.coerceResearchMode(mode),
      query: this.readMetaString(bundleRecord, 'intent') ?? '',
      sources,
      latencyMs: 0,
      warnings,
      searchRequestCount: 0,
      fetchRequestCount: 0,
    };
  }

  private toTranscriptSource(item: Record<string, unknown>): ResearchTranscriptSource {
    const title = this.readMetaString(item, 'title') ?? this.readMetaString(item, 'url') ?? '';
    const url = this.readMetaString(item, 'url') ?? '';
    const snippet = this.readMetaString(item, 'snippet');
    const score = this.readMetaNumber(item, 'confidence');
    return {
      title,
      url,
      ...(snippet !== undefined ? { snippet } : {}),
      ...(score !== undefined ? { score } : {}),
    };
  }

  // Maps the workflow-runner's `mode` string (which may be one of the
  // ResearchWorkflow enum values like SEARCH_ONLY) onto the lightweight
  // ResearchMode enum used by the enricher. Unrecognized values default to
  // SEARCH so the FE always sees a valid mode.
  private coerceResearchMode(raw: string): ResearchMode {
    if (raw === ResearchMode.NONE || raw === ResearchMode.SEARCH) {
      return raw;
    }
    if (raw === ResearchMode.SEARCH_FETCH || raw === ResearchMode.SEARCH_EXTRACT) {
      return raw;
    }
    return ResearchMode.SEARCH;
  }

  // Bug-hunt 2026-05-31, Fix 2 — surface mid-sentence truncation in the
  // assistant message metadata so the FE can render a "context exhausted
  // — raise ctx_size or shorten prompt" banner instead of silently
  // showing the cut-off reply. The flag is additive; existing consumers
  // that don't know about it ignore unknown metadata keys.
  private buildTruncationMetaPart(llmResponse: LlmResponse): Record<string, unknown> {
    if (llmResponse.finishReason !== 'length') {
      return {};
    }
    return { truncatedAtContextLimit: true };
  }

  // Feature 2 — persists token usage transparency on the assistant message so
  // the FE can show whether counts were native or estimated and which context
  // produced them, surviving a page refresh.
  private buildTokenUsageMetaPart(llmResponse: LlmResponse): Record<string, unknown> {
    if (llmResponse.imageGenerationId || llmResponse.fileGenerationId) {
      return {};
    }
    return {
      tokenContext: llmResponse.tokenContext ?? TokenLedgerContext.CHAT,
      ...(llmResponse.tokenEstimated === undefined
        ? {}
        : { tokenEstimated: llmResponse.tokenEstimated }),
      ...(llmResponse.tokenSource === undefined ? {} : { tokenSource: llmResponse.tokenSource }),
    };
  }

  // Phase 6 — persists workflow + search-first outcome on the assistant
  // message so the FE can render the workflow badge after a page refresh
  // without re-querying the routing service.
  private buildWorkflowMetaPart(
    llmResponse: LlmResponse,
    payload: MessageRoutedData,
  ): Record<string, unknown> {
    const workflow = llmResponse.workflow ?? payload.selectedWorkflow ?? null;
    const workflowReason = llmResponse.workflowReason ?? payload.workflowReason ?? null;
    if (workflow === null && llmResponse.searchFirst === undefined) {
      return {};
    }
    return {
      ...(workflow === null ? {} : { workflow }),
      ...(workflowReason === null ? {} : { workflowReason }),
      ...(llmResponse.searchFirst === undefined ? {} : { searchFirst: llmResponse.searchFirst }),
    };
  }

  private buildContextMetaPart(
    contextMetadata: { memoryCount: number; fileIds: string[] } | undefined,
  ): Record<string, unknown> {
    if (!contextMetadata) return {};
    return { memoryCount: contextMetadata.memoryCount, fileIds: contextMetadata.fileIds };
  }

  private buildResearchMetaPart(
    latestUserMetadata: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    const persistedResearch = this.extractPersistedResearch(latestUserMetadata);
    return persistedResearch !== null ? { research: persistedResearch } : {};
  }

  private buildGenerationMetaPart(llmResponse: LlmResponse): Record<string, unknown> {
    if (llmResponse.imageGenerationId) {
      return { type: 'image_generation', generationId: llmResponse.imageGenerationId };
    }
    if (llmResponse.fileGenerationId) {
      return { type: 'file_generation', generationId: llmResponse.fileGenerationId };
    }
    return {};
  }

  private buildReRouteMetaPart(llmResponse: LlmResponse): Record<string, unknown> {
    if (!llmResponse.reRouted) return {};
    return {
      reRouted: true,
      originalProvider: llmResponse.originalProvider,
      originalModel: llmResponse.originalModel,
      originalScore: llmResponse.originalScore,
      reRouteAttempts: llmResponse.reRouteAttempts,
      reRouteReasons: llmResponse.reRouteReasons,
    };
  }

  private buildFastPathMetaPart(llmResponse: LlmResponse): Record<string, unknown> {
    return {
      ...(llmResponse.fastPathUsed ? { fastPathUsed: true } : {}),
      ...(llmResponse.fastPathEscalated ? { fastPathEscalated: true } : {}),
      ...(llmResponse.executionPath ? { executionPath: llmResponse.executionPath } : {}),
      ...(llmResponse.targetLatencyMs ? { targetLatencyMs: llmResponse.targetLatencyMs } : {}),
    };
  }

  private buildDisplayNameMetaPart(
    latestUserMetadata: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    const value = recordGet(latestUserMetadata ?? null, 'modelDisplayName');
    return typeof value === 'string' && value.length > 0
      ? { requestedModelDisplayName: value }
      : {};
  }

  private buildStoredProgressSummary(
    payload: MessageRoutedData,
    llmResponse: LlmResponse,
    researchSummary: ResearchExecutionSummary | null,
  ): StoredProgressSummaryStep[] {
    const modelActor = `${llmResponse.provider} / ${llmResponse.model}`;
    const steps: StoredProgressSummaryStep[] = [this.buildRequestAcceptedStep()];
    if (payload.routingMode === 'AUTO') {
      steps.push(this.buildRoutingStep(payload.routerModel));
    }
    if (researchSummary !== null) {
      steps.push(this.buildResearchStep(researchSummary));
    }
    steps.push(this.buildModelSelectedStep(llmResponse, modelActor));
    if (llmResponse.judgeRefereeMetadata !== undefined) {
      steps.push(this.buildJudgeStep(llmResponse.judgeRefereeMetadata));
    }
    steps.push(this.buildResponseCompleteStep(modelActor));
    return steps;
  }

  private buildRequestAcceptedStep(): StoredProgressSummaryStep {
    return {
      label: 'Request accepted',
      description: 'Claw received your message and queued execution.',
      actorType: 'request',
      actorName: 'Claw',
      status: 'completed',
    };
  }

  private buildRoutingStep(routerModel: string | null | undefined): StoredProgressSummaryStep {
    return {
      label: 'Routing request',
      description: 'The router selected the execution path for this message.',
      actorType: 'router',
      actorName: routerModel ?? 'Auto router',
      status: 'completed',
    };
  }

  private buildResearchStep(researchSummary: ResearchExecutionSummary): StoredProgressSummaryStep {
    return {
      label: 'Gathering evidence',
      description: `${String(researchSummary.itemCount)} evidence items collected with ${researchSummary.toolsUsed.join(', ') || 'research tools'}.`,
      actorType: 'system',
      actorName: 'Research workflow',
      status: 'completed',
    };
  }

  private buildModelSelectedStep(
    llmResponse: LlmResponse,
    modelActor: string,
  ): StoredProgressSummaryStep {
    return {
      label: 'Model selected',
      description: `${llmResponse.provider}/${llmResponse.model} prepared the response.`,
      actorType: 'model',
      actorName: modelActor,
      status: 'completed',
    };
  }

  private buildJudgeStep(
    judge: NonNullable<LlmResponse['judgeRefereeMetadata']>,
  ): StoredProgressSummaryStep {
    return {
      label: 'Verifying answer',
      description: `Judge decision: ${judge.judgeDecision}.`,
      actorType: 'judge',
      actorName: judge.judgeModel,
      status: 'completed',
    };
  }

  private buildResponseCompleteStep(modelActor: string): StoredProgressSummaryStep {
    return {
      label: 'Response complete',
      description: 'The final answer was stored successfully.',
      actorType: 'model',
      actorName: modelActor,
      status: 'completed',
    };
  }

  private extractResearchSummary(
    latestUserMetadata?: Record<string, unknown> | null,
  ): ResearchExecutionSummary | null {
    const researchRecord = this.readNestedObject(latestUserMetadata ?? null, 'research');
    if (researchRecord === null) {
      return null;
    }
    const bundleRecord = this.readNestedObject(researchRecord, 'bundle');
    if (bundleRecord === null) {
      return null;
    }
    return {
      runId: this.readMetaString(researchRecord, 'runId') ?? 'unknown',
      workflow: this.readMetaString(researchRecord, 'mode') ?? 'unknown',
      toolsUsed: this.readStringArray(bundleRecord, 'toolsUsed'),
      helperModels: this.readStringArray(bundleRecord, 'helperModels'),
      itemCount: this.readArrayLength(bundleRecord, 'items'),
      warningCount: this.readArrayLength(bundleRecord, 'warnings'),
    };
  }

  private readStringArray(source: Record<string, unknown>, key: string): string[] {
    const value = recordGet(source, key);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  }

  private readArrayLength(source: Record<string, unknown>, key: string): number {
    const value = recordGet(source, key);
    return Array.isArray(value) ? value.length : 0;
  }

  private extractPersistedResearch(
    latestUserMetadata?: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    const research = latestUserMetadata?.['research'];
    if (research === null || typeof research !== 'object') {
      return null;
    }
    return research as Record<string, unknown>;
  }

  private extractResearchBundle(run: ResearchRunResponse): ResearchExecutionSummary {
    const bundle = run.bundle as Record<string, unknown>;
    const toolsUsed = Array.isArray(bundle['toolsUsed'])
      ? bundle['toolsUsed'].filter((tool): tool is string => typeof tool === 'string')
      : [];
    const helperModels = Array.isArray(bundle['helperModels'])
      ? bundle['helperModels'].filter((model): model is string => typeof model === 'string')
      : [];

    return {
      runId: run.id,
      workflow: run.workflow,
      toolsUsed,
      helperModels,
      itemCount: Array.isArray(bundle['items']) ? bundle['items'].length : 0,
      warningCount: Array.isArray(bundle['warnings']) ? bundle['warnings'].length : 0,
    };
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
    outcomeOverrides?: {
      executionSuccess?: boolean;
      finalStatus?: string;
      errorMessage?: string;
    },
  ): void {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    const tokenContext = llmResponse.tokenContext ?? TokenLedgerContext.CHAT;
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
      usedFallback: llmResponse.usedFallback,
      routingMode: payload.routingMode as RoutingMode,
      detectedCategory: payload.detectedCategory,
      content: assistantMessage.content,
      userContent: lastUserMsg?.content,
      timestamp: new Date().toISOString(),
      executionSuccess: outcomeOverrides?.executionSuccess ?? true,
      finalStatus: outcomeOverrides?.finalStatus ?? 'completed',
      // Feature 2 — usage attribution: tag the completed message with the call
      // context and whether the token counts were estimated / native / mixed.
      tokenContext,
      ...(llmResponse.tokenEstimated === undefined
        ? {}
        : { tokenEstimated: llmResponse.tokenEstimated }),
      ...(llmResponse.tokenSource === undefined ? {} : { tokenSource: llmResponse.tokenSource }),
      ...(outcomeOverrides?.errorMessage ? { errorMessage: outcomeOverrides.errorMessage } : {}),
      ...(payload.routerModel ? { routerModel: payload.routerModel } : {}),
      ...this.buildFastPathMetaPart(llmResponse),
      ...this.buildPublishReRoutePart(llmResponse),
      ...this.buildPublishJudgePart(llmResponse),
    });
    // Token deduction is NOT done here. It happens universally at the
    // ChatExecutionManager.callProvider chokepoint, so EVERY mode (chat,
    // compare per-model, judge critic/judge/revision, consensus, escalation,
    // repair, verify, best-of-n, cost-ensemble, role-pack, pipeline, decompose)
    // consumes the user's daily quota — not only normal chat. This method only
    // publishes the MESSAGE_COMPLETED event for the audit ledger + memory.
  }

  private buildPublishReRoutePart(llmResponse: LlmResponse): Record<string, unknown> {
    if (!llmResponse.reRouted) return {};
    return {
      reRouted: true,
      originalProvider: llmResponse.originalProvider,
      originalModel: llmResponse.originalModel,
      reRouteAttempts: llmResponse.reRouteAttempts,
    };
  }

  private buildPublishJudgePart(llmResponse: LlmResponse): Record<string, unknown> {
    const judge = llmResponse.judgeRefereeMetadata;
    if (judge === undefined) return {};
    return {
      judgeDecision: judge.judgeDecision,
      criticModel: judge.criticModel,
      judgeModel: judge.judgeModel,
      criticScore: judge.criticScore,
      judgeConfidence: judge.judgeConfidence,
    };
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
    const inheritedMode = dto.routingMode ?? thread.routingMode;

    if (inheritedMode !== RoutingMode.MANUAL_MODEL) {
      return {
        effectiveRoutingMode: inheritedMode,
        forcedProvider: undefined,
        forcedModel: undefined,
      };
    }

    // MANUAL_MODEL only honors EXPLICIT user intent: the DTO selection for
    // this message, or the thread's preferredProvider/Model (an explicit
    // per-thread choice). lastProvider/lastModel is NOT user intent — it is
    // just whatever was used most recently, often a stale specialty model
    // (e.g. medgemma1.5) that doesn't match the next prompt. If neither
    // explicit source is set, downgrade to AUTO so the router decides.
    const forcedProvider = dto.provider ?? thread.preferredProvider ?? undefined;
    const forcedModel = dto.model ?? thread.preferredModel ?? undefined;

    if (forcedProvider === undefined && forcedModel === undefined) {
      this.logger.warn(
        `resolveRoutingParams: thread ${thread.id} requested MANUAL_MODEL but has no DTO/preferred selection — downgrading to AUTO (lastProvider/lastModel intentionally ignored)`,
      );
      return {
        effectiveRoutingMode: RoutingMode.AUTO,
        forcedProvider: undefined,
        forcedModel: undefined,
      };
    }

    return {
      effectiveRoutingMode: RoutingMode.MANUAL_MODEL,
      forcedProvider,
      forcedModel,
    };
  }

  private buildMessageMetadata(
    dto: CreateMessageDto,
    researchRun: ResearchRunResponse | null,
  ): UserMessageMetadata | undefined {
    const metadata: UserMessageMetadata = {};
    if (typeof dto.clientIntent === 'string' && dto.clientIntent.length > 0) {
      metadata.clientIntent = dto.clientIntent;
    }
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
    allowedModels: string[],
  ): void {
    void this.rabbitMQService.publish(EventPattern.MESSAGE_CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: message.content,
      routingMode,
      forcedProvider,
      forcedModel,
      // Phase C: plan-allowed "provider/model" keys for AUTO-mode router gating.
      // Empty = no restriction (allow-all) — preserves the v1 hot path.
      allowedModels,
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

  private extractLatestUserText(messages: ChatMessage[]): string | null {
    const lastUser = [...messages].reverse().find((m) => m.role === 'USER');
    return lastUser ? lastUser.content.toLowerCase().trim() : null;
  }

  private matchesFollowUp(lower: string, prefixes: ReadonlyArray<string>): boolean {
    if (lower.length >= SHORT_FOLLOW_UP_MAX_LENGTH) return false;
    if (SHORT_FOLLOW_UP_EXACT_MATCHES.includes(lower)) return true;
    return prefixes.some((prefix) => lower.startsWith(prefix));
  }

  private detectImageFollowUp(
    payload: MessageRoutedData,
    thread: ChatThread | null,
    messages: ChatMessage[],
  ): MessageRoutedData {
    const lastProvider = this.extractImageFollowUpTarget(payload, thread, messages);
    if (lastProvider === null) {
      return payload;
    }
    const lower = this.extractLatestUserText(messages) ?? '';
    const lastImageMsg = [...messages].reverse().find((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      return meta?.['type'] === 'image_generation';
    });
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

  private extractImageFollowUpTarget(
    payload: MessageRoutedData,
    thread: ChatThread | null,
    messages: ChatMessage[],
  ): string | null {
    if (payload.routingMode !== 'AUTO') return null;
    if (payload.selectedProvider.startsWith('IMAGE_')) return null;
    const lastProvider = thread?.lastProvider;
    if (!lastProvider?.startsWith('IMAGE_')) return null;
    const lower = this.extractLatestUserText(messages);
    if (lower === null || !this.matchesFollowUp(lower, IMAGE_FOLLOW_UP_PREFIXES)) {
      return null;
    }
    return lastProvider;
  }

  private detectFileGenerationFollowUp(
    payload: MessageRoutedData,
    _thread: ChatThread | null,
    messages: ChatMessage[],
  ): MessageRoutedData {
    if (payload.routingMode !== 'AUTO') return payload;
    if (payload.selectedProvider === 'FILE_GENERATION') return payload;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'ASSISTANT');
    const meta = lastAssistant?.metadata as Record<string, unknown> | null;
    if (meta?.['type'] !== 'file_generation') return payload;
    const lower = this.extractLatestUserText(messages);
    if (lower === null || !this.matchesFollowUp(lower, FILE_FOLLOW_UP_PREFIXES)) {
      return payload;
    }
    this.logger.log(
      `File generation follow-up detected: "${lower}" → re-routing to FILE_GENERATION`,
    );
    return { ...payload, selectedProvider: 'FILE_GENERATION', selectedModel: 'auto' };
  }

  private detectImageFromAttachment(
    payload: MessageRoutedData,
    messages: ChatMessage[],
  ): MessageRoutedData {
    if (payload.selectedProvider.startsWith('IMAGE_')) return payload;
    const lastUser = [...messages].reverse().find((m) => m.role === 'USER');
    if (!lastUser) return payload;
    const meta = lastUser.metadata as UserMessageMetadata | null;
    const fileIds = Array.isArray(meta?.fileIds) ? meta.fileIds : [];
    if (fileIds.length === 0) return payload;
    const lower = (meta?.clientIntent ?? lastUser.content).toLowerCase();
    if (!IMAGE_INTENT_PHRASES.some((p) => lower.includes(p))) return payload;
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
