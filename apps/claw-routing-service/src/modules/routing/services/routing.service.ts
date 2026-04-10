import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService, StructuredLogger } from "@claw/shared-rabbitmq";
import { EventPattern, LogLevel } from "@claw/shared-types";
import { type Prisma, type RoutingMode } from "../../../generated/prisma";
import { EntityNotFoundException } from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { RoutingPoliciesRepository } from "../repositories/routing-policies.repository";
import { RoutingDecisionsRepository } from "../repositories/routing-decisions.repository";
import { RoutingManager } from "../managers/routing.manager";
import { type CreatePolicyDto } from "../dto/create-policy.dto";
import { type UpdatePolicyDto } from "../dto/update-policy.dto";
import { type ListPoliciesQueryDto } from "../dto/list-policies-query.dto";
import { type EvaluateRouteDto } from "../dto/evaluate-route.dto";
import {
  type RoutingContext,
  type RoutingDecision,
  type RoutingDecisionResult,
  type RoutingPolicy,
} from "../types/routing.types";

@Injectable()
export class RoutingService implements OnModuleInit {
  private readonly logger = new Logger(RoutingService.name);
  private readonly structuredLogger: StructuredLogger;
  private connectorHealthCache: Record<string, boolean> = {};
  private runtimeHealthCache: Record<string, boolean> = {};

  constructor(
    private readonly policiesRepository: RoutingPoliciesRepository,
    private readonly decisionsRepository: RoutingDecisionsRepository,
    private readonly routingManager: RoutingManager,
    private readonly rabbitMQService: RabbitMQService,
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
    this.logger.log(`createPolicy: creating policy "${dto.name}" mode=${dto.routingMode} priority=${String(dto.priority)}`);
    return this.policiesRepository.create({
      name: dto.name,
      routingMode: dto.routingMode,
      priority: dto.priority,
      config: dto.config as Prisma.InputJsonValue,
    });
  }

  async getPolicies(
    query: ListPoliciesQueryDto,
  ): Promise<PaginatedResult<RoutingPolicy>> {
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
      throw new EntityNotFoundException("RoutingPolicy", id);
    }
    return policy;
  }

  async updatePolicy(id: string, dto: UpdatePolicyDto): Promise<RoutingPolicy> {
    const policy = await this.policiesRepository.findById(id);
    if (!policy) {
      throw new EntityNotFoundException("RoutingPolicy", id);
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
      throw new EntityNotFoundException("RoutingPolicy", id);
    }
    return this.policiesRepository.delete(id);
  }

  async evaluateRoute(dto: EvaluateRouteDto): Promise<RoutingDecisionResult> {
    this.logger.log(`evaluateRoute: evaluating route for thread ${dto.threadId ?? 'none'} mode=${dto.routingMode ?? 'AUTO'}`);
    const context: RoutingContext = {
      message: dto.messageContent,
      threadId: dto.threadId,
      userMode: dto.routingMode as RoutingMode | undefined,
      forcedModel: dto.forcedModel,
      forcedProvider: dto.forcedProvider,
      connectorHealth: { ...this.connectorHealthCache },
      runtimeHealth: { ...this.runtimeHealthCache },
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

  private async subscribeToEvents(): Promise<void> {
    await this.rabbitMQService.subscribe(
      EventPattern.MESSAGE_CREATED,
      async (data: unknown) => {
        await this.handleMessageCreated(data);
      },
    );

    await this.rabbitMQService.subscribe(
      EventPattern.CONNECTOR_HEALTH_CHECKED,
      async (data: unknown) => {
        this.handleConnectorHealthChecked(data);
      },
    );

    await this.rabbitMQService.subscribe(
      EventPattern.CONNECTOR_SYNCED,
      async (data: unknown) => {
        this.handleConnectorSynced(data);
      },
    );

    this.logger.log("Subscribed to routing events");
  }

  private async handleMessageCreated(data: unknown): Promise<void> {
    const payload = data as Record<string, unknown>;
    const parsed = this.parseMessageCreatedPayload(payload);
    if (!parsed) {
      return;
    }

    const { messageId, threadId, content, routingMode, forcedProvider, forcedModel } = parsed;

    this.logMessageCreatedConsumed(messageId, threadId);

    const context = this.buildRoutingContext(content, threadId, routingMode, forcedProvider, forcedModel);
    const decision = await this.routingManager.evaluateRoute(context);

    await this.storeAndPublishDecision(messageId, threadId, decision);
  }

  private parseMessageCreatedPayload(
    payload: Record<string, unknown>,
  ): { messageId: string | undefined; threadId: string; content: string; routingMode: RoutingMode | undefined; forcedProvider: string | undefined; forcedModel: string | undefined } | null {
    const threadId = payload["threadId"] as string | undefined;
    const content = payload["content"] as string | undefined;

    if (!threadId || !content) {
      this.logger.warn("Received message.created with missing threadId or content");
      return null;
    }

    return {
      messageId: payload["messageId"] as string | undefined,
      threadId,
      content,
      routingMode: payload["routingMode"] as RoutingMode | undefined,
      forcedProvider: payload["forcedProvider"] as string | undefined,
      forcedModel: payload["forcedModel"] as string | undefined,
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
    return {
      message: content,
      threadId,
      userMode: routingMode,
      forcedProvider,
      forcedModel,
      connectorHealth: { ...this.connectorHealthCache },
      runtimeHealth: { ...this.runtimeHealthCache },
    };
  }

  private async storeAndPublishDecision(
    messageId: string | undefined,
    threadId: string,
    decision: RoutingDecisionResult,
  ): Promise<void> {
    const fallback = decision.fallbackChain[0];

    await this.decisionsRepository.create({
      messageId,
      threadId,
      selectedProvider: decision.selectedProvider,
      selectedModel: decision.selectedModel,
      routingMode: decision.routingMode,
      confidence: decision.confidence,
      reasonTags: decision.reasonTags,
      privacyClass: decision.privacyClass,
      costClass: decision.costClass,
      fallbackProvider: fallback?.provider,
      fallbackModel: fallback?.model,
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
      timestamp: new Date().toISOString(),
    });
  }

  private handleConnectorHealthChecked(data: unknown): void {
    const payload = data as Record<string, unknown>;
    const provider = payload["provider"] as string | undefined;
    const status = payload["status"] as string | undefined;

    if (provider && status) {
      const isHealthy = status === "HEALTHY";
      this.logger.debug(`handleConnectorHealthChecked: provider=${provider} status=${status}`);
      this.connectorHealthCache[provider] = isHealthy;
    }
  }

  private handleConnectorSynced(data: unknown): void {
    const payload = data as Record<string, unknown>;
    const runtime = payload["runtime"] as string | undefined;

    if (runtime) {
      this.logger.debug(`handleConnectorSynced: runtime=${runtime} marked healthy`);
      this.runtimeHealthCache[runtime] = true;
    }
  }
}
