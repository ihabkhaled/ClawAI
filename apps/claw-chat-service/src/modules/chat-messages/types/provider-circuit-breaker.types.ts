/** One provider's breaker. `probeAt` set = a half-open probe is in flight. */
export type ProviderBreakerState = {
  openUntil: number;
  probeAt: number | null;
};
