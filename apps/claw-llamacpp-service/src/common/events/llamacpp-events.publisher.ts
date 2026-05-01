import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { type PreflightReason, type PullReasonCode } from '../enums';

@Injectable()
export class LlamacppEventsPublisher {
  private readonly logger = new Logger(LlamacppEventsPublisher.name);

  constructor(private readonly rabbitMQ: RabbitMQService) {}

  binaryInstalled(payload: { version: string; platform: string; binaryPath: string }): void {
    this.publish(EventPattern.LLAMACPP_BINARY_INSTALLED, payload);
  }

  binaryUpdated(payload: {
    version: string;
    previousVersion: string | null;
    platform: string;
  }): void {
    this.publish(EventPattern.LLAMACPP_BINARY_UPDATED, payload);
  }

  pullStarted(payload: {
    jobId: string;
    modelId: string;
    modelName: string;
    initiatedByUser?: string | null;
  }): void {
    this.publish(EventPattern.LLAMACPP_PULL_STARTED, payload);
  }

  pullProgress(payload: {
    jobId: string;
    modelId: string;
    downloadedBytes: bigint;
    totalBytes: bigint;
    completedFiles: number;
    totalFiles: number;
  }): void {
    this.publish(EventPattern.LLAMACPP_PULL_PROGRESS, {
      jobId: payload.jobId,
      modelId: payload.modelId,
      downloadedBytes: Number(payload.downloadedBytes),
      totalBytes: Number(payload.totalBytes),
      completedFiles: payload.completedFiles,
      totalFiles: payload.totalFiles,
    });
  }

  pullCompleted(payload: { jobId: string; modelId: string; totalBytes: bigint }): void {
    this.publish(EventPattern.LLAMACPP_PULL_COMPLETED, {
      jobId: payload.jobId,
      modelId: payload.modelId,
      totalBytes: Number(payload.totalBytes),
    });
  }

  pullFailed(payload: {
    jobId: string;
    modelId: string;
    reasonCode: PullReasonCode;
    errorMessage: string;
  }): void {
    this.publish(EventPattern.LLAMACPP_PULL_FAILED, payload);
  }

  modelLoaded(payload: { modelId: string; modelName: string; pid: number; port: number }): void {
    this.publish(EventPattern.LLAMACPP_MODEL_LOADED, payload);
  }

  modelUnloaded(payload: { modelId: string; modelName: string }): void {
    this.publish(EventPattern.LLAMACPP_MODEL_UNLOADED, payload);
  }

  modelCrashed(payload: {
    modelId: string;
    modelName: string;
    exitCode: number | null;
    signal: string | null;
  }): void {
    this.publish(EventPattern.LLAMACPP_MODEL_CRASHED, payload);
  }

  weightsDeleted(payload: { modelId: string; modelName: string }): void {
    this.publish(EventPattern.LLAMACPP_WEIGHTS_DELETED, payload);
  }

  preflightOverridden(payload: {
    userId: string | null;
    modelId: string;
    modelName: string;
    reasons: PreflightReason[];
  }): void {
    this.publish(EventPattern.LLAMACPP_PREFLIGHT_OVERRIDDEN, {
      ...payload,
      reasons: payload.reasons as unknown as string[],
    });
  }

  private publish(pattern: EventPattern, payload: unknown): void {
    try {
      void this.rabbitMQ.publish(pattern, payload);
      this.logger.debug(`publish: ${pattern}`);
    } catch (error) {
      this.logger.error(`publish ${pattern}: ${(error as Error).message}`);
    }
  }
}
