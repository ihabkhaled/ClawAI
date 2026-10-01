import type { RunnerComplianceDecision, RunnerPolicy } from '../types/runner-policy.types';

/**
 * F100 organization runner policy (staged).
 *
 * `off` evaluates nothing and is the default, so adding the columns locks no
 * fleet out. `report` records a verdict and never refuses. `enforce` refuses.
 */
export const RUNNER_POLICY_MODES = ['off', 'report', 'enforce'] as const;

export const DEFAULT_RUNNER_POLICY_MODE = 'off';

/**
 * Platform names as the runner DTO normalizes them (`win32` and `cygwin` become
 * `windows`), so a policy compares like with like. A test pins this list to the
 * output of the runner platform schema.
 */
export const RUNNER_POLICY_PLATFORMS = [
  'aix',
  'android',
  'darwin',
  'freebsd',
  'haiku',
  'linux',
  'openbsd',
  'sunos',
  'windows',
  'netbsd',
] as const;

export const RUNNER_COMPLIANCE_STATUSES = ['compliant', 'noncompliant', 'unknown'] as const;

/** Stable codes stored on the session; the client maps them to words. */
export const RUNNER_COMPLIANCE_REASONS = {
  versionBelowMinimum: 'version_below_minimum',
  versionUnreadable: 'version_unreadable',
  versionMissing: 'version_missing',
  platformNotAllowed: 'platform_not_allowed',
  platformMissing: 'platform_missing',
} as const;

/** Most platforms a policy may list; the enum is the real bound. */
export const RUNNER_POLICY_PLATFORMS_MAX = RUNNER_POLICY_PLATFORMS.length;

/** Longest runner version string accepted, matching the runner DTO. */
export const RUNNER_VERSION_MAX_LENGTH = 50;

/** What an organization with no policy row, or an untouched one, imposes: nothing. */
export const INERT_RUNNER_POLICY: RunnerPolicy = {
  minRunnerVersion: null,
  allowedRunnerPlatforms: null,
  runnerPolicyMode: DEFAULT_RUNNER_POLICY_MODE,
  requireVersionReport: false,
};

/** The decision when no policy applies: evaluated, nothing to flag, never refuse. */
export const RUNNER_NOT_APPLICABLE: RunnerComplianceDecision = {
  evaluated: true,
  status: null,
  reason: null,
  refuse: false,
};

/** The decision when a lookup failed: no verdict, fail open. */
export const RUNNER_NOT_EVALUATED: RunnerComplianceDecision = {
  evaluated: false,
  status: null,
  reason: null,
  refuse: false,
};

/** Semantic version with an optional `v` prefix, prerelease and build metadata. */
export const RUNNER_VERSION_PATTERN =
  /^[vV]?(\d{1,9})\.(\d{1,9})\.(\d{1,9})(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const RUNNER_NUMERIC_IDENTIFIER_PATTERN = /^\d+$/;
