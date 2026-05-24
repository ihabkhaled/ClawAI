import { Injectable, Logger } from '@nestjs/common';

import {
  CAPABILITY_DUAL_WRITE_FLAG_ENV,
  DUAL_WRITE_MIN_DECISIONS_BEFORE_RETIREMENT,
  DUAL_WRITE_RECENT_DIVERGENCE_RING_SIZE,
} from '../../../common/constants/capability.constants';
import type {
  CapabilityDualWriteStatus,
  DualWriteDivergenceRecord,
  DualWriteRecordingInput,
} from '../types/capability-dual-write.types';

/**
 * V2 Stream 01 — terminal-command dual-write retirement infrastructure.
 *
 * In-memory rolling counters that record every legacy CommandRiskService
 * decision alongside its CapabilityRiskService counterpart during the
 * soak window. The operator-facing status endpoint
 * (`GET /api/v1/agent/capability/dual-write-status`) reports the
 * divergence rate so the retirement flag flip is evidence-driven, not
 * timer-driven.
 *
 * Why in-memory: the counter only needs to survive the current process
 * lifetime — every restart resets the counter, which is the desired
 * behavior (post-deploy comparisons are the most informative). Long-term
 * persistence belongs in the audit Mongo collection, which already
 * receives every CAPABILITY_PROPOSED / CAPABILITY_DENIED event.
 */
@Injectable()
export class CapabilityDualWriteMetricsService {
  private readonly logger = new Logger(CapabilityDualWriteMetricsService.name);
  private readonly recentDivergences: DualWriteDivergenceRecord[] = [];

  private totalDecisions = 0;
  private divergentDecisions = 0;
  private startedAt = new Date();

  recordDecision(input: DualWriteRecordingInput): void {
    this.totalDecisions += 1;
    if (input.legacyDecision !== input.capabilityDecision) {
      this.divergentDecisions += 1;
      this.appendRecentDivergence({
        observedAt: new Date().toISOString(),
        commandPreview: input.commandPreview,
        legacyDecision: input.legacyDecision,
        capabilityDecision: input.capabilityDecision,
        legacyPolicyName: input.legacyPolicyName,
        capabilityPolicyName: input.capabilityPolicyName,
      });
      this.logger.warn(
        `[dual-write] divergence #${String(this.divergentDecisions)} — command="${input.commandPreview}" legacy=${input.legacyDecision} capability=${input.capabilityDecision} legacyPolicy=${input.legacyPolicyName ?? 'none'} capabilityPolicy=${input.capabilityPolicyName ?? 'none'}`,
      );
    }
  }

  recordCapabilityPathError(commandPreview: string, error: string): void {
    this.totalDecisions += 1;
    this.divergentDecisions += 1;
    this.appendRecentDivergence({
      observedAt: new Date().toISOString(),
      commandPreview,
      legacyDecision: 'OK',
      capabilityDecision: 'ERROR',
      legacyPolicyName: null,
      capabilityPolicyName: null,
      errorMessage: error,
    });
    this.logger.warn(
      `[dual-write] capability path errored — command="${commandPreview}" error="${error}"`,
    );
  }

  status(): CapabilityDualWriteStatus {
    const enabled = this.dualWriteEnabled();
    const divergenceRate =
      this.totalDecisions === 0 ? 0 : this.divergentDecisions / this.totalDecisions;
    return {
      flagEnv: CAPABILITY_DUAL_WRITE_FLAG_ENV,
      enabled,
      startedAt: this.startedAt.toISOString(),
      totalDecisions: this.totalDecisions,
      divergentDecisions: this.divergentDecisions,
      divergenceRate: Number(divergenceRate.toFixed(6)),
      recentDivergences: [...this.recentDivergences],
      retirementReady:
        enabled &&
        this.totalDecisions >= DUAL_WRITE_MIN_DECISIONS_BEFORE_RETIREMENT &&
        this.divergentDecisions === 0,
    };
  }

  /**
   * Test/admin helper — reset counters. Used by integration tests that
   * need a clean window per scenario.
   */
  reset(): void {
    this.totalDecisions = 0;
    this.divergentDecisions = 0;
    this.recentDivergences.length = 0;
    this.startedAt = new Date();
  }

  private dualWriteEnabled(): boolean {
    const entry = Object.entries(process.env).find(([k]) => k === CAPABILITY_DUAL_WRITE_FLAG_ENV);
    const raw = entry?.[1];
    if (raw === undefined || raw === '') {
      return true; // default-on per CLAUDE.md until soak proves equivalence
    }
    return raw.toLowerCase() !== 'false';
  }

  private appendRecentDivergence(record: DualWriteDivergenceRecord): void {
    this.recentDivergences.unshift(record);
    if (this.recentDivergences.length > DUAL_WRITE_RECENT_DIVERGENCE_RING_SIZE) {
      this.recentDivergences.length = DUAL_WRITE_RECENT_DIVERGENCE_RING_SIZE;
    }
  }
}
