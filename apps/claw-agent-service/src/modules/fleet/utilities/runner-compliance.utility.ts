import {
  RUNNER_COMPLIANCE_REASONS,
  RUNNER_NOT_APPLICABLE,
  RUNNER_POLICY_MODES,
  RUNNER_POLICY_PLATFORMS,
} from '../constants/runner-policy.constants';
import { compareRunnerVersions, parseRunnerVersion } from './runner-version.utility';

import type {
  RunnerComplianceDecision,
  RunnerComplianceStatus,
  RunnerPolicy,
  RunnerPolicyMode,
  RunnerReport,
  RunnerReportFindings,
  StoredRunnerPolicy,
} from '../types/runner-policy.types';

function readMode(stored: unknown): RunnerPolicyMode {
  return RUNNER_POLICY_MODES.find((mode) => mode === stored) ?? 'off';
}

function readMinVersion(stored: unknown): string | null {
  return typeof stored === 'string' && parseRunnerVersion(stored) !== null ? stored : null;
}

/** Only a non-empty list of known platforms constrains; anything else is no opinion. */
function readPlatforms(stored: unknown): readonly string[] | null {
  if (!Array.isArray(stored) || stored.length === 0) return null;
  const known = stored.filter((entry): entry is string =>
    RUNNER_POLICY_PLATFORMS.includes(entry as (typeof RUNNER_POLICY_PLATFORMS)[number]),
  );
  return known.length === 0 ? null : known;
}

/**
 * Reads a stored row into a policy that cannot throw. Fail open by design: a
 * malformed field is dropped (it constrains nothing) and an unknown mode is
 * `off`, because refusing runners over a corrupt column would lock a fleet out
 * for a data error nobody chose.
 */
export function readRunnerPolicy(stored: StoredRunnerPolicy): RunnerPolicy {
  return {
    minRunnerVersion: readMinVersion(stored.minRunnerVersion),
    allowedRunnerPlatforms: readPlatforms(stored.allowedRunnerPlatforms),
    runnerPolicyMode: readMode(stored.runnerPolicyMode),
    requireVersionReport: stored.requireVersionReport === true,
  };
}

function checkVersion(
  policy: RunnerPolicy,
  report: RunnerReport,
  findings: RunnerReportFindings,
): void {
  if (policy.minRunnerVersion === null) return;
  if (report.agentVersion === undefined) {
    findings.unknowns.push(RUNNER_COMPLIANCE_REASONS.versionMissing);
    return;
  }
  const reported = parseRunnerVersion(report.agentVersion);
  const minimum = parseRunnerVersion(policy.minRunnerVersion);
  if (reported === null) {
    // Junk is not proof of staleness: it cannot be compared, so it is unknown.
    findings.unknowns.push(RUNNER_COMPLIANCE_REASONS.versionUnreadable);
    return;
  }
  if (minimum !== null && compareRunnerVersions(reported, minimum) < 0) {
    findings.violations.push(RUNNER_COMPLIANCE_REASONS.versionBelowMinimum);
  }
}

function checkPlatform(
  policy: RunnerPolicy,
  report: RunnerReport,
  findings: RunnerReportFindings,
): void {
  if (policy.allowedRunnerPlatforms === null) return;
  if (report.platform === undefined) {
    findings.unknowns.push(RUNNER_COMPLIANCE_REASONS.platformMissing);
    return;
  }
  if (!policy.allowedRunnerPlatforms.includes(report.platform)) {
    findings.violations.push(RUNNER_COMPLIANCE_REASONS.platformNotAllowed);
  }
}

function hasConstraint(policy: RunnerPolicy): boolean {
  return policy.minRunnerVersion !== null || policy.allowedRunnerPlatforms !== null;
}

/**
 * Scores one report against every policy the runner's owner is under. Each
 * organization is judged on its own terms, so a permissive organization's
 * `off` never softens a strict one's `enforce`; the verdict is the worst
 * across them.
 *
 * Refusal needs mode `enforce` AND a constraint set AND either a definite
 * violation or (a missing/unreadable report with `requireVersionReport`).
 * Self-reported and unsigned: this detects stale runners, not impostors.
 */
export function evaluateRunnerReport(
  policies: readonly RunnerPolicy[],
  report: RunnerReport,
): RunnerComplianceDecision {
  let applied = false;
  let refuse = false;
  const reasons = new Set<string>();
  let status: RunnerComplianceStatus = 'compliant';

  for (const policy of policies) {
    if (policy.runnerPolicyMode === 'off' || !hasConstraint(policy)) continue;
    applied = true;
    const findings: RunnerReportFindings = { violations: [], unknowns: [] };
    checkVersion(policy, report, findings);
    checkPlatform(policy, report, findings);

    for (const reason of [...findings.violations, ...findings.unknowns]) reasons.add(reason);
    if (findings.violations.length > 0) status = 'noncompliant';
    else if (findings.unknowns.length > 0 && status === 'compliant') status = 'unknown';

    if (policy.runnerPolicyMode === 'enforce') {
      if (findings.violations.length > 0) refuse = true;
      else if (findings.unknowns.length > 0 && policy.requireVersionReport) refuse = true;
    }
  }

  if (!applied) return RUNNER_NOT_APPLICABLE;
  return {
    evaluated: true,
    status,
    reason: reasons.size === 0 ? null : [...reasons].join(','),
    refuse,
  };
}
