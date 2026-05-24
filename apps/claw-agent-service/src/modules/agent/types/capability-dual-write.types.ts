import type { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';

/**
 * V2 Stream 01 — terminal-command dual-write retirement.
 *
 * Reported by `GET /api/v1/agent/capability/dual-write-status`. Used by
 * operators to determine when the
 * `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE` flag can be
 * flipped to `false` (legacy path retired).
 */

export type DualWriteDecision = CapabilityInvocationStatus | 'OK' | 'ERROR';

export type DualWriteDivergenceRecord = {
  observedAt: string;
  commandPreview: string;
  legacyDecision: DualWriteDecision;
  capabilityDecision: DualWriteDecision;
  legacyPolicyName: string | null;
  capabilityPolicyName: string | null;
  errorMessage?: string;
};

export type DualWriteRecordingInput = {
  commandPreview: string;
  legacyDecision: CapabilityInvocationStatus;
  capabilityDecision: CapabilityInvocationStatus;
  legacyPolicyName: string | null;
  capabilityPolicyName: string | null;
};

export type CapabilityDualWriteStatus = {
  flagEnv: string;
  enabled: boolean;
  startedAt: string;
  totalDecisions: number;
  divergentDecisions: number;
  divergenceRate: number;
  recentDivergences: DualWriteDivergenceRecord[];
  /**
   * True when the dual-write flag is still on, enough decisions have
   * been observed to trust the sample (>= 500), and zero divergences
   * were recorded since the process started. Operators may flip the
   * flag once retirementReady has been true on every replica for
   * 7 consecutive days. See
   * docs/15-ai-context/desktop-agent-dual-write-retirement.md.
   */
  retirementReady: boolean;
};
