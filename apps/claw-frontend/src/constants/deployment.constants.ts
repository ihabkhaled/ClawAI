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
