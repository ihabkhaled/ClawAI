/**
 * What a window is counted against: the client address nginx saw, or the
 * pairing code being polled (so one device polling too fast slows only itself).
 */
export enum AgentAuthRateLimitScope {
  IP = 'ip',
  PAIRING_CODE = 'pairing-code',
}
