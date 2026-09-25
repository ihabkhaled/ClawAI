/** What the shared breaker answered for one call (ADR-125 addendum). */
export enum ProviderBreakerAdmission {
  /** No breaker for this provider: call it. */
  CLOSED = 'CLOSED',
  /** Open, or another replica already holds the half-open probe: skip it. */
  OPEN = 'OPEN',
  /** This call is THE half-open probe across every replica. */
  PROBE = 'PROBE',
}
