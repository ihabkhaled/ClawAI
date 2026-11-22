import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { LiveAdmissionRefusal } from '../../../common/enums/live-admission-refusal.enum';
import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { type LiveProcessingRun } from '../../../generated/prisma';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import {
  NO_RUN_CAPABILITIES,
  PIPELINE_VERSION,
  PRISMA_UNIQUE_VIOLATION,
} from '../constants/processing.constants';
import { ProcessingRunRepository } from '../repositories/processing-run.repository';
import type {
  RunAttachRequest,
  RunAttachResult,
  RunCoordinatorContract,
} from '../types/run-coordinator.types';
import { computeProcessingKey } from '../utilities/processing-key.utility';

/** Create-or-join of the one active run per processingKey; stop on last viewer; admission. */
@Injectable()
export class RunCoordinatorService implements RunCoordinatorContract {
  constructor(
    private readonly runs: ProcessingRunRepository,
    private readonly policy: LivePolicyService,
  ) {}

  async attach(request: RunAttachRequest): Promise<RunAttachResult> {
    const stream = await this.runs.findStream(request.streamId);
    if (!stream) throw new NotFoundException(LiveSourceErrorCode.STREAM_NOT_FOUND);
    if (NO_RUN_CAPABILITIES.includes(stream.capability)) {
      throw new UnprocessableEntityException(LiveSourceErrorCode.SOURCE_PLAYER_ONLY);
    }
    const key = computeProcessingKey(
      stream.sourceKind,
      stream.sourceIdentity,
      stream.accessScope,
      request.mode,
      PIPELINE_VERSION,
    );
    const existing = await this.runs.findByActiveKey(key);
    if (existing) return { runId: existing.id, created: false };
    let created: LiveProcessingRun;
    try {
      created = await this.runs.createRun(stream.id, key, request.mode, PIPELINE_VERSION);
    } catch (error: unknown) {
      if (!this.isUniqueViolation(error)) throw error;
      const winner = await this.runs.findByActiveKey(key);
      if (!winner) throw error;
      return { runId: winner.id, created: false };
    }
    return { runId: created.id, created: true };
  }

  /**
   * BROWSER_CAPTURE: the newest session of the viewer owns the run's audio (a second tab of
   * the same viewer takes the capture over; the older tab's chunks then get 409).
   */
  async assignCaptureSession(runId: string, sessionId: string): Promise<void> {
    await this.runs.setCaptureSession(runId, sessionId);
  }

  async onViewerDetached(runId: string): Promise<void> {
    const remaining = await this.runs.countAttachedViewers(runId);
    if (remaining === 0) await this.runs.markStopping(runId);
  }

  async admissionRefusal(): Promise<string | null> {
    const { config } = await this.policy.active();
    if (!config.featureEnabled || config.killSwitch) return LiveAdmissionRefusal.DISABLED;
    if ((await this.runs.countRunningRuns()) >= config.maxActiveStreams) {
      return LiveAdmissionRefusal.CAPACITY;
    }
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const spent = await this.runs.providerCostSince(startOfDay);
    const softStop = (config.dailyBudgetMicroUsd * config.budgetSoftStopPercent) / 100;
    return spent >= softStop ? LiveAdmissionRefusal.CAPACITY : null;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === PRISMA_UNIQUE_VIOLATION
    );
  }
}
