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
  type FileArchiveExpandedPayload,
  type FileChunkedPayload,
  type FileDeletedPayload,
  type FileDownloadedPayload,
  type FileExtractionFailedPayload,
  type FileFailedPayload,
  type FileOcrCompletedPayload,
  type FileOcrFailedPayload,
  type FileOcrStartedPayload,
  type FileRetentionExpiredPayload,
  type FileUploadCompletedPayload,
  type FileUploadedPayload,
  type FileUploadStartedPayload,
  type MemoryExtractedPayload,
  type MessageCompletedPayload,
  type RoutingDecisionMadePayload,
  type UserActivatedPayload,
  type UserLoginPayload,
  type UserLogoutPayload,
  type UserTemporaryPasswordIssuedPayload,
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
      ...this.fileEventSubscriptions(),
    ];
    for (const [pattern, handler] of subscriptions) {
      await this.rabbitMQService.subscribe(pattern, handler);
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  // === File ingestion events (Slice B — added 2026-05-31) ===
  // Subscribes to file-service lifecycle events so that uploads, chunking
  // completion, and failures are persisted to the audit MongoDB collection.
  // Slice D backend 3 (2026-05-31) added 8 new lifecycle events:
  //   FILE_UPLOAD_STARTED / FILE_UPLOAD_COMPLETED (canonical, with FILE_UPLOADED kept as deprecated alias)
  //   FILE_EXTRACTION_FAILED (more specific than FILE_FAILED)
  //   FILE_DOWNLOADED (browser + internal API paths)
  //   FILE_DELETED (canonical delete; emitted alongside FILE_RETENTION_EXPIRED)
  //   FILE_OCR_STARTED / FILE_OCR_COMPLETED / FILE_OCR_FAILED
  private fileEventSubscriptions(): Array<[string, (data: unknown) => Promise<void>]> {
    return [
      [EventPattern.FILE_UPLOADED, (d) => this.handleFileUploaded(d as FileUploadedPayload)],
      [EventPattern.FILE_CHUNKED, (d) => this.handleFileChunked(d as FileChunkedPayload)],
      [EventPattern.FILE_FAILED, (d) => this.handleFileFailed(d as FileFailedPayload)],
      [
        EventPattern.FILE_RETENTION_EXPIRED,
        (d) => this.handleFileRetentionExpired(d as FileRetentionExpiredPayload),
      ],
      [
        EventPattern.FILE_ARCHIVE_EXPANDED,
        (d) => this.handleFileArchiveExpanded(d as FileArchiveExpandedPayload),
      ],
      [
        EventPattern.FILE_UPLOAD_STARTED,
        (d) => this.handleFileUploadStarted(d as FileUploadStartedPayload),
      ],
      [
        EventPattern.FILE_UPLOAD_COMPLETED,
        (d) => this.handleFileUploadCompleted(d as FileUploadCompletedPayload),
      ],
      [
        EventPattern.FILE_EXTRACTION_FAILED,
        (d) => this.handleFileExtractionFailed(d as FileExtractionFailedPayload),
      ],
      [EventPattern.FILE_DOWNLOADED, (d) => this.handleFileDownloaded(d as FileDownloadedPayload)],
      [EventPattern.FILE_DELETED, (d) => this.handleFileDeleted(d as FileDeletedPayload)],
      [EventPattern.FILE_OCR_STARTED, (d) => this.handleFileOcrStarted(d as FileOcrStartedPayload)],
      [
        EventPattern.FILE_OCR_COMPLETED,
        (d) => this.handleFileOcrCompleted(d as FileOcrCompletedPayload),
      ],
      [EventPattern.FILE_OCR_FAILED, (d) => this.handleFileOcrFailed(d as FileOcrFailedPayload)],
    ];
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
        EventPattern.USER_TEMPORARY_PASSWORD_ISSUED,
        (d) => this.handleUserTemporaryPasswordIssued(d as UserTemporaryPasswordIssuedPayload),
      ],
      [EventPattern.USER_ACTIVATED, (d) => this.handleUserActivated(d as UserActivatedPayload)],
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
      case EventPattern.USER_TEMPORARY_PASSWORD_ISSUED:
        await this.handleUserTemporaryPasswordIssued(payload as UserTemporaryPasswordIssuedPayload);
        break;
      case EventPattern.USER_ACTIVATED:
        await this.handleUserActivated(payload as UserActivatedPayload);
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

  private async handleUserTemporaryPasswordIssued(
    payload: UserTemporaryPasswordIssuedPayload,
  ): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.issuedBy,
      action: 'ISSUE_TEMPORARY_PASSWORD',
      entityType: 'user',
      entityId: payload.userId,
      severity: 'HIGH',
      details: { targetUserId: payload.userId },
    });
  }

  /**
   * An administrator cleared an account's email wall by hand.
   *
   * HIGH severity, like the temporary-password action and unlike an ordinary
   * status change: it asserts that somebody vouched for an address the product
   * never confirmed, and it burns the verification token in the process. If that
   * turns out to have been wrong, this row is where the investigation starts.
   */
  private async handleUserActivated(payload: UserActivatedPayload): Promise<void> {
    await this.auditsService.createAuditLog({
      userId: payload.activatedBy,
      action: 'ACTIVATE_PENDING_USER',
      entityType: 'user',
      entityId: payload.userId,
      severity: 'HIGH',
      details: { targetUserId: payload.userId, previousStatus: payload.previousStatus },
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
    const context = payload.tokenContext ?? 'chat';

    await this.usageService.createUsageEntry({
      userId: payload.userId ?? 'system',
      resourceType: 'llm_tokens',
      action: 'message.completed',
      quantity: totalTokens,
      unit: 'tokens',
      context,
      estimated: payload.tokenEstimated,
      metadata: {
        messageId: payload.messageId,
        threadId: payload.threadId,
        provider: payload.provider,
        model: payload.model,
        latencyMs: payload.latencyMs,
        context,
        estimated: payload.tokenEstimated,
        tokenSource: payload.tokenSource,
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

  // ==================== File ingestion (Slice B) ====================

  async handleFileUploaded(payload: FileUploadedPayload): Promise<void> {
    this.logger.debug(
      `handleFileUploaded: recording upload fileId=${payload.fileId} userId=${payload.userId}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.uploaded',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'LOW',
        details: {
          filename: payload.fileName,
          sizeBytes: payload.sizeBytes,
          mimeType: payload.mimeType,
          source: 'upload',
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileUploaded: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async handleFileChunked(payload: FileChunkedPayload): Promise<void> {
    this.logger.debug(
      `handleFileChunked: recording chunk completion fileId=${payload.fileId} chunkCount=${String(payload.chunkCount)}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: 'system',
        action: 'file.chunked',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'LOW',
        details: {
          chunkCount: payload.chunkCount,
          status: payload.status,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileChunked: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async handleFileFailed(payload: FileFailedPayload): Promise<void> {
    this.logger.debug(
      `handleFileFailed: recording failure fileId=${payload.fileId} stage=${payload.failureStage}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.failed',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'ERROR',
        details: {
          filename: payload.filename,
          errorMessage: payload.errorMessage,
          failureStage: payload.failureStage,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileFailed: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // Slice C backend 2 — ZIP archive expansion.
  // Persists a `file.archive_expanded` audit row when an archive is fully
  // onboarded (or partially onboarded, if some entries were rejected by the
  // per-entry security pipeline). Severity is LOW because the action is a
  // routine ingestion outcome — security rejections of unsafe entries are
  // surfaced via their own `file.failed` events.
  async handleFileArchiveExpanded(payload: FileArchiveExpandedPayload): Promise<void> {
    this.logger.debug(
      `handleFileArchiveExpanded: parentFileId=${payload.parentFileId} children=${String(payload.childFileCount)}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.archive_expanded',
        entityType: 'file',
        entityId: payload.parentFileId,
        severity: 'LOW',
        details: {
          parentFilename: payload.parentFilename,
          childFileCount: payload.childFileCount,
          totalExtractedBytes: payload.totalExtractedBytes,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileArchiveExpanded: failed parentFileId=${payload.parentFileId} — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // Slice C foundation 3 — retention sweeper reaped a file. Recorded as a
  // LOW-severity audit so the per-user "what happened to my old uploads?"
  // audit trail stays intact. DO NOT rethrow on failure — the sweeper has
  // already deleted disk + DB; rethrowing here would only DLQ the message.
  async handleFileRetentionExpired(payload: FileRetentionExpiredPayload): Promise<void> {
    this.logger.debug(
      `handleFileRetentionExpired: recording expiry fileId=${payload.fileId} userId=${payload.userId}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.retention_expired',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'LOW',
        details: {
          filename: payload.filename,
          retentionExpiresAt: payload.retentionExpiresAt,
          sizeBytes: payload.sizeBytes,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileRetentionExpired: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
    }
  }

  // ==================== Slice D backend 3 — file lifecycle + OCR ====================
  // Eight new handlers covering the canonical lifecycle/OCR events. None of
  // these rethrow — file-service has already done the work, and re-failing in
  // audit would DLQ the message without any operational benefit.

  async handleFileUploadStarted(payload: FileUploadStartedPayload): Promise<void> {
    this.logger.debug(
      `handleFileUploadStarted: userId=${payload.userId} filename="${payload.filename}" mimeType=${payload.mimeType}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.upload_started',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'LOW',
        details: {
          filename: payload.filename,
          mimeType: payload.mimeType,
          sizeBytes: payload.sizeBytes,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileUploadStarted: failed userId=${payload.userId} — ${(error as Error).message}`,
      );
    }
  }

  async handleFileUploadCompleted(payload: FileUploadCompletedPayload): Promise<void> {
    this.logger.debug(
      `handleFileUploadCompleted: fileId=${payload.fileId} userId=${payload.userId}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.upload_completed',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'LOW',
        details: {
          filename: payload.fileName,
          mimeType: payload.mimeType,
          sizeBytes: payload.sizeBytes,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileUploadCompleted: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
    }
  }

  async handleFileExtractionFailed(payload: FileExtractionFailedPayload): Promise<void> {
    this.logger.debug(
      `handleFileExtractionFailed: fileId=${payload.fileId} stage=${payload.failureStage}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.extraction_failed',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'ERROR',
        details: {
          filename: payload.filename,
          errorMessage: payload.errorMessage,
          failureStage: payload.failureStage,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileExtractionFailed: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
    }
  }

  async handleFileDownloaded(payload: FileDownloadedPayload): Promise<void> {
    this.logger.debug(
      `handleFileDownloaded: fileId=${payload.fileId} downloadedBy=${payload.downloadedBy} method=${payload.downloadMethod}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.downloaded',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'LOW',
        details: {
          downloadedBy: payload.downloadedBy,
          downloadMethod: payload.downloadMethod,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileDownloaded: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
    }
  }

  async handleFileDeleted(payload: FileDeletedPayload): Promise<void> {
    this.logger.debug(
      `handleFileDeleted: fileId=${payload.fileId} reason=${payload.reason} deletedBy=${payload.deletedBy}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.deleted',
        entityType: 'file',
        entityId: payload.fileId,
        // ADMIN deletes are MEDIUM — they bypass the user-side delete path.
        // USER + RETENTION are routine LOW-severity events.
        severity: payload.reason === 'ADMIN' ? 'MEDIUM' : 'LOW',
        details: {
          filename: payload.filename,
          deletedBy: payload.deletedBy,
          reason: payload.reason,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileDeleted: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
    }
  }

  async handleFileOcrStarted(payload: FileOcrStartedPayload): Promise<void> {
    this.logger.debug(
      `handleFileOcrStarted: fileId=${payload.fileId} mimeType=${payload.mimeType} isScannedPdf=${String(payload.isScannedPdf)}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.ocr_started',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'LOW',
        details: {
          mimeType: payload.mimeType,
          isImageFile: payload.isImageFile,
          isScannedPdf: payload.isScannedPdf,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileOcrStarted: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
    }
  }

  async handleFileOcrCompleted(payload: FileOcrCompletedPayload): Promise<void> {
    this.logger.debug(
      `handleFileOcrCompleted: fileId=${payload.fileId} chars=${String(payload.extractedTextLength)} confidence=${payload.confidence.toFixed(2)}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.ocr_completed',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'LOW',
        details: {
          extractedTextLength: payload.extractedTextLength,
          confidence: payload.confidence,
          durationMs: payload.durationMs,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileOcrCompleted: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
    }
  }

  async handleFileOcrFailed(payload: FileOcrFailedPayload): Promise<void> {
    this.logger.debug(
      `handleFileOcrFailed: fileId=${payload.fileId} stage=${payload.failureStage}`,
    );
    try {
      await this.auditsService.createAuditLog({
        userId: payload.userId,
        action: 'file.ocr_failed',
        entityType: 'file',
        entityId: payload.fileId,
        severity: 'ERROR',
        details: {
          errorMessage: payload.errorMessage,
          failureStage: payload.failureStage,
        },
      });
    } catch (error) {
      this.logger.error(
        `handleFileOcrFailed: failed fileId=${payload.fileId} — ${(error as Error).message}`,
      );
    }
  }
}
