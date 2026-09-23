/**
 * The state of one status-page component.
 *
 * UP: every service in it answered. DEGRADED: some did not. DOWN: none did.
 * UNKNOWN: nothing was measured.
 */
export enum ComponentState {
  UP = 'up',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown',
}
