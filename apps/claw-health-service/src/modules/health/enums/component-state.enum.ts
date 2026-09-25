/**
 * The state of one status-page component.
 *
 * UP: every service in it answered. DEGRADED: some did not. DOWN: none did.
 * UNKNOWN: nothing was measured. DISABLED: switched off on purpose (a
 * scraper sidecar an admin has not enabled) — never counted as an outage.
 */
export enum ComponentState {
  UP = 'up',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown',
  DISABLED = 'disabled',
}
