import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type WorkspaceSyncDlqSentPayload,
  type WorkspaceSyncManualTriggeredPayload,
  type WorkspaceSyncPausedPayload,
  type WorkspaceSyncRateLimitedPayload,
  type WorkspaceSyncResumedPayload,
  type WorkspaceSyncRunCompletedPayload,
  type WorkspaceSyncRunFailedPayload,
  type WorkspaceSyncRunStartedPayload,
  type WorkspaceSyncStaleDetectedPayload,
} from '@claw/shared-types';

import { AuditsService } from '../services/audits.service';

/**
 * Audits every workspace sync lifecycle event fired by `claw-workspace-service`.
 *
 * One record per event with the full payload so compliance can reconstruct
 * what was pulled, when, from where, by whom, and with what outcome.
 */
@Injectable()
export class WorkspaceSyncAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(WorkspaceSyncAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const entries: Array<[string, (raw: unknown) => Promise<void>]> = [
      [
        EventPattern.WORKSPACE_SYNC_RUN_STARTED,
        (raw) => this.handleRunStarted(raw as WorkspaceSyncRunStartedPayload),
      ],
      [
        EventPattern.WORKSPACE_SYNC_RUN_COMPLETED,
        (raw) => this.handleRunCompleted(raw as WorkspaceSyncRunCompletedPayload),
      ],
      [
        EventPattern.WORKSPACE_SYNC_RUN_FAILED,
        (raw) => this.handleRunFailed(raw as WorkspaceSyncRunFailedPayload),
      ],
      [
        EventPattern.WORKSPACE_SYNC_STALE_DETECTED,
        (raw) => this.handleStaleDetected(raw as WorkspaceSyncStaleDetectedPayload),
      ],
      [
        EventPattern.WORKSPACE_SYNC_MANUAL_TRIGGERED,
        (raw) => this.handleManualTriggered(raw as WorkspaceSyncManualTriggeredPayload),
      ],
      [
        EventPattern.WORKSPACE_SYNC_PAUSED,
        (raw) => this.handlePaused(raw as WorkspaceSyncPausedPayload),
      ],
      [
        EventPattern.WORKSPACE_SYNC_RESUMED,
        (raw) => this.handleResumed(raw as WorkspaceSyncResumedPayload),
      ],
      [
        EventPattern.WORKSPACE_SYNC_RATE_LIMITED,
        (raw) => this.handleRateLimited(raw as WorkspaceSyncRateLimitedPayload),
      ],
      [
        EventPattern.WORKSPACE_SYNC_DLQ_SENT,
        (raw) => this.handleDlqSent(raw as WorkspaceSyncDlqSentPayload),
      ],
    ];
    for (const [pattern, handler] of entries) {
      await this.rabbitmq.subscribe(pattern, handler);
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  async handleRunStarted(payload: WorkspaceSyncRunStartedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: payload.actorUserId ?? 'system',
      action: 'SYNC_RUN_STARTED',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'LOW',
      details: {
        provider: payload.provider,
        runId: payload.runId,
        isDelta: payload.isDelta,
        isDryRun: payload.isDryRun,
        triggeredBy: payload.triggeredBy,
      },
    });
  }

  async handleRunCompleted(payload: WorkspaceSyncRunCompletedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: 'system',
      action: 'SYNC_RUN_COMPLETED',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'LOW',
      details: {
        provider: payload.provider,
        runId: payload.runId,
        durationMs: payload.durationMs,
        objectsFound: payload.objectsFound,
        objectsSynced: payload.objectsSynced,
        objectsFailed: payload.objectsFailed,
        retryCount: payload.retryCount,
        triggeredBy: payload.triggeredBy,
      },
    });
  }

  async handleRunFailed(payload: WorkspaceSyncRunFailedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: 'system',
      action: 'SYNC_RUN_FAILED',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'HIGH',
      details: {
        provider: payload.provider,
        runId: payload.runId,
        retryCount: payload.retryCount,
        errorClass: payload.errorClass,
        errorMessage: payload.errorMessage,
        dlqPublished: payload.dlqPublished,
        terminal: payload.terminal,
        triggeredBy: payload.triggeredBy,
      },
    });
  }

  async handleStaleDetected(payload: WorkspaceSyncStaleDetectedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: 'system',
      action: 'SYNC_STALE_DETECTED',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'MEDIUM',
      details: {
        provider: payload.provider,
        lastSyncAt: payload.lastSyncAt,
        cadenceSeconds: payload.cadenceSeconds,
        overdueSeconds: payload.overdueSeconds,
        staleMultiplier: payload.staleMultiplier,
      },
    });
  }

  async handleManualTriggered(payload: WorkspaceSyncManualTriggeredPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: payload.actorUserId,
      action: 'SYNC_MANUAL_TRIGGERED',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'LOW',
      details: {
        provider: payload.provider,
        priority: payload.priority,
        dryRun: payload.dryRun,
        reusedInFlight: payload.reusedInFlight,
        reusedRunId: payload.reusedRunId,
      },
    });
  }

  async handlePaused(payload: WorkspaceSyncPausedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: payload.actorUserId,
      action: 'SYNC_PAUSED',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'MEDIUM',
      details: { provider: payload.provider, reason: payload.reason },
    });
  }

  async handleResumed(payload: WorkspaceSyncResumedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: payload.actorUserId,
      action: 'SYNC_RESUMED',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'LOW',
      details: { provider: payload.provider },
    });
  }

  async handleRateLimited(payload: WorkspaceSyncRateLimitedPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: 'system',
      action: 'SYNC_RATE_LIMITED',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'MEDIUM',
      details: {
        provider: payload.provider,
        retryAfterMs: payload.retryAfterMs,
        strikes: payload.strikes,
        endpointHint: payload.endpointHint,
      },
    });
  }

  async handleDlqSent(payload: WorkspaceSyncDlqSentPayload): Promise<void> {
    await this.audits.createAuditLog({
      userId: 'system',
      action: 'SYNC_DLQ_SENT',
      entityType: 'workspace_connector',
      entityId: payload.connectorId,
      severity: 'HIGH',
      details: {
        provider: payload.provider,
        runId: payload.runId,
        queue: payload.queue,
        errorClass: payload.errorClass,
        attemptsConsumed: payload.attemptsConsumed,
      },
    });
  }
}
