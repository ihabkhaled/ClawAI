export type ProviderHealthState = {
  consecutiveFailures: number;
  /** Epoch ms of the last transition to open (or re-open after a failed probe). */
  openedAt: number;
  /** A half-open probe is in flight. */
  probing: boolean;
};

export type ProviderCounters = { ok: number; failed: number; timeout: number; skipped: number };
