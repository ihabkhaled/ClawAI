import type {
  RUNNER_COMPLIANCE_STATUSES,
  RUNNER_POLICY_MODES,
} from '../constants/runner-policy.constants';

export type RunnerPolicyMode = (typeof RUNNER_POLICY_MODES)[number];
export type RunnerComplianceStatus = (typeof RUNNER_COMPLIANCE_STATUSES)[number];

/** A parsed semantic version; `prerelease` is empty for a release. */
export interface ParsedRunnerVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: readonly string[];
}

/**
 * One organization's runner policy as the admin reads and writes it.
 * Kept out of `EffectivePolicy` on purpose: the extension parses that payload
 * with a strict schema, so an extra key would break every member's client.
 */
export interface RunnerPolicy {
  readonly minRunnerVersion: string | null;
  readonly allowedRunnerPlatforms: readonly string[] | null;
  readonly runnerPolicyMode: RunnerPolicyMode;
  readonly requireVersionReport: boolean;
}

/** The row fields the runner policy reads; JSON arrives unparsed. */
export interface StoredRunnerPolicy {
  minRunnerVersion?: unknown;
  allowedRunnerPlatforms?: unknown;
  runnerPolicyMode?: unknown;
  requireVersionReport?: unknown;
}

/** A runner's self-reported facts. Either field may be absent. */
export interface RunnerReport {
  readonly agentVersion?: string;
  readonly platform?: string;
}

/**
 * The verdict for one runner report.
 *
 * `evaluated: false` means no verdict was reached (a lookup failed), so the
 * caller must leave any stored verdict alone and let the runner through.
 * `status: null` with `evaluated: true` means nothing applies (mode off or no
 * constraint set), which clears a stale flag.
 */
export interface RunnerComplianceDecision {
  readonly evaluated: boolean;
  readonly status: RunnerComplianceStatus | null;
  readonly reason: string | null;
  readonly refuse: boolean;
}

/** What one policy found wrong, or could not check, in one report. */
export interface RunnerReportFindings {
  readonly violations: string[];
  readonly unknowns: string[];
}
