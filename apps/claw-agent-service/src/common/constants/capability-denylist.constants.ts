/**
 * V2 Stream 11 — security/privacy/sandboxing.
 *
 * Hard denylist of capability (class, operation, target) tuples that
 * the framework refuses regardless of policy. Even an org admin with
 * a wildcard ALLOW policy cannot override these — the
 * CapabilityRiskService short-circuits with DENIED at the very top of
 * the assessment.
 *
 * Rationale: these are operations that have no legitimate use case in
 * the desktop-agent product context, OR whose blast radius is so
 * extreme that they constitute a foot-gun no operator should be able
 * to unlock without changing source.
 *
 * Each entry has a short justification — keep the table tight.
 */

export type DenylistEntry = {
  capabilityClass: string;
  capabilityOperation: string;
  /** Optional regex applied to the target descriptor's `command`, `path`, or `binaryPath` */
  targetRegex?: RegExp;
  reason: string;
};

export const CAPABILITY_HARD_DENYLIST: ReadonlyArray<DenylistEntry> = Object.freeze([
  {
    capabilityClass: 'FILESYSTEM',
    capabilityOperation: 'DELETE',
    targetRegex: /^\/(?:|home|Users|root)$/,
    reason: 'Refuses delete of $HOME / / /root — recovery from this is not possible',
  },
  {
    capabilityClass: 'FILESYSTEM',
    capabilityOperation: 'DELETE',
    targetRegex: /^[A-Z]:\\(?:Windows|Users)\\?$/i,
    reason: 'Refuses delete of C:\\Windows or C:\\Users — recovery from this is not possible',
  },
  {
    capabilityClass: 'TERMINAL',
    capabilityOperation: 'SPAWN',
    targetRegex: /\brm\s+-rf\s+\/(?:\s|$)/,
    reason: 'The literal rm -rf / is a foot-gun even for power users',
  },
  {
    capabilityClass: 'TERMINAL',
    capabilityOperation: 'SPAWN',
    targetRegex: /\b:\(\)\s*\{\s*:\|:&\s*\}\s*;\s*:/,
    reason: 'Bash fork bomb',
  },
  {
    capabilityClass: 'PROCESS',
    capabilityOperation: 'KILL',
    targetRegex: /\bpid=\s*1\b/,
    reason: 'Refuses to kill PID 1 (would crash the OS)',
  },
  {
    capabilityClass: 'BROWSER',
    capabilityOperation: 'NAVIGATE',
    targetRegex: /^(?:file|chrome|about|javascript):/i,
    reason: 'Refuses non-http(s) URL schemes that bypass the policy gate',
  },
  // SYSTEM — SUSPEND is allowed via approval but blanket-denied via
  // policy by default; only listed here for completeness.
]);
