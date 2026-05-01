import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AuditsService } from '../services/audits.service';
import {
  type LlamacppBinaryPayload,
  type LlamacppEventPayload,
  type LlamacppModelLifecyclePayload,
  type LlamacppPreflightPayload,
  type LlamacppPullPayload,
} from '../types/llamacpp-event.types';
import { LLAMACPP_AUDIT_ENTITY_TYPE } from '../constants/llamacpp-audit.constants';

/**
 * Audits every llama.cpp service lifecycle event so compliance can reconstruct
 * binary installs, model pulls, model load/unload, weight deletion, and
 * preflight overrides — including who initiated each.
 */
@Injectable()
export class LlamacppAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(LlamacppAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const entries: Array<[string, (raw: unknown) => Promise<void>]> = [
      [EventPattern.LLAMACPP_BINARY_INSTALLED, (raw) => this.handleBinaryInstalled(raw as LlamacppBinaryPayload)],
      [EventPattern.LLAMACPP_BINARY_UPDATED, (raw) => this.handleBinaryUpdated(raw as LlamacppBinaryPayload)],
      [EventPattern.LLAMACPP_PULL_STARTED, (raw) => this.handlePullStarted(raw as LlamacppPullPayload)],
      [EventPattern.LLAMACPP_PULL_PROGRESS, (raw) => this.handlePullProgress(raw as LlamacppPullPayload)],
      [EventPattern.LLAMACPP_PULL_COMPLETED, (raw) => this.handlePullCompleted(raw as LlamacppPullPayload)],
      [EventPattern.LLAMACPP_PULL_FAILED, (raw) => this.handlePullFailed(raw as LlamacppPullPayload)],
      [EventPattern.LLAMACPP_MODEL_LOADED, (raw) => this.handleModelLoaded(raw as LlamacppModelLifecyclePayload)],
      [EventPattern.LLAMACPP_MODEL_UNLOADED, (raw) => this.handleModelUnloaded(raw as LlamacppModelLifecyclePayload)],
      [EventPattern.LLAMACPP_MODEL_CRASHED, (raw) => this.handleModelCrashed(raw as LlamacppModelLifecyclePayload)],
      [EventPattern.LLAMACPP_WEIGHTS_DELETED, (raw) => this.handleWeightsDeleted(raw as LlamacppModelLifecyclePayload)],
      [EventPattern.LLAMACPP_PREFLIGHT_OVERRIDDEN, (raw) => this.handlePreflightOverridden(raw as LlamacppPreflightPayload)],
    ];
    for (const [pattern, handler] of entries) {
      await this.rabbitmq.subscribe(pattern, handler);
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  private async handleBinaryInstalled(payload: LlamacppBinaryPayload): Promise<void> {
    await this.write({
      userId: 'system',
      action: 'LLAMACPP_BINARY_INSTALLED',
      entityId: `binary:${payload.platform}`,
      severity: 'LOW',
      details: this.toDetails(payload),
    });
  }

  private async handleBinaryUpdated(payload: LlamacppBinaryPayload): Promise<void> {
    await this.write({
      userId: 'system',
      action: 'LLAMACPP_BINARY_UPDATED',
      entityId: `binary:${payload.platform}`,
      severity: 'MEDIUM',
      details: this.toDetails(payload),
    });
  }

  private async handlePullStarted(payload: LlamacppPullPayload): Promise<void> {
    await this.write({
      userId: payload.initiatedByUser ?? 'system',
      action: 'LLAMACPP_PULL_STARTED',
      entityId: payload.modelId,
      severity: 'LOW',
      details: this.toDetails(payload),
    });
  }

  private async handlePullProgress(_payload: LlamacppPullPayload): Promise<void> {
    // Progress events are high-frequency; intentionally not audited per row.
    // The summary record on COMPLETED / FAILED captures the final state.
  }

  private async handlePullCompleted(payload: LlamacppPullPayload): Promise<void> {
    await this.write({
      userId: 'system',
      action: 'LLAMACPP_PULL_COMPLETED',
      entityId: payload.modelId,
      severity: 'LOW',
      details: this.toDetails(payload),
    });
  }

  private async handlePullFailed(payload: LlamacppPullPayload): Promise<void> {
    await this.write({
      userId: 'system',
      action: 'LLAMACPP_PULL_FAILED',
      entityId: payload.modelId,
      severity: 'HIGH',
      details: this.toDetails(payload),
    });
  }

  private async handleModelLoaded(payload: LlamacppModelLifecyclePayload): Promise<void> {
    await this.write({
      userId: 'system',
      action: 'LLAMACPP_MODEL_LOADED',
      entityId: payload.modelId,
      severity: 'LOW',
      details: this.toDetails(payload),
    });
  }

  private async handleModelUnloaded(payload: LlamacppModelLifecyclePayload): Promise<void> {
    await this.write({
      userId: 'system',
      action: 'LLAMACPP_MODEL_UNLOADED',
      entityId: payload.modelId,
      severity: 'LOW',
      details: this.toDetails(payload),
    });
  }

  private async handleModelCrashed(payload: LlamacppModelLifecyclePayload): Promise<void> {
    await this.write({
      userId: 'system',
      action: 'LLAMACPP_MODEL_CRASHED',
      entityId: payload.modelId,
      severity: 'HIGH',
      details: this.toDetails(payload),
    });
  }

  private async handleWeightsDeleted(payload: LlamacppModelLifecyclePayload): Promise<void> {
    await this.write({
      userId: 'system',
      action: 'LLAMACPP_WEIGHTS_DELETED',
      entityId: payload.modelId,
      severity: 'HIGH',
      details: this.toDetails(payload),
    });
  }

  private async handlePreflightOverridden(payload: LlamacppPreflightPayload): Promise<void> {
    await this.write({
      userId: payload.userId ?? 'system',
      action: 'LLAMACPP_PREFLIGHT_OVERRIDDEN',
      entityId: payload.modelId,
      severity: 'MEDIUM',
      details: this.toDetails(payload),
    });
  }

  private toDetails(payload: LlamacppEventPayload): Record<string, unknown> {
    return payload as unknown as Record<string, unknown>;
  }

  private async write(input: {
    userId: string;
    action: string;
    entityId: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    details: Record<string, unknown>;
  }): Promise<void> {
    await this.audits.createAuditLog({
      userId: input.userId,
      action: input.action,
      entityType: LLAMACPP_AUDIT_ENTITY_TYPE,
      entityId: input.entityId,
      severity: input.severity,
      details: input.details,
    });
  }
}
