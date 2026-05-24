import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import {
  DownloadStatus,
  PullJobCancelOutcome,
  PullJobStatus,
  PullReasonCode,
} from '../../../common/enums';
import { LlamacppEventsPublisher } from '../../../common/events/llamacpp-events.publisher';
import { CatalogRepository } from '../../catalog/repositories/catalog.repository';
import { HardwareService } from '../../hardware/services/hardware.service';
import { PreflightValidatorManager } from '../../hardware/managers/preflight-validator.manager';
import { PullJobsRepository } from '../repositories/pull-jobs.repository';
import { PullJobRunnerManager } from '../managers/pull-job-runner.manager';
import {
  type PullJob,
  type PullJobCancelResult,
  type PullJobCreatePayload,
  type PullJobCreateResult,
} from '../types/pull-job.types';

@Injectable()
export class PullJobsService {
  private readonly logger = new Logger(PullJobsService.name);

  constructor(
    private readonly repo: PullJobsRepository,
    private readonly catalogRepo: CatalogRepository,
    private readonly hardwareService: HardwareService,
    private readonly preflight: PreflightValidatorManager,
    private readonly runner: PullJobRunnerManager,
    private readonly events: LlamacppEventsPublisher,
  ) {}

  async create(payload: PullJobCreatePayload): Promise<PullJobCreateResult> {
    this.logger.log(`create: model=${payload.modelId} override=${payload.overrideHardwareGate}`);
    const entry = await this.catalogRepo.findById(payload.modelId);
    if (!entry) {
      throw new EntityNotFoundException('FrontierCatalogEntry', payload.modelId);
    }
    if (entry.downloadStatus === DownloadStatus.READY) {
      throw new BusinessException(
        'Model already downloaded',
        'MODEL_ALREADY_DOWNLOADED',
        HttpStatus.CONFLICT,
      );
    }

    const active = await this.repo.findActiveForModel(payload.modelId);
    if (active) {
      throw new BusinessException(
        'Active pull job already exists for this model',
        'PULL_JOB_ACTIVE',
        HttpStatus.CONFLICT,
      );
    }

    const hardware = await this.hardwareService.getCurrent();
    const result = this.preflight.validate(entry, hardware, payload.overrideHardwareGate);
    if (!result.ok) {
      throw new BusinessException(
        `Hardware preflight refused: ${result.reasons.join(', ')}`,
        'HARDWARE_PREFLIGHT_FAILED',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (result.overrideUsed && payload.initiatedByUser) {
      await this.preflight.recordOverride(payload.initiatedByUser, entry, hardware, result.overriddenReasons);
    }

    const job = await this.repo.create({
      modelId: payload.modelId,
      totalBytes: entry.fileSizeBytes,
      totalFiles: 1,
      initiatedByUser: payload.initiatedByUser,
    });

    this.events.pullStarted({
      jobId: job.id,
      modelId: entry.id,
      modelName: `${entry.name}:${entry.tag}`,
      initiatedByUser: payload.initiatedByUser ?? null,
    });

    void this.runner.run(job.id).catch((error: Error) => {
      this.logger.error(`runner: ${job.id} unhandled — ${error.message}`);
    });

    return { jobId: job.id, sseUrl: `/api/v1/llamacpp/pull-jobs/${job.id}/progress` };
  }

  async findById(id: string): Promise<PullJob> {
    const job = await this.repo.findById(id);
    if (!job) {
      throw new EntityNotFoundException('PullJob', id);
    }
    return job;
  }

  async list(filters: { status?: PullJobStatus; modelId?: string; limit?: number }): Promise<{
    rows: PullJob[];
    total: number;
  }> {
    return this.repo.list(filters);
  }

  async cancel(id: string): Promise<PullJobCancelResult> {
    this.logger.log(`cancel: ${id}`);
    const job = await this.findById(id);
    const isActive =
      job.status === PullJobStatus.PENDING || job.status === PullJobStatus.RUNNING;
    if (isActive) {
      this.runner.cancel(id);
      await this.repo.updateStatus(id, PullJobStatus.CANCELLED, {
        reasonCode: PullReasonCode.USER_CANCELLED,
        completedAt: new Date(),
      });
      this.events.pullFailed({
        jobId: id,
        modelId: job.modelId,
        reasonCode: PullReasonCode.USER_CANCELLED,
        errorMessage: 'Cancelled by user',
      });
      return { id, status: PullJobCancelOutcome.CANCELLED };
    }
    // Terminal job (FAILED/COMPLETED/CANCELLED) — hard-delete the row so the
    // UI can dismiss it from the downloads drawer.
    await this.repo.deleteById(id);
    return { id, status: PullJobCancelOutcome.DISMISSED };
  }

  async retry(id: string): Promise<PullJobCreateResult> {
    this.logger.log(`retry: ${id}`);
    const job = await this.findById(id);
    if (job.status !== PullJobStatus.FAILED && job.status !== PullJobStatus.CANCELLED) {
      throw new BusinessException(
        'Only FAILED or CANCELLED jobs can be retried',
        'PULL_JOB_NOT_RETRYABLE',
        HttpStatus.CONFLICT,
      );
    }
    return this.create({
      modelId: job.modelId,
      overrideHardwareGate: false,
      initiatedByUser: job.initiatedByUser ?? undefined,
    });
  }
}
