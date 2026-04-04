import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import type {
  UserLoginPayload,
  UserLogoutPayload,
  ConnectorCreatedPayload,
  ConnectorUpdatedPayload,
  ConnectorDeletedPayload,
  ConnectorSyncedPayload,
  ConnectorHealthCheckedPayload,
  RoutingDecisionMadePayload,
  MessageCompletedPayload,
  MemoryExtractedPayload,
} from "@claw/shared-types";
import { AuditsService } from "../services/audits.service";
import { UsageService } from "../services/usage.service";

@Injectable()
export class AuditEventManager implements OnModuleInit {
  private readonly logger = new Logger(AuditEventManager.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly auditsService: AuditsService,
    private readonly usageService: UsageService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.subscribeAll();
  }

  private async subscribeAll(): Promise<void> {
    const subscriptions: Array<[string, (data: unknown) => Promise<void>]> = [
      [EventPattern.USER_LOGIN, (d) => this.handleUserLogin(d as UserLoginPayload)],
      [EventPattern.USER_LOGOUT, (d) => this.handleUserLogout(d as UserLogoutPayload)],
      [EventPattern.CONNECTOR_CREATED, (d) => this.handleConnectorCreated(d as ConnectorCreatedPayload)],
      [EventPattern.CONNECTOR_UPDATED, (d) => this.handleConnectorUpdated(d as ConnectorUpdatedPayload)],
      [EventPattern.CONNECTOR_DELETED, (d) => this.handleConnectorDeleted(d as ConnectorDeletedPayload)],
      [EventPattern.CONNECTOR_SYNCED, (d) => this.handleConnectorSynced(d as ConnectorSyncedPayload)],
      [EventPattern.CONNECTOR_HEALTH_CHECKED, (d) => this.handleConnectorHealthChecked(d as ConnectorHealthCheckedPayload)],
      [EventPattern.ROUTING_DECISION_MADE, (d) => this.handleRoutingDecision(d as RoutingDecisionMadePayload)],
      [EventPattern.MESSAGE_COMPLETED, (d) => this.handleMessageCompleted(d as MessageCompletedPayload)],
      [EventPattern.MEMORY_EXTRACTED, (d) => this.handleMemoryExtracted(d as MemoryExtractedPayload)],
    ];

    for (const [pattern, handler] of subscriptions) {
      await this.rabbitMQService.subscribe(pattern, handler);
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  async handleEvent(eventPattern: string, payload: unknown): Promise<void> {
    switch (eventPattern) {
      case EventPattern.USER_LOGIN:
        await this.handleUserLogin(payload as UserLoginPayload);
        break;
      case EventPattern.USER_LOGOUT:
        await this.handleUserLogout(payload as UserLogoutPayload);
        break;
      case EventPattern.CONNECTOR_CREATED:
        await this.handleConnectorCreated(payload as ConnectorCreatedPayload);
        break;
      case EventPattern.CONNECTOR_UPDATED:
        await this.handleConnectorUpdated(payload as ConnectorUpdatedPayload);
        break;
      case EventPattern.CONNECTOR_DELETED:
        await this.handleConnectorDeleted(payload as ConnectorDeletedPayload);
        break;
      case EventPattern.CONNECTOR_SYNCED:
        await this.handleConnectorSynced(payload as ConnectorSyncedPayload);
        break;
      case EventPattern.CONNECTOR_HEALTH_CHECKED:
        await this.handleConnectorHealthChecked(payload as ConnectorHealthCheckedPayload);
        break;
      case EventPattern.ROUTING_DECISION_MADE:
        await this.handleRoutingDecision(payload as RoutingDecisionMadePayload);
        break;
      case EventPattern.MESSAGE_COMPLETED:
        await this.handleMessageCompleted(payload as MessageCompletedPayload);
        break;
      case EventPattern.MEMORY_EXTRACTED:
        await this.handleMemoryExtracted(payload as MemoryExtractedPayload);
        break;
      default:
        this.logger.warn(`Unhandled event pattern: ${eventPattern}`);
    }
  }

  async handleUserLogin(payload: UserLoginPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: "LOGIN",
      entityType: "user",
      entityId: payload.userId,
      severity: "LOW",
      details: { email: payload.email, ipAddress: payload.ipAddress, userAgent: payload.userAgent },
      ipAddress: payload.ipAddress,
    });
  }

  async handleUserLogout(payload: UserLogoutPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: "LOGOUT",
      entityType: "user",
      entityId: payload.userId,
      severity: "LOW",
      details: {},
    });
  }

  async handleConnectorCreated(payload: ConnectorCreatedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: "CREATE",
      entityType: "connector",
      entityId: payload.connectorId,
      severity: "MEDIUM",
      details: { provider: payload.provider, name: payload.name },
    });
  }

  async handleConnectorUpdated(payload: ConnectorUpdatedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: "system",
      action: "UPDATE",
      entityType: "connector",
      entityId: payload.connectorId,
      severity: "MEDIUM",
      details: { provider: payload.provider, changes: payload.changes },
    });
  }

  async handleConnectorDeleted(payload: ConnectorDeletedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: "system",
      action: "DELETE",
      entityType: "connector",
      entityId: payload.connectorId,
      severity: "HIGH",
      details: { provider: payload.provider },
    });
  }

  async handleConnectorSynced(payload: ConnectorSyncedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: "system",
      action: "CONNECTOR_SYNC",
      entityType: "connector",
      entityId: payload.connectorId,
      severity: "LOW",
      details: { provider: payload.provider, modelsDiscovered: payload.modelsDiscovered },
    });
  }

  async handleConnectorHealthChecked(payload: ConnectorHealthCheckedPayload): Promise<void> {
    const severity = payload.status === "DOWN" ? "HIGH" : "LOW";
    await this.auditsService.createAuditLog({
      userId: "system",
      action: "ACCESS",
      entityType: "connector",
      entityId: payload.connectorId,
      severity,
      details: { provider: payload.provider, status: payload.status, latencyMs: payload.latencyMs },
    });
  }

  async handleRoutingDecision(payload: RoutingDecisionMadePayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: "system",
      action: "ROUTING_DECISION",
      entityType: "message",
      entityId: payload.messageId,
      severity: "LOW",
      details: {
        threadId: payload.threadId,
        routingMode: payload.routingMode,
        selectedConnectorId: payload.selectedConnectorId,
        selectedModelId: payload.selectedModelId,
        reason: payload.reason,
        candidateCount: payload.candidateCount,
      },
    });
  }

  async handleMessageCompleted(payload: MessageCompletedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: "system",
      action: "ACCESS",
      entityType: "message",
      entityId: payload.messageId,
      severity: "LOW",
      details: {
        threadId: payload.threadId,
        connectorId: payload.connectorId,
        modelId: payload.modelId,
        tokensUsed: payload.tokensUsed,
        latencyMs: payload.latencyMs,
      },
    });

    await this.usageService.createUsageEntry({
      userId: "system",
      resourceType: "llm_tokens",
      action: "message.completed",
      quantity: payload.tokensUsed,
      unit: "tokens",
      metadata: {
        messageId: payload.messageId,
        threadId: payload.threadId,
        connectorId: payload.connectorId,
        model: payload.modelId,
        provider: payload.connectorId,
        latencyMs: payload.latencyMs,
      },
    });
  }

  async handleMemoryExtracted(payload: MemoryExtractedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: "CREATE",
      entityType: "memory",
      entityId: payload.memoryId,
      severity: "LOW",
      details: {
        threadId: payload.threadId,
        type: payload.type,
        contentPreview: payload.content.slice(0, 100),
      },
    });
  }
}
