export const DEPLOYMENT_PHASES = [
  'preparing',
  'planning',
  'building',
  'deploying',
  'reloading_nginx',
  'verifying',
  'finalizing',
  'completed',
] as const;

/** A production commit SHA as GitHub spells it — exactly 40 hex characters. */
export const DEPLOYMENT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

/** Upper bound for the manual SHA field, matching the pattern above. */
export const DEPLOYMENT_SHA_MAX_LENGTH = 40;

/** owner/repo, as GitHub spells it in a repository URL. */
export const DEPLOYMENT_REPOSITORY_PATTERN = /^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;

/** A plain branch name — no globs, no whitespace. */
export const DEPLOYMENT_REF_PATTERN = /^[A-Za-z0-9._/-]{1,255}$/;

/** Matches the server's lower bound so the form rejects a truncated paste. */
export const DEPLOYMENT_TOKEN_MIN_LENGTH = 20;

/** Poll cadence for live Actions progress while a run is executing. */
export const DEPLOYMENT_RUN_POLL_ACTIVE_MS = 5_000;

/** Poll cadence once the run has finished — slow enough to be nearly free. */
export const DEPLOYMENT_RUN_POLL_IDLE_MS = 60_000;

/**
 * Remediation steps per situation, in the order an operator should try them:
 * cheapest and most reversible first, and never "just re-run it" before the
 * failure has been read.
 */
export const DEPLOYMENT_TROUBLESHOOTING_STEPS = {
  abandoned: ['readLog', 'clearStuck', 'redeploy'],
  stale: ['checkRun', 'readLog', 'clearStuck', 'redeploy'],
  failed: ['readLog', 'fixOrRollback', 'redeploy'],
  unconfigured: ['configureCredentials', 'checkTokenScope'],
} as const;
