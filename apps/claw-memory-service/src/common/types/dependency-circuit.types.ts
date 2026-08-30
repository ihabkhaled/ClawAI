/** Failure count, open-until deadline, and half-open trial state. */
export type CircuitState = {
  consecutiveFailures: number;
  openUntil: number;
  /**
   * True while a single trial call is testing whether the dependency recovered.
   *
   * Without this, every caller waiting when the open window elapses is let
   * through at once — measured at sixteen concurrent generations, that is
   * sixteen ten-second calls fired simultaneously at a dependency that is still
   * down, which is exactly the burst the breaker exists to prevent.
   */
  probeInFlight: boolean;
};
