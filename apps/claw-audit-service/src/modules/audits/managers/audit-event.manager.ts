import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  type AgentDevicePairedPayload,
  type AgentDeviceRevokedPayload,
  type AgentPolicyViolatedPayload,
  type AgentSessionConnectedPayload,
  type AgentSessionDisconnectedPayload,
  type AgentTokenReuseDetectedPayload,
  type AgentTokenRotatedPayload,
  type CapabilityApprovedPayload,
  type CapabilityAutoApprovedPayload,
  type CapabilityCancelledPayload,
  type CapabilityDeniedPayload,
  type CapabilityExecutedPayload,
  type CapabilityExecutingPayload,
  type CapabilityExpiredPayload,
  type CapabilityFailedPayload,
  type CapabilityPolicyMatchedPayload,
  type CapabilityProposedPayload,
  type CapabilityRejectedPayload,
  type CapabilityRolledBackPayload,
  type ConnectorCreatedPayload,
  type ConnectorDeletedPayload,
  type ConnectorHealthCheckedPayload,
  type ConnectorSyncedPayload,
  type ConnectorUpdatedPayload,
  EventPattern,
  type MemoryExtractedPayload,
  type MessageCompletedPayload,
  type RoutingDecisionMadePayload,
  type UserLoginPayload,
  type UserLogoutPayload,
} from '@claw/shared-types';
import { AuditsService } from '../services/audits.service';
import { UsageService } from '../services/usage.service';

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
    const subscriptions = [
      ...this.coreEventSubscriptions(),
      ...this.agentLifecycleEventSubscriptions(),
      ...this.capabilityEventSubscriptions(),
    ];
    for (const [pattern, handler] of subscriptions) {
      await this.rabbitMQService.subscribe(pattern, handler);
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  // === Desktop-agent lifecycle events (V2 Stream 01c — added 2026-05-24) ===
  // These 7 patterns were published by claw-agent-service since Phase A
  // but had no audit consumer until V2 Stream 01. Without them, session/
  // device/token/policy actions never reached the audit Mongo collection
  // even though they were emitted on the bus.
  private agentLifecycleEventSubscriptions(): Array<[string, (data: unknown) => Promise<void>]> {
    return [
      [
        EventPattern.AGENT_SESSION_CONNECTED,
        (d) => this.handleAgentSessionConnected(d as AgentSessionConnectedPayload),
      ],
      [
        EventPattern.AGENT_SESSION_DISCONNECTED,
        (d) => this.handleAgentSessionDisconnected(d as AgentSessionDisconnectedPayload),
      ],
      [
        EventPattern.AGENT_DEVICE_PAIRED,
        (d) => this.handleAgentDevicePaired(d as AgentDevicePairedPayload),
      ],
      [
        EventPattern.AGENT_DEVICE_REVOKED,
        (d) => this.handleAgentDeviceRevoked(d as AgentDeviceRevokedPayload),
      ],
      [
        EventPattern.AGENT_TOKEN_ROTATED,
        (d) => this.handleAgentTokenRotated(d as AgentTokenRotatedPayload),
      ],
      [
        EventPattern.AGENT_TOKEN_REUSE_DETECTED,
        (d) => this.handleAgentTokenReuseDetected(d as AgentTokenReuseDetectedPayload),
      ],
      [
        EventPattern.AGENT_POLICY_VIOLATED,
        (d) => this.handleAgentPolicyViolated(d as AgentPolicyViolatedPayload),
      ],
    ];
  }

  private coreEventSubscriptions(): Array<[string, (data: unknown) => Promise<void>]> {
    return [
      [EventPattern.USER_LOGIN, (d) => this.handleUserLogin(d as UserLoginPayload)],
      [EventPattern.USER_LOGOUT, (d) => this.handleUserLogout(d as UserLogoutPayload)],
      [
        EventPattern.CONNECTOR_CREATED,
        (d) => this.handleConnectorCreated(d as ConnectorCreatedPayload),
      ],
      [
        EventPattern.CONNECTOR_UPDATED,
        (d) => this.handleConnectorUpdated(d as ConnectorUpdatedPayload),
      ],
      [
        EventPattern.CONNECTOR_DELETED,
        (d) => this.handleConnectorDeleted(d as ConnectorDeletedPayload),
      ],
      [
        EventPattern.CONNECTOR_SYNCED,
        (d) => this.handleConnectorSynced(d as ConnectorSyncedPayload),
      ],
      [
        EventPattern.CONNECTOR_HEALTH_CHECKED,
        (d) => this.handleConnectorHealthChecked(d as ConnectorHealthCheckedPayload),
      ],
      [
        EventPattern.ROUTING_DECISION_MADE,
        (d) => this.handleRoutingDecision(d as RoutingDecisionMadePayload),
      ],
      [
        EventPattern.MESSAGE_COMPLETED,
        (d) => this.handleMessageCompleted(d as MessageCompletedPayload),
      ],
      [
        EventPattern.MEMORY_EXTRACTED,
        (d) => this.handleMemoryExtracted(d as MemoryExtractedPayload),
      ],
    ];
  }

  // === Desktop-agent capability framework (Stream 10) ===
  private capabilityEventSubscriptions(): Array<[string, (data: unknown) => Promise<void>]> {
    return [
      [
        EventPattern.AGENT_CAPABILITY_PROPOSED,
        (d) => this.handleCapabilityProposed(d as CapabilityProposedPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_POLICY_MATCHED,
        (d) => this.handleCapabilityPolicyMatched(d as CapabilityPolicyMatchedPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_AUTO_APPROVED,
        (d) => this.handleCapabilityAutoApproved(d as CapabilityAutoApprovedPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_APPROVED,
        (d) => this.handleCapabilityApproved(d as CapabilityApprovedPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_REJECTED,
        (d) => this.handleCapabilityRejected(d as CapabilityRejectedPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_EXECUTING,
        (d) => this.handleCapabilityExecuting(d as CapabilityExecutingPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_EXECUTED,
        (d) => this.handleCapabilityExecuted(d as CapabilityExecutedPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_FAILED,
        (d) => this.handleCapabilityFailed(d as CapabilityFailedPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_CANCELLED,
        (d) => this.handleCapabilityCancelled(d as CapabilityCancelledPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_EXPIRED,
        (d) => this.handleCapabilityExpired(d as CapabilityExpiredPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_ROLLED_BACK,
        (d) => this.handleCapabilityRolledBack(d as CapabilityRolledBackPayload),
      ],
      [
        EventPattern.AGENT_CAPABILITY_DENIED,
        (d) => this.handleCapabilityDenied(d as CapabilityDeniedPayload),
      ],
    ];
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
    this.logger.debug(`handleUserLogin: recording login for user ${payload.userId}`);
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'LOGIN',
      entityType: 'user',
      entityId: payload.userId,
      severity: 'LOW',
      details: { email: payload.email, ipAddress: payload.ipAddress, userAgent: payload.userAgent },
      ipAddress: payload.ipAddress,
    });
  }

  async handleUserLogout(payload: UserLogoutPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: payload.userId,
      severity: 'LOW',
      details: {},
    });
  }

  async handleConnectorCreated(payload: ConnectorCreatedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CREATE',
      entityType: 'connector',
      entityId: payload.connectorId,
      severity: 'MEDIUM',
      details: { provider: payload.provider, name: payload.name },
    });
  }

  async handleConnectorUpdated(payload: ConnectorUpdatedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: 'system',
      action: 'UPDATE',
      entityType: 'connector',
      entityId: payload.connectorId,
      severity: 'MEDIUM',
      details: { provider: payload.provider, changes: payload.changes },
    });
  }

  async handleConnectorDeleted(payload: ConnectorDeletedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: 'system',
      action: 'DELETE',
      entityType: 'connector',
      entityId: payload.connectorId,
      severity: 'HIGH',
      details: { provider: payload.provider },
    });
  }

  async handleConnectorSynced(payload: ConnectorSyncedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: 'system',
      action: 'CONNECTOR_SYNC',
      entityType: 'connector',
      entityId: payload.connectorId,
      severity: 'LOW',
      details: { provider: payload.provider, modelsDiscovered: payload.modelsDiscovered },
    });
  }

  async handleConnectorHealthChecked(payload: ConnectorHealthCheckedPayload): Promise<void> {
    const severity = payload.status === 'DOWN' ? 'HIGH' : 'LOW';
    await this.auditsService.createAuditLog({
      userId: 'system',
      action: 'ACCESS',
      entityType: 'connector',
      entityId: payload.connectorId,
      severity,
      details: { provider: payload.provider, status: payload.status, latencyMs: payload.latencyMs },
    });
  }

  async handleRoutingDecision(payload: RoutingDecisionMadePayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: 'system',
      action: 'ROUTING_DECISION',
      entityType: 'message',
      entityId: payload.messageId,
      severity: 'LOW',
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
    this.logger.debug(
      `handleMessageCompleted: recording for message ${payload.messageId} provider=${payload.provider ?? 'unknown'}`,
    );
    await this.auditsService.createAuditLog({
      userId: 'system',
      action: 'ACCESS',
      entityType: 'message',
      entityId: payload.messageId,
      severity: 'LOW',
      details: {
        threadId: payload.threadId,
        provider: payload.provider,
        model: payload.model,
        inputTokens: payload.inputTokens,
        outputTokens: payload.outputTokens,
        latencyMs: payload.latencyMs,
      },
    });

    const totalTokens = (payload.inputTokens ?? 0) + (payload.outputTokens ?? 0);

    await this.usageService.createUsageEntry({
      userId: 'system',
      resourceType: 'llm_tokens',
      action: 'message.completed',
      quantity: totalTokens,
      unit: 'tokens',
      metadata: {
        messageId: payload.messageId,
        threadId: payload.threadId,
        provider: payload.provider,
        model: payload.model,
        latencyMs: payload.latencyMs,
      },
    });
  }

  async handleMemoryExtracted(payload: MemoryExtractedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CREATE',
      entityType: 'memory',
      entityId: payload.memoryId,
      severity: 'LOW',
      details: {
        threadId: payload.threadId,
        type: payload.type,
        contentPreview: payload.content.slice(0, 100),
      },
    });
  }

  // ==================== Capability framework (Stream 10) ====================

  async handleCapabilityProposed(payload: CapabilityProposedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_PROPOSED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'LOW',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        capabilityOperation: payload.capabilityOperation,
        riskScore: payload.riskScore,
        riskLabel: payload.riskLabel,
        blastRadius: payload.blastRadius,
        reversibility: payload.reversibility,
        recipeRunId: payload.recipeRunId,
      },
    });
  }

  async handleCapabilityPolicyMatched(payload: CapabilityPolicyMatchedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_POLICY_MATCHED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'LOW',
      details: {
        matchedPolicyId: payload.matchedPolicyId,
        matchedPolicyName: payload.matchedPolicyName,
        matchedPolicyKind: payload.matchedPolicyKind,
        riskScore: payload.riskScore,
      },
    });
  }

  async handleCapabilityAutoApproved(payload: CapabilityAutoApprovedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_AUTO_APPROVED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'LOW',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        matchedPolicyName: payload.matchedPolicyName,
      },
    });
  }

  async handleCapabilityApproved(payload: CapabilityApprovedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_APPROVED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'MEDIUM',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        approverUserId: payload.approverUserId,
      },
    });
  }

  async handleCapabilityRejected(payload: CapabilityRejectedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_REJECTED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'MEDIUM',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        reviewerUserId: payload.reviewerUserId,
        reason: payload.reason,
      },
    });
  }

  async handleCapabilityExecuting(payload: CapabilityExecutingPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_EXECUTING',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'LOW',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        capabilityOperation: payload.capabilityOperation,
      },
    });
  }

  async handleCapabilityExecuted(payload: CapabilityExecutedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_EXECUTED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'LOW',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        capabilityOperation: payload.capabilityOperation,
        durationMs: payload.durationMs,
        resultSummary: payload.resultSummary,
      },
    });
  }

  async handleCapabilityFailed(payload: CapabilityFailedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_FAILED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'HIGH',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        capabilityOperation: payload.capabilityOperation,
        errorMessage: payload.errorMessage,
      },
    });
  }

  async handleCapabilityCancelled(payload: CapabilityCancelledPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_CANCELLED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'LOW',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        cancelledByUserId: payload.cancelledByUserId,
      },
    });
  }

  async handleCapabilityExpired(payload: CapabilityExpiredPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId ?? 'system',
      action: 'CAPABILITY_EXPIRED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'LOW',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
      },
    });
  }

  async handleCapabilityRolledBack(payload: CapabilityRolledBackPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_ROLLED_BACK',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: payload.partial ? 'MEDIUM' : 'LOW',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        partial: payload.partial,
        rollbackError: payload.rollbackError,
      },
    });
  }

  async handleCapabilityDenied(payload: CapabilityDeniedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'CAPABILITY_DENIED',
      entityType: 'capability_invocation',
      entityId: payload.invocationId,
      severity: 'HIGH',
      details: {
        deviceId: payload.deviceId,
        capabilityClass: payload.capabilityClass,
        capabilityOperation: payload.capabilityOperation,
        matchedPolicyId: payload.matchedPolicyId,
        matchedPolicyName: payload.matchedPolicyName,
        reason: payload.reason,
      },
    });
  }

  // ==================== Agent lifecycle (V2 Stream 01c) ====================

  async handleAgentSessionConnected(payload: AgentSessionConnectedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'AGENT_SESSION_CONNECTED',
      entityType: 'agent_session',
      entityId: payload.sessionId,
      severity: 'LOW',
      details: {
        deviceId: payload.deviceId,
      },
    });
  }

  async handleAgentSessionDisconnected(payload: AgentSessionDisconnectedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'AGENT_SESSION_DISCONNECTED',
      entityType: 'agent_session',
      entityId: payload.sessionId,
      severity: 'LOW',
      details: {},
    });
  }

  async handleAgentDevicePaired(payload: AgentDevicePairedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'AGENT_DEVICE_PAIRED',
      entityType: 'agent_device',
      entityId: payload.deviceId,
      severity: 'MEDIUM',
      details: {
        hostname: payload.hostname,
        os: payload.os,
        platform: payload.platform,
        agentVersion: payload.agentVersion,
        scopes: payload.scopes,
      },
    });
  }

  async handleAgentDeviceRevoked(payload: AgentDeviceRevokedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'AGENT_DEVICE_REVOKED',
      entityType: 'agent_device',
      entityId: payload.deviceId,
      // Revocation triggered by reuse detection is HIGH; user-initiated revoke is MEDIUM.
      severity: payload.reason === 'refresh_reuse_detected' ? 'HIGH' : 'MEDIUM',
      details: {
        reason: payload.reason,
        revokedByUserId: payload.revokedByUserId,
      },
    });
  }

  async handleAgentTokenRotated(payload: AgentTokenRotatedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'AGENT_TOKEN_ROTATED',
      entityType: 'agent_device',
      entityId: payload.deviceId,
      severity: 'LOW',
      details: {
        oldJti: payload.oldJti,
        newJti: payload.newJti,
        ipAddress: payload.ipAddress,
      },
    });
  }

  async handleAgentTokenReuseDetected(payload: AgentTokenReuseDetectedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'AGENT_TOKEN_REUSE_DETECTED',
      entityType: 'agent_device',
      entityId: payload.deviceId,
      severity: 'CRITICAL',
      details: {
        presentedJti: payload.presentedJti,
        ipAddress: payload.ipAddress,
      },
    });
  }

  async handleAgentPolicyViolated(payload: AgentPolicyViolatedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.userId,
      action: 'AGENT_POLICY_VIOLATED',
      entityType: 'agent_command',
      entityId: payload.commandId,
      severity: 'HIGH',
      details: {
        sessionId: payload.sessionId,
        matchedPolicyId: payload.matchedPolicyId,
        matchedPolicyName: payload.matchedPolicyName,
        riskScore: payload.riskScore,
        riskLabel: payload.riskLabel,
      },
    });
  }
}
