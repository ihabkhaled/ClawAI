/**
 * Reads `publicConfig.baseUrl` from a strategy's DB row, falling back to the
 * built-in default. Only http(s) values are accepted — a config row is
 * admin-written, but a typo like `ftp://` should fail closed to the default,
 * not produce a malformed request.
 */
export function resolveStrategyBaseUrl(
  strategyConfig: Record<string, unknown> | undefined,
  fallback: string | undefined,
): string {
  const configured = strategyConfig?.['baseUrl'];
  if (typeof configured === 'string' && /^https?:\/\//u.test(configured)) {
    return configured;
  }
  if (fallback === undefined) {
    throw new Error('Strategy has no base URL configured');
  }
  return fallback;
}

/** Joins a base URL and a path without doubling or dropping the slash. */
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/u, '')}/${path.replace(/^\/+/u, '')}`;
}
