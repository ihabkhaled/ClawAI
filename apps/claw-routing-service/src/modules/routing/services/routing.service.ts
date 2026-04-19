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
import { RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { RoutingManager } from '../managers/routing.manager';
import { ReplayManager } from '../managers/replay.manager';
import { AdaptiveLearningManager } from '../managers/adaptive-learning.manager';
import { PromptBuilderManager } from '../managers/prompt-builder.manager';
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

@Injectable()
export class RoutingService implements OnModuleInit {
  private readonly logger = new Logger(RoutingService.name);
  private readonly structuredLogger: StructuredLogger;
  private connectorHealthCache: Record<string, boolean> = {};
  private runtimeHealthCache: Record<string, boolean> = {};
  private providerLatencyCache: Record<string, number> = {};
  private providerSlowStreakCache: Record<string, number> = {};
  private providerCircuitOpenUntilCache: Record<string, number> = {};

  constructor(
    private readonly policiesRepository: RoutingPoliciesRepository,
    private readonly decisionsRepository: RoutingDecisionsRepository,
    private readonly routingManager: RoutingManager,
    private readonly replayManager: ReplayManager,
    private readonly adaptiveLearningManager: AdaptiveLearningManager,
    private readonly rabbitMQService: RabbitMQService,
    private readonly promptBuilder: PromptBuilderManager,
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
    const context: RoutingContext = {
      message: dto.messageContent,
      threadId: dto.threadId,
      userMode: dto.routingMode as RoutingMode | undefined,
      forcedModel: dto.forcedModel,
      forcedProvider: dto.forcedProvider,
      connectorHealth: { ...this.connectorHealthCache },
      runtimeHealth: { ...this.runtimeHealthCache },
      providerLatencyMs: { ...this.providerLatencyCache },
      providerCircuitOpenUntil: this.getActiveProviderCircuits(),
      localDegradeLatencyMs: config.localDegradeLatencyMs,
      latencyPenaltyStepMs: config.latencyPenaltyStepMs,
    };

    return this.routingManager.evaluateRoute(context);
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

    this.logger.log('Subscribed to routing events');
  }

  private async handleMessageCreated(data: unknown): Promise<void> {
    const payload = data as Record<string, unknown>;
    const parsed = this.parseMessageCreatedPayload(payload);
    if (!parsed) {
      return;
    }

    const { messageId, threadId, content, routingMode, forcedProvider, forcedModel } = parsed;

    this.logMessageCreatedConsumed(messageId, threadId);

    const context = this.buildRoutingContext(
      content,
      threadId,
      routingMode,
      forcedProvider,
      forcedModel,
    );
    const decision = await this.routingManager.evaluateRoute(context);

    await this.storeAndPublishDecision(messageId, threadId, content, decision);
  }

  private parseMessageCreatedPayload(payload: Record<string, unknown>): {
    messageId: string | undefined;
    threadId: string;
    content: string;
    routingMode: RoutingMode | undefined;
    forcedProvider: string | undefined;
    forcedModel: string | undefined;
  } | null {
    const threadId = payload['threadId'] as string | undefined;
    const content = payload['content'] as string | undefined;

    if (!threadId || !content) {
      this.logger.warn('Received message.created with missing threadId or content');
      return null;
    }

    return {
      messageId: payload['messageId'] as string | undefined,
      threadId,
      content,
      routingMode: payload['routingMode'] as RoutingMode | undefined,
      forcedProvider: payload['forcedProvider'] as string | undefined,
      forcedModel: payload['forcedModel'] as string | undefined,
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
    return {
      message: content,
      threadId,
      userMode: routingMode,
      forcedProvider,
      forcedModel,
      connectorHealth: { ...this.connectorHealthCache },
      runtimeHealth: { ...this.runtimeHealthCache },
      providerLatencyMs: { ...this.providerLatencyCache },
      providerCircuitOpenUntil: this.getActiveProviderCircuits(),
      localDegradeLatencyMs: config.localDegradeLatencyMs,
      latencyPenaltyStepMs: config.latencyPenaltyStepMs,
    };
  }

  private async storeAndPublishDecision(
    messageId: string | undefined,
    threadId: string,
    messageContent: string,
    decision: RoutingDecisionResult,
  ): Promise<void> {
    const fallback = decision.fallbackChain[0];

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
      explanation: decision.explanation as Prisma.InputJsonValue | undefined,
      routingDurationMs: decision.routingDurationMs,
    });

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

    void this.rabbitMQService.publish(EventPattern.MESSAGE_ROUTED, {
      messageId,
      threadId,
      selectedProvider: decision.selectedProvider,
      selectedModel: decision.selectedModel,
      routingMode: decision.routingMode,
      fallbackProvider: fallback?.provider,
      fallbackModel: fallback?.model,
      fallbackChain: decision.fallbackChain,
      detectedCategory: decision.detectedCategory,
      timestamp: new Date().toISOString(),
    });
  }

  private handleConnectorHealthChecked(data: unknown): void {
    const payload = data as Record<string, unknown>;
    const provider = payload['provider'] as string | undefined;
    const status = payload['status'] as string | undefined;

    if (provider && status) {
      const isHealthy = status === 'HEALTHY';
      this.logger.debug(`handleConnectorHealthChecked: provider=${provider} status=${status}`);
      this.connectorHealthCache[provider] = isHealthy;
    }
  }

  private handleConnectorSynced(data: unknown): void {
    const payload = data as Record<string, unknown>;
    const runtime = payload['runtime'] as string | undefined;

    if (runtime) {
      this.logger.debug(`handleConnectorSynced: runtime=${runtime} marked healthy`);
      this.runtimeHealthCache[runtime] = true;
    }
    this.promptBuilder.invalidateCache();
  }

  private handleModelChanged(event: string): void {
    this.logger.log(`handleModelChanged: ${event} received — invalidating prompt cache`);
    this.promptBuilder.invalidateCache();
  }

  private handleMessageCompleted(data: unknown): void {
    const config = this.getRuntimeRoutingConfig();
    const payload = data as Record<string, unknown>;
    const providerRaw = payload['provider'];
    const latencyRaw = payload['latencyMs'];

    if (typeof providerRaw !== 'string' || typeof latencyRaw !== 'number' || latencyRaw <= 0) {
      return;
    }

    const provider = this.normalizeProviderName(providerRaw);
    const latencyMs = Math.round(latencyRaw);
    const prevLatency = this.providerLatencyCache[provider];
    const weight = config.latencyEwmaWeight;
    const nextLatency =
      typeof prevLatency === 'number'
        ? Math.round(prevLatency * weight + latencyMs * (1 - weight))
        : latencyMs;
    this.providerLatencyCache[provider] = nextLatency;

    const threshold = config.providerSlowThresholdMs;
    if (latencyMs >= threshold) {
      const nextStreak = (this.providerSlowStreakCache[provider] ?? 0) + 1;
      this.providerSlowStreakCache[provider] = nextStreak;

      if (nextStreak >= config.providerSlowStreak) {
        const openUntil = Date.now() + config.providerCircuitOpenMs;
        this.providerCircuitOpenUntilCache[provider] = openUntil;
        this.providerSlowStreakCache[provider] = 0;
        this.logger.warn(
          `handleMessageCompleted: opening latency circuit for ${provider} until ${new Date(openUntil).toISOString()}`,
        );
      }
    } else {
      this.providerSlowStreakCache[provider] = 0;
      const openUntil = this.providerCircuitOpenUntilCache[provider];
      if (typeof openUntil === 'number' && openUntil > Date.now()) {
        this.removeProviderCircuit(provider);
        this.logger.log(`handleMessageCompleted: closing latency circuit for ${provider}`);
      }
    }

    this.pruneExpiredProviderCircuits();
  }

  private pruneExpiredProviderCircuits(): void {
    const now = Date.now();
    this.providerCircuitOpenUntilCache = Object.fromEntries(
      Object.entries(this.providerCircuitOpenUntilCache).filter(([, openUntil]) => openUntil > now),
    ) as Record<string, number>;
  }

  private getActiveProviderCircuits(): Record<string, number> {
    this.pruneExpiredProviderCircuits();
    return { ...this.providerCircuitOpenUntilCache };
  }

  private normalizeProviderName(provider: string): string {
    const normalized = provider.trim();
    if (normalized.toLowerCase() === 'local-ollama') {
      return 'local-ollama';
    }
    return normalized.toUpperCase();
  }

  private removeProviderCircuit(provider: string): void {
    this.providerCircuitOpenUntilCache = Object.fromEntries(
      Object.entries(this.providerCircuitOpenUntilCache).filter(([name]) => name !== provider),
    ) as Record<string, number>;
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
