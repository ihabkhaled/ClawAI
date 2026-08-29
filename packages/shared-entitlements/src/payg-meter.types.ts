import type { PaygSurface } from '@claw/shared-types';

/**
 * Everything the auth-service needs to price and gate one provider call.
 *
 * `requestId` is the idempotency key for the hold: a retried request reuses its
 * reservation instead of taking a second one. It must be stable across retries
 * of the SAME logical call and distinct between different calls — a compare run
 * fanning out to five lanes needs five ids, and a tool loop needs one per turn,
 * or N paid turns get billed as one.
 */
export type PaygReserveInput = {
  userId: string;
  requestId: string;
  provider: string;
  model: string;
  surface: PaygSurface;
  workflow?: string;
  promptTokens: number;
  cachedPromptTokens?: number;
  requestedMaxOutputTokens: number;
};

/**
 * The hold, as every call site sees it.
 *
 * `maxOutputTokens` is present on BOTH branches deliberately. An unmetered call
 * still gets back the ceiling it should use, so a caller never has to ask "was
 * this metered?" before deciding what to send the provider — it always sends
 * `hold.maxOutputTokens`. Making the field conditional is what would let a
 * clamped ceiling be silently ignored on the branch that matters.
 */
export type PaygHold = {
  metered: boolean;
  /** ALWAYS send this to the provider. Never the value you asked for. */
  maxOutputTokens: number;
  /** True when the ceiling was reduced to fit the balance. The user must be told. */
  clamped: boolean;
  reservationId: string | null;
  heldMicroUsd: number;
  availableAfterMicroUsd: number;
  reason: PaygUnmeteredReason | null;
};

export type PaygUnmeteredReason =
  | 'NOT_PAYG'
  | 'METERING_DISABLED'
  | 'ADMIN_BYPASS'
  /** auth-service was unreachable AND the provider is PAYG-exempt, so the call proceeds unmetered. */
  | 'METER_UNAVAILABLE_EXEMPT';

/** Measured usage handed back after the provider answered. */
export type PaygFinalizeUsage = {
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  reasoningTokens: number;
};

export type PaygFinalizeCalls = {
  toolCalls?: number;
  searchCalls?: number;
};

export type PaygReleaseReason = 'PROVIDER_ERROR' | 'CANCELLED' | 'TIMEOUT';

export type PaygMeterOptions = {
  /** Base URL of auth-service, e.g. https://auth-service:4001 */
  authServiceUrl: string;
  timeoutMs?: number;
  /**
   * Providers that never cost money, so a meter outage must not block them.
   * Defaults to `PAYG_EXEMPT_PROVIDERS`. The metered set is NOT configured here
   * on purpose — that decision is the auth-service's alone (ADR-082).
   */
  exemptProviders?: readonly string[];
};
