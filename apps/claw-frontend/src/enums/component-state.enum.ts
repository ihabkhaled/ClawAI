/** A status component's state. Mirrors health-service's `ComponentState`. */
export enum ComponentState {
  UP = 'up',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown',
  /** Switched off on purpose (a scraper sidecar not enabled): never an outage. */
  DISABLED = 'disabled',
}
