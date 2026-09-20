/**
 * Environment variables that name a service this process may call. Their hosts
 * become the allowlist for `httpRequest` (alert #58).
 */
export const INTERNAL_HOST_ENV_SUFFIXES: readonly string[] = [
  '_SERVICE_URL',
  '_BASE_URL',
  '_API_URL',
  '_ENDPOINT',
];

/**
 * Addresses that are never a service call, whatever the configuration says.
 *
 * The cloud metadata endpoints hand out instance credentials to anything that
 * can reach them, which is the prize in most SSRF reports.
 */
export const FORBIDDEN_REQUEST_HOSTS: readonly string[] = [
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.goog',
  'fd00:ec2::254',
];
