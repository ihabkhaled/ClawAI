export enum HealthCheckStatus {
  OK = 'ok',
  DEGRADED = 'degraded',
  DOWN = 'down',
}

export enum ServiceStatus {
  UP = 'up',
  DOWN = 'down',
  /** Not measured: the dependency is turned off (e.g. CLAMAV_ENABLED=false). */
  DISABLED = 'disabled',
}
