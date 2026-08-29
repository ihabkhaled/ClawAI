import { PAYG_EXEMPT_PROVIDERS } from '@claw/shared-constants';
import { hasUsablePricing } from '@claw/shared-utilities';

import { type PaygRateSnapshot } from '../types/credit.types';

/**
 * Providers that run on hardware the operator or the user already owns.
 *
 * Compared case-insensitively because a provider reaches this function as free
 * text from an HTTP body; `ollama` and `OLLAMA` must not classify differently.
 */
export function isExemptProvider(provider: string): boolean {
  const normalized = provider.trim().toUpperCase();
  return PAYG_EXEMPT_PROVIDERS.some((exempt) => exempt.toUpperCase() === normalized);
}

/**
 * The single, load-bearing assertion of this whole feature.
 *
 * `ModelCostService.unpricedSnapshot` answers a LOCAL provider with
 * `isPriced: true` at a rate of zero, because a model on the user's own GPU
 * genuinely costs the platform nothing. If a metered provider ever resolved
 * through that path it would come back priced, at zero, and every request to it
 * would be free — an unbounded liability that looks exactly like a healthy
 * lookup in the logs.
 *
 * So a PAYG provider that answers from the local-compute fallback is treated as
 * UNPRICED (blocked), never as free. This is asserted here rather than trusted
 * of routing-service, because the two services deploy independently and the day
 * someone adds a provider to LOCAL_COST_PROVIDERS is not the day anyone
 * re-reads this file.
 */
export function isUsablePaygRate(rate: PaygRateSnapshot): boolean {
  if (rate.isLocalComputeFallback) {
    return false;
  }
  return rate.isPriced && hasUsablePricing(rate.rates);
}

/**
 * `provider ∉ EXEMPT  AND  connectorPolicy(provider) is PAYG`.
 *
 * The rate check is deliberately NOT folded in: an unpriced model on a metered
 * provider must be refused with `PAYG_MODEL_UNPRICED`, which is a different
 * outcome from "this provider is free" and produces different UI. Merging them
 * would turn a launch-blocking pricing gap into a silent giveaway.
 *
 * A provider ABSENT from the policy map falls back to `defaultIsPayg`, which
 * the caller derives from `PAYG_DEFAULT_PROVIDERS`. Absent means connector
 * -service has no row for it — a provider nobody has classified — and for a
 * known paid cloud provider the conservative answer is "metered".
 */
export function isMeteredProvider(
  provider: string,
  policy: Readonly<Record<string, boolean>>,
  defaultIsPayg: boolean,
): boolean {
  if (isExemptProvider(provider)) {
    return false;
  }
  const normalized = provider.trim().toUpperCase();
  const declared = Object.entries(policy).find(([key]) => key.trim().toUpperCase() === normalized);
  return declared === undefined ? defaultIsPayg : declared[1];
}
