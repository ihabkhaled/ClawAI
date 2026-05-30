// Mirrors @claw/shared-types RuntimeProbeStatus. The frontend never imports
// directly from shared-types — values must stay in sync with
// packages/shared-types/src/runtime-progress/runtime-probe-status.enum.ts.
export enum RuntimeProbeStatus {
  REACHABLE = 'REACHABLE',
  UNREACHABLE = 'UNREACHABLE',
  DEGRADED = 'DEGRADED',
  BINARY_MISSING = 'BINARY_MISSING',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
}
