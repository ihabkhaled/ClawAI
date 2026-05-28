import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import {
  type Prisma,
  type ComplexityClass as PrismaComplexityClass,
  type RoutingMode,
} from '../../../generated/prisma';
import { EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { toInputJson } from '../../../common/utilities';
import { RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { RoutingManager } from '../managers/routing.manager';
import { ReplayManager } from '../managers/replay.manager';
import { AdaptiveLearningManager } from '../managers/adaptive-learning.manager';
import { PromptBuilderManager } from '../managers/prompt-builder.manager';
import { RouterEducationManager } from '../managers/router-education.manager';
import { LlamacppHealthManager } from '../managers/llamacpp-health.manager';
import { AIRoutePlannerManager } from '../../intelligence/managers/ai-route-planner.manager';
import { SemanticIntentAnalyzerManager } from '../../intelligence/managers/semantic-intent-analyzer.manager';
import { detectHighRisk } from '../utilities/high-risk-detector.utility';
import { applyPlanModelGate } from '../utilities/plan-model-gate.utility';
import type {
  AIRoutePlannerInput,
  PlannerCandidate,
} from '../../intelligence/types/ai-route-plan.types';
import type {
  SemanticIntentAnalysis,
  SemanticIntentAnalyzerInput,
} from '../../intelligence/types/semantic-intent-analysis.types';
import { LiveWorkflowSelectorManager } from '../../workflows/managers/live-workflow-selector.manager';
import { LLAMACPP_RUNTIME } from '../constants/llamacpp.constants';
import { type CreatePolicyDto } from '../dto/create-policy.dto';
import { type ReplayRoutingDto } from '../dto/replay-routing.dto';
import { type UpdatePolicyDto } from '../dto/update-policy.dto';
import { type ListPoliciesQueryDto } from '../dto/list-policies-query.dto';
import { type EvaluateRouteDto } from '../dto/evaluate-route.dto';
import {
  type RoutingContext,
  type RoutingDecision,
  type RoutingDecisionResult,
  type RoutingPolicy,
} from '../types/routing.types';
import { type ReplayBatchResult } from '../types/replay.types';
import type {
  ExportBundle,
  PromotedTestFixture,
  ReplayCaseDetail,
  ReplayRunSummary,
  RunComparisonResult,
} from '../types/replay-run.types';
import type { ProviderFailureStat, RecentFallback, RecoveryStats } from '../types/recovery.types';
import type { AdaptiveLearningInsights } from '../types/adaptive-learning.types';
import type {
  RouterFeedbackPolarity,
  RouterModelProfileRecord,
  RouterTopicProfileRecord,
  RoutingEducationSnapshot,
} from '../types/routing-education.types';

@Injectable()
export class RoutingService implements OnModuleInit {
  private readonly logger = new Logger(RoutingService.name);
  private readonly structuredLogger: StructuredLogger;
  private readonly connectorHealthCache = new Map<string, boolean>();
  private readonly runtimeHealthCache = new Map<string, boolean>();
  private readonly providerLatencyCache = new Map<string, number>();
  private readonly providerSlowStreakCache = new Map<string, number>();
  private readonly providerCircuitOpenUntilCache = new Map<string, number>();

  constructor(
    private readonly policiesRepository: RoutingPoliciesRepository,
    private readonly decisionsRepository: RoutingDecisionsRepository,
    private readonly routingManager: RoutingManager,
    private readonly replayManager: ReplayManager,
    private readonly adaptiveLearningManager: AdaptiveLearningManager,
    private readonly routerEducationManager: RouterEducationManager,
    private readonly rabbitMQService: RabbitMQService,
    private readonly promptBuilder: PromptBuilderManager,
    private readonly llamacppHealth: LlamacppHealthManager,
    private readonly semanticAnalyzer: SemanticIntentAnalyzerManager,
    private readonly aiRoutePlanner: AIRoutePlannerManager,
    private readonly liveWorkflowSelector: LiveWorkflowSelectorManager,
  ) {
    this.structuredLogger = new StructuredLogger(
      this.rabbitMQService,
      'routing-service',
      EventPattern.LOG_SERVER,
      RoutingService.name,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.subscribeToEvents();
  }

  async createPolicy(dto: CreatePolicyDto): Promise<RoutingPolicy> {
    this.logger.log(
      `createPolicy: creating policy "${dto.name}" mode=${dto.routingMode} priority=${String(dto.priority)}`,
    );
    return this.policiesRepository.create({
      name: dto.name,
      routingMode: dto.routingMode,
      priority: dto.priority,
      config: dto.config as Prisma.InputJsonValue,
    });
  }

  async getPolicies(query: ListPoliciesQueryDto): Promise<PaginatedResult<RoutingPolicy>> {
    const filters = {
      routingMode: query.routingMode,
      isActive: query.isActive,
    };

    const [policies, total] = await Promise.all([
      this.policiesRepository.findAll(filters, query.page, query.limit),
      this.policiesRepository.countAll(filters),
    ]);

    return {
      data: policies,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getPolicy(id: string): Promise<RoutingPolicy> {
    const policy = await this.policiesRepository.findById(id);
    if (!policy) {
      throw new EntityNotFoundException('RoutingPolicy', id);
    }
    return policy;
  }

  async updatePolicy(id: string, dto: UpdatePolicyDto): Promise<RoutingPolicy> {
    const policy = await this.policiesRepository.findById(id);
    if (!policy) {
      throw new EntityNotFoundException('RoutingPolicy', id);
    }
    const updateData = {
      ...dto,
      config: dto.config ? (dto.config as Prisma.InputJsonValue) : undefined,
    };
    return this.policiesRepository.update(id, updateData);
  }

  async deletePolicy(id: string): Promise<RoutingPolicy> {
    const policy = await this.policiesRepository.findById(id);
    if (!policy) {
      throw new EntityNotFoundException('RoutingPolicy', id);
    }
    return this.policiesRepository.delete(id);
  }

  async evaluateRoute(dto: EvaluateRouteDto): Promise<RoutingDecisionResult> {
    const config = this.getRuntimeRoutingConfig();
    this.logger.log(
      `evaluateRoute: evaluating route for thread ${dto.threadId ?? 'none'} mode=${dto.routingMode ?? 'AUTO'}`,
    );
    this.runtimeHealthCache.set(LLAMACPP_RUNTIME, this.llamacppHealth.isFrontierAvailable());
    const context: RoutingContext = {
      message: dto.messageContent,
      threadId: dto.threadId,
      userMode: dto.routingMode as RoutingMode | undefined,
      forcedModel: dto.forcedModel,
      forcedProvider: dto.forcedProvider,
      connectorHealth: Object.fromEntries(this.connectorHealthCache),
      runtimeHealth: Object.fromEntries(this.runtimeHealthCache),
      providerLatencyMs: Object.fromEntries(this.providerLatencyCache),
      providerCircuitOpenUntil: this.getActiveProviderCircuits(),
      localDegradeLatencyMs: config.localDegradeLatencyMs,
      latencyPenaltyStepMs: config.latencyPenaltyStepMs,
    };

    const rawDecision = await this.routingManager.evaluateRoute(context);
    const calibrated = await this.routerEducationManager.calibrateDecision(rawDecision, context);
    const withWorkflow = this.attachWorkflowSelection(
      calibrated.decision,
      dto.messageContent,
      (dto.routingMode as RoutingMode | undefined) ?? calibrated.decision.routingMode,
    );
    return withWorkflow;
  }

  // Phase 8 UI transparency — fetches a single decision row by id for the
  // FE detail drawer. The drawer renders semanticAnalysis, candidates,
  // health snapshot, etc. — all already persisted columns.
  async getDecisionDetail(id: string): Promise<RoutingDecision> {
    const decision = await this.decisionsRepository.findById(id);
    if (!decision) {
      throw new EntityNotFoundException('RoutingDecision', id);
    }
    return decision;
  }

  async getDecisions(
    threadId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<RoutingDecision>> {
    const [decisions, total] = await Promise.all([
      this.decisionsRepository.findByThreadId(threadId, page, limit),
      this.decisionsRepository.countByThreadId(threadId),
    ]);

    return {
      data: decisions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async replayRouting(dto: ReplayRoutingDto): Promise<ReplayBatchResult> {
    return this.replayManager.replayDecisions(dto);
  }

  async getReplayRuns(page: number, limit: number): Promise<PaginatedResult<ReplayRunSummary>> {
    const [runs, total] = await Promise.all([
      this.replayManager.getRunSummaries(page, limit),
      this.replayManager.countRuns(),
    ]);
    return { data: runs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getReplayRunCases(runId: string): Promise<ReplayCaseDetail[]> {
    return this.replayManager.getRunCases(runId);
  }

  async getSuspiciousCases(runId: string): Promise<ReplayCaseDetail[]> {
    return this.replayManager.getSuspiciousCases(runId);
  }

  async reviewCase(
    caseId: string,
    isConfirmedRegression: boolean,
    reviewNotes: string | undefined,
  ): Promise<ReplayCaseDetail> {
    return this.replayManager.reviewCase(caseId, isConfirmedRegression, reviewNotes);
  }

  async exportReplayRun(runId: string): Promise<ExportBundle> {
    return this.replayManager.buildExportBundle(runId);
  }

  async promoteCase(caseId: string): Promise<PromotedTestFixture> {
    return this.replayManager.promoteCase(caseId);
  }

  async compareRuns(runId1: string, runId2: string): Promise<RunComparisonResult> {
    return this.replayManager.compareRuns(runId1, runId2);
  }

  async getAdaptiveInsights(windowDays: number): Promise<AdaptiveLearningInsights> {
    return this.adaptiveLearningManager.computeInsights(windowDays);
  }

  async getRoutingEducationSnapshot(): Promise<RoutingEducationSnapshot | null> {
    return this.routerEducationManager.getLatestSnapshot();
  }

  async getModelProfiles(taskFamily?: string, limit = 25): Promise<RouterModelProfileRecord[]> {
    return this.routerEducationManager.listModelProfiles(taskFamily, limit);
  }

  async getTopicProfiles(taskFamily?: string, limit = 25): Promise<RouterTopicProfileRecord[]> {
    return this.routerEducationManager.listTopicProfiles(taskFamily, limit);
  }

  async getRecoveryStats(limit: number): Promise<RecoveryStats> {
    const raw = await this.decisionsRepository.getRecoveryStats(limit);
    const fallbackRate = raw.total > 0 ? raw.withFallback / raw.total : 0;

    const providerStats: ProviderFailureStat[] = raw.providerCounts.map((pc) => ({
      provider: pc.selectedProvider,
      fallbackCount: pc._count.selectedProvider,
      totalCount: raw.total,
      fallbackRate: raw.total > 0 ? pc._count.selectedProvider / raw.total : 0,
    }));

    const recentFallbacks: RecentFallback[] = raw.recent.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      selectedProvider: r.selectedProvider,
      selectedModel: r.selectedModel,
      fallbackProvider: r.fallbackProvider,
      fallbackModel: r.fallbackModel,
      routingMode: r.routingMode,
    }));

    return {
      totalDecisions: raw.total,
      totalWithFallback: raw.withFallback,
      fallbackRate,
      providerStats,
      recentFallbacks,
    };
  }

  private async subscribeToEvents(): Promise<void> {
    await this.rabbitMQService.subscribe(EventPattern.MESSAGE_CREATED, async (data: unknown) => {
      await this.handleMessageCreated(data);
    });

    await this.rabbitMQService.subscribe(
      EventPattern.CONNECTOR_HEALTH_CHECKED,
      async (data: unknown) => {
        this.handleConnectorHealthChecked(data);
      },
    );

    await this.rabbitMQService.subscribe(EventPattern.CONNECTOR_SYNCED, async (data: unknown) => {
      this.handleConnectorSynced(data);
    });

    await this.rabbitMQService.subscribe(EventPattern.MODEL_PULLED, async () => {
      this.handleModelChanged('model.pulled');
    });

    await this.rabbitMQService.subscribe(EventPattern.MODEL_DELETED, async () => {
      this.handleModelChanged('model.deleted');
    });

    await this.rabbitMQService.subscribe(EventPattern.MESSAGE_COMPLETED, async (data: unknown) => {
      this.handleMessageCompleted(data);
    });

    await this.rabbitMQService.subscribe('message.feedback_set', async (data: unknown) => {
      await this.handleMessageFeedbackSet(data);
    });

    await this.rabbitMQService.subscribe(EventPattern.LLAMACPP_MODEL_LOADED, async () => {
      this.handleLlamacppRuntimeChanged('llamacpp.model.loaded', true);
    });

    await this.rabbitMQService.subscribe(EventPattern.LLAMACPP_MODEL_UNLOADED, async () => {
      this.handleLlamacppRuntimeChanged('llamacpp.model.unloaded', false);
    });

    await this.rabbitMQService.subscribe(EventPattern.LLAMACPP_MODEL_CRASHED, async () => {
      this.handleLlamacppRuntimeChanged('llamacpp.model.crashed', false);
    });

    this.logger.log('Subscribed to routing events');
  }

  private handleLlamacppRuntimeChanged(event: string, healthy: boolean): void {
    this.logger.log(`handleLlamacppRuntimeChanged: ${event} healthy=${String(healthy)}`);
    this.runtimeHealthCache.set(LLAMACPP_RUNTIME, healthy);
    this.promptBuilder.invalidateCache();
  }

  private async handleMessageCreated(data: unknown): Promise<void> {
    const payload = data as Record<string, unknown>;
    const parsed = this.parseMessageCreatedPayload(payload);
    if (!parsed) {
      return;
    }

    const {
      messageId,
      threadId,
      content,
      routingMode,
      forcedProvider,
      forcedModel,
      allowedModels,
    } = parsed;

    this.logMessageCreatedConsumed(messageId, threadId);

    const context = this.buildRoutingContext(
      content,
      threadId,
      routingMode,
      forcedProvider,
      forcedModel,
    );
    const rawDecision = await this.routingManager.evaluateRoute(context);
    const calibrated = await this.routerEducationManager.calibrateDecision(rawDecision, context);
    const decisionWithWorkflow = this.attachWorkflowSelection(
      calibrated.decision,
      content,
      routingMode ?? calibrated.decision.routingMode,
    );
    // Phase C — AUTO-mode plan gate: never let the router land on a model the
    // user's plan forbids. Empty allowedModels = no restriction (allow-all).
    const gate = applyPlanModelGate(decisionWithWorkflow, allowedModels);
    if (gate.outcome === 'promoted') {
      this.logger.warn(
        `planModelGate: promoted ${gate.decision.selectedProvider}/${gate.decision.selectedModel} (primary was off-plan)`,
      );
    } else if (gate.outcome === 'unsatisfiable') {
      this.logger.error(
        `planModelGate: plan allows none of the candidates — chat-service will block execution`,
      );
    }

    await this.storeAndPublishDecision(messageId, threadId, content, gate.decision);
  }

  private parseMessageCreatedPayload(payload: Record<string, unknown>): {
    messageId: string | undefined;
    threadId: string;
    content: string;
    routingMode: RoutingMode | undefined;
    forcedProvider: string | undefined;
    forcedModel: string | undefined;
    allowedModels: string[];
  } | null {
    const threadId = payload['threadId'] as string | undefined;
    const content = payload['content'] as string | undefined;

    if (!threadId || !content) {
      this.logger.warn('Received message.created with missing threadId or content');
      return null;
    }

    const rawAllowed = payload['allowedModels'];
    const allowedModels = Array.isArray(rawAllowed)
      ? rawAllowed.filter((m): m is string => typeof m === 'string')
      : [];

    return {
      messageId: payload['messageId'] as string | undefined,
      threadId,
      content,
      routingMode: payload['routingMode'] as RoutingMode | undefined,
      forcedProvider: payload['forcedProvider'] as string | undefined,
      forcedModel: payload['forcedModel'] as string | undefined,
      allowedModels,
    };
  }

  private logMessageCreatedConsumed(messageId: string | undefined, threadId: string): void {
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Consumed message.created for thread ${threadId}`,
      action: 'message_created_consumed',
      service: RoutingService.name,
      messageId: messageId ?? undefined,
      threadId,
    });
  }

  private buildRoutingContext(
    content: string,
    threadId: string,
    routingMode: RoutingMode | undefined,
    forcedProvider: string | undefined,
    forcedModel: string | undefined,
  ): RoutingContext {
    const config = this.getRuntimeRoutingConfig();
    this.runtimeHealthCache.set(LLAMACPP_RUNTIME, this.llamacppHealth.isFrontierAvailable());
    return {
      message: content,
      threadId,
      userMode: routingMode,
      forcedProvider,
      forcedModel,
      connectorHealth: Object.fromEntries(this.connectorHealthCache),
      runtimeHealth: Object.fromEntries(this.runtimeHealthCache),
      providerLatencyMs: Object.fromEntries(this.providerLatencyCache),
      providerCircuitOpenUntil: this.getActiveProviderCircuits(),
      localDegradeLatencyMs: config.localDegradeLatencyMs,
      latencyPenaltyStepMs: config.latencyPenaltyStepMs,
    };
  }

  // Phase 6 — wraps the routing decision with a live workflow selection.
  // Pure / cheap; the heavy lift is in the keyword regex which matchKeyword
  // already caches. Safe to call on every routing decision.
  private attachWorkflowSelection(
    decision: RoutingDecisionResult,
    message: string,
    routingMode: RoutingMode,
  ): RoutingDecisionResult {
    try {
      const selection = this.liveWorkflowSelector.selectWorkflow({
        message,
        routingMode,
        semanticIntent: null,
        keywordSignals: [],
        attachmentMimeTypes: [],
      });
      return {
        ...decision,
        selectedWorkflow: selection.kind,
        workflowReason: selection.reason,
        workflowAlternatives: selection.alternatives,
      };
    } catch (error) {
      // Workflow selection is additive — failing here must NEVER block
      // routing. Fall back to the decision as-is and log so the failure
      // is visible in ops dashboards.
      this.logger.error(`attachWorkflowSelection: failed — ${(error as Error).message}`);
      return decision;
    }
  }

  private async storeAndPublishDecision(
    messageId: string | undefined,
    threadId: string,
    messageContent: string,
    decision: RoutingDecisionResult,
  ): Promise<void> {
    const fallback = decision.fallbackChain[0];
    const modelInventorySnapshot = await this.promptBuilder.getInstalledModels();
    const connectorHealthSnapshot = this.buildConnectorHealthSnapshot();

    await this.decisionsRepository.create({
      messageId,
      threadId,
      messageContent: messageContent.slice(0, 2000),
      selectedProvider: decision.selectedProvider,
      selectedModel: decision.selectedModel,
      routingMode: decision.routingMode,
      confidence: decision.confidence,
      reasonTags: decision.reasonTags,
      privacyClass: decision.privacyClass,
      costClass: decision.costClass,
      fallbackProvider: fallback?.provider,
      fallbackModel: fallback?.model,
      complexityClass: decision.complexityClass as PrismaComplexityClass | undefined,
      detectedCategory: decision.detectedCategory,
      secondaryCategory: decision.secondaryCategory,
      matchCount: decision.matchCount,
      selectedExecutionPath: decision.selectedExecutionPath ?? decision.detectedCategory,
      routeRoadmap: toInputJson(this.buildRouteRoadmap(decision)),
      modelInventorySnapshot: toInputJson(modelInventorySnapshot),
      connectorHealthSnapshot: connectorHealthSnapshot as Prisma.InputJsonValue,
      capabilityMatchScore: decision.capabilityMatchScore,
      latencyScore: decision.latencyScore,
      riskScore: decision.riskScore,
      uncertaintyScore: decision.uncertaintyScore,
      explanation: decision.explanation as Prisma.InputJsonValue | undefined,
      routingDurationMs: decision.routingDurationMs,
      selectedWorkflow: decision.selectedWorkflow ?? null,
      workflowReason: decision.workflowReason ?? null,
    });

    this.logRoutingDecision(messageId, threadId, decision);
    this.publishMessageRoutedEvent(messageId, threadId, decision, fallback, messageContent);

    // Phase 2 shadow — fire-and-forget. Analyzer runs in the background,
    // patches semantic_analysis on the decision row when done. Failures
    // are recorded in the same column with status != SUCCESS so we can
    // monitor analyzer quality without blocking the hot path.
    void this.runSemanticAnalysisShadow(messageId, threadId, messageContent, decision);

    // Phase 4 shadow — fire-and-forget. Planner runs AFTER the analyzer so
    // it can read the SemanticIntentAnalysis row. We wait 12s (analyzer
    // p95 + headroom) then read the decision row to pick up whatever the
    // analyzer wrote. If the analyzer was disabled / failed we skip with
    // SKIPPED_NO_ANALYSIS — the planner needs the analyzer's intent
    // signals to produce a meaningful pick.
    void this.runAiRoutePlannerShadow(messageId, threadId, messageContent, decision);
  }

  private async runSemanticAnalysisShadow(
    messageId: string | undefined,
    threadId: string,
    messageContent: string,
    decision: RoutingDecisionResult,
  ): Promise<void> {
    if (!messageId) {
      // Without a messageId we have no way to correlate the analysis row
      // back to the decision later. Skip silently — Phase 4 hot-path
      // invocation will fix this when it runs analyzer pre-decision.
      return;
    }
    const config = AppConfig.get();
    if (!config.ROUTING_SEMANTIC_ANALYZER_ENABLED) {
      return;
    }
    try {
      const input: SemanticIntentAnalyzerInput = {
        threadId,
        message: messageContent,
        routingMode: decision.routingMode,
        // Phase 2 has no cross-service thread history fetch yet — Phase 3
        // adds that via a chat-service RPC. For now the analyzer works
        // off message + signals only; reasoningSummary will note the
        // missing context.
        keywordSignals: decision.detectedCategory
          ? [{ category: decision.detectedCategory, matchedTerms: [], confidenceBoost: 0.5 }]
          : [],
      };
      const record = await this.semanticAnalyzer.analyze(input);
      await this.decisionsRepository.updateSemanticAnalysisByMessageId(
        messageId,
        toInputJson(record),
      );
      this.logger.debug(
        `runSemanticAnalysisShadow: stored analysis status=${record.status} for messageId=${messageId}`,
      );
    } catch (error) {
      // Shadow path: never propagate, never retry beyond the analyzer's
      // own retry. Log and move on so the hot path stays healthy.
      this.logger.error(
        `runSemanticAnalysisShadow: failed for messageId=${messageId} — ${(error as Error).message}`,
      );
    }
  }

  // Phase 4 — chained shadow. Runs AFTER the analyzer so the planner can
  // read the SemanticIntentAnalysis as input. We wait 12s (analyzer p95 +
  // headroom) then re-fetch the decision row to pick up whatever the
  // analyzer wrote. If no analysis exists (flag off / analyzer failed /
  // no messageId), we skip with SKIPPED_NO_ANALYSIS so dashboards can
  // distinguish "analyzer down" from "planner down".
  private async runAiRoutePlannerShadow(
    messageId: string | undefined,
    threadId: string,
    messageContent: string,
    decision: RoutingDecisionResult,
  ): Promise<void> {
    if (!messageId) {
      return;
    }
    const config = AppConfig.get();
    if (!config.ROUTING_AI_ROUTE_PLANNER_ENABLED) {
      return;
    }
    try {
      // Wait for the analyzer shadow to finish before reading the row.
      // 12s = analyzer p95 (~8s) + headroom. If the analyzer is faster the
      // planner still picks up its output; if slower we accept null and
      // skip with SKIPPED_NO_ANALYSIS so we don't block on each other.
      await new Promise((resolve) => setTimeout(resolve, 12_000));

      const row = await this.decisionsRepository.findFirstByMessageId(messageId);
      const semanticIntent = this.extractSemanticIntent(row?.semanticAnalysis);

      const input: AIRoutePlannerInput = {
        threadId,
        message: messageContent,
        routingMode: decision.routingMode,
        semanticIntent,
        candidates: this.buildPlannerCandidates(decision),
      };
      const record = await this.aiRoutePlanner.plan(input);
      await this.decisionsRepository.updateAiRoutePlanByMessageId(messageId, toInputJson(record));
      this.logger.debug(
        `runAiRoutePlannerShadow: stored plan status=${record.status} for messageId=${messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `runAiRoutePlannerShadow: failed for messageId=${messageId} — ${(error as Error).message}`,
      );
    }
  }

  // Extracts the SemanticIntentAnalysis (or null) from the persisted
  // SemanticIntentAnalysisRecord JSON column. The column stores the full
  // record (status + analysis + metadata); the planner only needs the
  // analysis payload.
  private extractSemanticIntent(semanticAnalysisColumn: unknown): SemanticIntentAnalysis | null {
    if (semanticAnalysisColumn === null || typeof semanticAnalysisColumn !== 'object') {
      return null;
    }
    const record = semanticAnalysisColumn as { analysis?: SemanticIntentAnalysis | null };
    return record.analysis ?? null;
  }

  // Builds the candidate list the planner will see. Phase 4 keeps this
  // minimal — primary + fallback chain from the calibrated decision.
  // Phase 3 (model intelligence enrichment) will replace this with a
  // full provider/model registry snapshot, but the shape stays stable.
  private buildPlannerCandidates(decision: RoutingDecisionResult): PlannerCandidate[] {
    const seen = new Set<string>();
    const candidates: PlannerCandidate[] = [];
    const push = (provider: string, model: string): void => {
      const key = `${provider}::${model}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      candidates.push({
        provider,
        model,
        isAvailable: true,
        isRouterOnly: false,
        isExecutionModel: true,
      });
    };
    push(decision.selectedProvider, decision.selectedModel);
    for (const entry of decision.fallbackChain ?? []) {
      push(entry.provider, entry.model);
    }
    return candidates;
  }

  private buildConnectorHealthSnapshot(): {
    connectorHealth: Record<string, boolean>;
    runtimeHealth: Record<string, boolean>;
    providerLatencyMs: Record<string, number>;
    providerCircuitOpenUntil: Record<string, number>;
  } {
    return {
      connectorHealth: Object.fromEntries(this.connectorHealthCache),
      runtimeHealth: Object.fromEntries(this.runtimeHealthCache),
      providerLatencyMs: Object.fromEntries(this.providerLatencyCache),
      providerCircuitOpenUntil: this.getActiveProviderCircuits(),
    };
  }

  private buildRouteRoadmap(decision: RoutingDecisionResult): {
    selectedProvider: string;
    selectedModel: string;
    fallbackChain: RoutingDecisionResult['fallbackChain'];
    detectedCategory: string | null;
    secondaryCategory: string | null;
  } {
    return {
      selectedProvider: decision.selectedProvider,
      selectedModel: decision.selectedModel,
      fallbackChain: decision.fallbackChain,
      detectedCategory: decision.detectedCategory ?? null,
      secondaryCategory: decision.secondaryCategory ?? null,
    };
  }

  private logRoutingDecision(
    messageId: string | undefined,
    threadId: string,
    decision: RoutingDecisionResult,
  ): void {
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Routing decision: ${decision.selectedProvider}/${decision.selectedModel} (confidence: ${String(decision.confidence)})`,
      action: 'routing_decision',
      service: RoutingService.name,
      messageId: messageId ?? undefined,
      threadId,
      provider: decision.selectedProvider,
      model: decision.selectedModel,
      metadata: {
        routingMode: decision.routingMode,
        confidence: decision.confidence,
        reasonTags: decision.reasonTags,
      },
    });
  }

  private publishMessageRoutedEvent(
    messageId: string | undefined,
    threadId: string,
    decision: RoutingDecisionResult,
    fallback: RoutingDecisionResult['fallbackChain'][number] | undefined,
    messageContent: string,
  ): void {
    const judgeEnabled = this.shouldAutoTriggerJudge(messageContent);
    void this.rabbitMQService.publish(EventPattern.MESSAGE_ROUTED, {
      messageId,
      threadId,
      selectedProvider: decision.selectedProvider,
      selectedModel: decision.selectedModel,
      routingMode: decision.routingMode,
      routerModel: decision.routerModel ?? null,
      fallbackProvider: fallback?.provider,
      fallbackModel: fallback?.model,
      fallbackChain: decision.fallbackChain,
      detectedCategory: decision.detectedCategory,
      // Phase 7 — auto-trigger judge for high-risk domains. Only fires
      // when ROUTING_JUDGE_HIGH_RISK_ENABLED=true; otherwise stays
      // undefined and the chat-service falls back to its own
      // category-based heuristic.
      judgeEnabled,
      // Phase 6 — workflow live wiring. Consumers (chat-service) can act
      // on this to swap in SEARCH_FIRST execution; null means the v1
      // hot path is in effect and DIRECT_LLM is assumed downstream.
      selectedWorkflow: decision.selectedWorkflow ?? null,
      workflowReason: decision.workflowReason ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  // Phase 7 — returns true if the message warrants an auto-judge based
  // on keyword match or (when the analyzer is enabled hot-path) the
  // analyzer's riskLevel. Returns undefined when the flag is off so
  // downstream chat-service keeps using its existing category heuristic
  // (no change in behaviour for v1 users).
  private shouldAutoTriggerJudge(messageContent: string): boolean | undefined {
    const config = AppConfig.get();
    if (!config.ROUTING_JUDGE_HIGH_RISK_ENABLED) {
      return undefined;
    }
    const signal = detectHighRisk(messageContent, null);
    if (signal.isHighRisk) {
      this.logger.log(
        `shouldAutoTriggerJudge: high-risk detected matchedKeywords=[${signal.matchedKeywords.slice(0, 5).join(', ')}]`,
      );
    }
    return signal.isHighRisk;
  }

  private handleConnectorHealthChecked(data: unknown): void {
    const payload = data as Record<string, unknown>;
    const provider = payload['provider'] as string | undefined;
    const status = payload['status'] as string | undefined;

    if (provider && status) {
      const isHealthy = status === 'HEALTHY';
      this.logger.debug(`handleConnectorHealthChecked: provider=${provider} status=${status}`);
      this.connectorHealthCache.set(provider, isHealthy);
    }
  }

  private handleConnectorSynced(data: unknown): void {
    const payload = data as Record<string, unknown>;
    const runtime = payload['runtime'] as string | undefined;

    if (runtime) {
      this.logger.debug(`handleConnectorSynced: runtime=${runtime} marked healthy`);
      this.runtimeHealthCache.set(runtime, true);
    }
    this.promptBuilder.invalidateCache();
  }

  private handleModelChanged(event: string): void {
    this.logger.log(`handleModelChanged: ${event} received — invalidating prompt cache`);
    this.promptBuilder.invalidateCache();
  }

  private handleMessageCompleted(data: unknown): void {
    const payload = data as Record<string, unknown>;
    const providerRaw = payload['provider'];
    const latencyRaw = payload['latencyMs'];

    if (typeof providerRaw !== 'string' || typeof latencyRaw !== 'number' || latencyRaw < 0) {
      return;
    }

    const provider = this.normalizeProviderName(providerRaw);
    const latencyMs = Math.round(latencyRaw);
    const config = this.getRuntimeRoutingConfig();

    this.recordProviderLatency(provider, latencyMs, config.latencyEwmaWeight);
    this.applyLatencyCircuit(provider, latencyMs, config);
    this.pruneExpiredProviderCircuits();

    void this.routerEducationManager.ingestExecutionOutcome(
      this.buildExecutionOutcomePayload(payload, provider, latencyMs),
    );
  }

  private recordProviderLatency(provider: string, latencyMs: number, weight: number): void {
    const prevLatency = this.providerLatencyCache.get(provider);
    const nextLatency =
      typeof prevLatency === 'number'
        ? Math.round(prevLatency * weight + latencyMs * (1 - weight))
        : latencyMs;
    this.providerLatencyCache.set(provider, nextLatency);
  }

  private applyLatencyCircuit(
    provider: string,
    latencyMs: number,
    config: {
      providerSlowThresholdMs: number;
      providerSlowStreak: number;
      providerCircuitOpenMs: number;
    },
  ): void {
    if (latencyMs >= config.providerSlowThresholdMs) {
      const nextStreak = (this.providerSlowStreakCache.get(provider) ?? 0) + 1;
      this.providerSlowStreakCache.set(provider, nextStreak);
      if (nextStreak >= config.providerSlowStreak) {
        this.openLatencyCircuit(provider, config.providerCircuitOpenMs);
      }
      return;
    }
    this.providerSlowStreakCache.set(provider, 0);
    const openUntil = this.providerCircuitOpenUntilCache.get(provider);
    if (typeof openUntil === 'number' && openUntil > Date.now()) {
      this.removeProviderCircuit(provider);
      this.logger.log(`handleMessageCompleted: closing latency circuit for ${provider}`);
    }
  }

  private openLatencyCircuit(provider: string, circuitOpenMs: number): void {
    const openUntil = Date.now() + circuitOpenMs;
    this.providerCircuitOpenUntilCache.set(provider, openUntil);
    this.providerSlowStreakCache.set(provider, 0);
    this.logger.warn(
      `handleMessageCompleted: opening latency circuit for ${provider} until ${new Date(openUntil).toISOString()}`,
    );
  }

  private buildExecutionOutcomePayload(
    payload: Record<string, unknown>,
    provider: string,
    latencyMs: number,
  ): {
    messageId: string;
    threadId: string;
    assistantMessageId: string | undefined;
    provider: string;
    model: string;
    latencyMs: number;
    executionSuccess: boolean;
    finalStatus: string | undefined;
    errorMessage: string | undefined;
    usedFallback: boolean;
    judgeDecision: string | undefined;
    judgeConfidence: number | undefined;
    criticScore: number | undefined;
    reRouted: boolean;
    detectedCategory: string | undefined;
  } {
    return {
      messageId: this.asString(payload['messageId']) ?? '',
      threadId: this.asString(payload['threadId']) ?? '',
      assistantMessageId: this.asString(payload['assistantMessageId']),
      provider,
      model: this.asString(payload['model']) ?? '',
      latencyMs,
      executionSuccess: payload['executionSuccess'] === false ? false : true,
      finalStatus: this.asString(payload['finalStatus']),
      errorMessage: this.asString(payload['errorMessage']),
      usedFallback: payload['usedFallback'] === true,
      judgeDecision: this.asString(payload['judgeDecision']),
      judgeConfidence: this.asNumber(payload['judgeConfidence']),
      criticScore: this.asNumber(payload['criticScore']),
      reRouted: payload['reRouted'] === true,
      detectedCategory: this.asString(payload['detectedCategory']),
    };
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private asNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }

  private async handleMessageFeedbackSet(data: unknown): Promise<void> {
    const payload = data as Record<string, unknown>;
    const messageId = this.asString(payload['messageId']) ?? '';
    const threadId = this.asString(payload['threadId']) ?? '';
    const feedback = this.asFeedback(payload['feedback']);

    if (messageId.length === 0 || threadId.length === 0 || feedback === null) {
      return;
    }

    await this.routerEducationManager.ingestFeedbackSignal({
      messageId,
      threadId,
      feedback,
      provider: this.asString(payload['provider']),
      model: this.asString(payload['model']),
      detectedCategory: this.asString(payload['detectedCategory']),
    });
  }

  private asFeedback(value: unknown): RouterFeedbackPolarity | null {
    if (value === 'positive' || value === 'negative') {
      return value;
    }
    return null;
  }

  private pruneExpiredProviderCircuits(): void {
    const now = Date.now();
    for (const [name, openUntil] of this.providerCircuitOpenUntilCache) {
      if (openUntil <= now) {
        this.providerCircuitOpenUntilCache.delete(name);
      }
    }
  }

  private getActiveProviderCircuits(): Record<string, number> {
    this.pruneExpiredProviderCircuits();
    return Object.fromEntries(this.providerCircuitOpenUntilCache);
  }

  private normalizeProviderName(provider: string): string {
    const normalized = provider.trim();
    if (normalized.toLowerCase() === 'local-ollama') {
      return 'local-ollama';
    }
    return normalized.toUpperCase();
  }

  private removeProviderCircuit(provider: string): void {
    this.providerCircuitOpenUntilCache.delete(provider);
  }

  private getRuntimeRoutingConfig(): {
    localDegradeLatencyMs: number;
    latencyPenaltyStepMs: number;
    latencyEwmaWeight: number;
    providerSlowThresholdMs: number;
    providerSlowStreak: number;
    providerCircuitOpenMs: number;
  } {
    try {
      const config = AppConfig.get();
      return {
        localDegradeLatencyMs: config.ROUTING_LOCAL_DEGRADE_LATENCY_MS,
        latencyPenaltyStepMs: config.ROUTING_LATENCY_PENALTY_STEP_MS,
        latencyEwmaWeight: config.ROUTING_LATENCY_EWMA_WEIGHT,
        providerSlowThresholdMs: config.ROUTING_PROVIDER_SLOW_THRESHOLD_MS,
        providerSlowStreak: config.ROUTING_PROVIDER_SLOW_STREAK,
        providerCircuitOpenMs: config.ROUTING_PROVIDER_CIRCUIT_OPEN_MS,
      };
    } catch {
      return {
        localDegradeLatencyMs: 18_000,
        latencyPenaltyStepMs: 6_000,
        latencyEwmaWeight: 0.7,
        providerSlowThresholdMs: 15_000,
        providerSlowStreak: 3,
        providerCircuitOpenMs: 90_000,
      };
    }
  }
}
