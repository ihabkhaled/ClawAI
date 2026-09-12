import {
  DISPLAY_ROUNDING_POLICY_VERSION,
  type DisplayCurrencyContext,
  DisplayFxSource,
  DisplayRoundingPolicy,
  type LocalizedMoneyView,
} from '@claw/shared-types';

import { applyDisplayRoundingPolicy } from './commercial-rounding.utility';
import { convertMinorForDisplay } from './display-currency.utility';

// The single place a canonical amount becomes a displayable one.
//
// Every money surface calls this and nothing else. The alternative — each page
// multiplying by a rate and formatting the result — is how "approximate" gets
// forgotten on one card, how a rounding policy diverges between the pricing
// page and the checkout summary, and how a display amount eventually finds its
// way into a request body.
//
// It cannot fail. Conversion problems degrade to the canonical amount, because
// a pricing page that renders USD is working and a pricing page that renders
// nothing is an outage.
export function toLocalizedMoneyView(
  canonicalAmountMinor: number,
  canonicalCurrency: string,
  context: DisplayCurrencyContext | null,
  policy: DisplayRoundingPolicy = DisplayRoundingPolicy.COMMERCIAL_PRICE,
): LocalizedMoneyView {
  const fx = context?.fx ?? null;
  const targetCurrency = context?.currencyCode ?? canonicalCurrency;

  // Same currency, or no rate: show the canonical figure exactly as stored.
  // Not "approximate" — there is nothing approximate about the real price.
  if (fx === null || targetCurrency === canonicalCurrency || fx.quoteCurrency !== targetCurrency) {
    return {
      canonicalAmountMinor,
      canonicalCurrency,
      displayAmountMinor: canonicalAmountMinor,
      displayCurrency: canonicalCurrency,
      approximate: false,
      conversionAvailable: targetCurrency === canonicalCurrency,
      fxAsOf: null,
      fxSource:
        targetCurrency === canonicalCurrency
          ? DisplayFxSource.IDENTITY
          : DisplayFxSource.USD_FALLBACK,
      roundingPolicy: policy,
      roundingPolicyVersion: DISPLAY_ROUNDING_POLICY_VERSION,
    };
  }

  try {
    const converted = convertMinorForDisplay(
      canonicalAmountMinor,
      canonicalCurrency,
      targetCurrency,
      fx.rateScaled,
    );
    return {
      canonicalAmountMinor,
      canonicalCurrency,
      displayAmountMinor: applyDisplayRoundingPolicy(converted, targetCurrency, policy),
      displayCurrency: targetCurrency,
      approximate: true,
      conversionAvailable: true,
      fxAsOf: fx.asOf,
      fxSource: fx.source,
      roundingPolicy: policy,
      roundingPolicyVersion: DISPLAY_ROUNDING_POLICY_VERSION,
    };
  } catch {
    // An overflow or an unknown exponent is a bug worth fixing, not a reason to
    // break a billing page. Fall back to the canonical amount, which is always
    // correct and always renderable.
    return {
      canonicalAmountMinor,
      canonicalCurrency,
      displayAmountMinor: canonicalAmountMinor,
      displayCurrency: canonicalCurrency,
      approximate: false,
      conversionAvailable: false,
      fxAsOf: null,
      fxSource: DisplayFxSource.USD_FALLBACK,
      roundingPolicy: policy,
      roundingPolicyVersion: DISPLAY_ROUNDING_POLICY_VERSION,
    };
  }
}
