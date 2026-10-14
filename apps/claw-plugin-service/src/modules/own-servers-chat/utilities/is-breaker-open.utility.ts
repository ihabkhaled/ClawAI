import {
  BREAKER_FAILURE_THRESHOLD,
  BREAKER_HALF_OPEN_AFTER_MS,
} from '../../mcp-servers/constants/mcp.constants';

/**
 * True while a server's circuit breaker is open. Read-only on purpose: resolving tools must not
 * claim the half-open probe (only a real call does). After the half-open delay the tools are
 * offered again and the first call decides.
 */
export function isBreakerOpen(
  server: { failureCount: number; breakerOpenedAt: Date | null },
  now: number = Date.now(),
): boolean {
  return (
    server.breakerOpenedAt !== null &&
    server.failureCount >= BREAKER_FAILURE_THRESHOLD &&
    now - server.breakerOpenedAt.getTime() < BREAKER_HALF_OPEN_AFTER_MS
  );
}
