/** The uploader's plan answer for one video (ADR-122, `maxVideoSeconds`). */
export enum VideoPlanDecision {
  ALLOWED = 'ALLOWED',
  /** Longer than `maxVideoSeconds`. No paid step may run. */
  TOO_LONG = 'TOO_LONG',
  /** `maxVideoSeconds = 0`: video processing is off for this plan. */
  DISABLED = 'DISABLED',
  /** auth-service could not answer: the paid step fails closed. */
  ENTITLEMENTS_UNAVAILABLE = 'ENTITLEMENTS_UNAVAILABLE',
}
