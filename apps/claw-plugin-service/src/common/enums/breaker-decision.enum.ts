/** Whether a call to a server may go ahead. PROBE is the single trial call let through after the cool-down. */
export enum BreakerDecision {
  ALLOW = 'ALLOW',
  PROBE = 'PROBE',
  OPEN = 'OPEN',
}
