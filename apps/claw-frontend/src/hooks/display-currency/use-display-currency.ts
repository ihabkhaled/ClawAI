'use client';

import {
  DISPLAY_ROUNDING_POLICY_VERSION,
  DisplayFxSource,
  DisplayRoundingPolicy,
} from '@claw/shared-types';
import { useContext } from 'react';

import { DisplayCurrencyReactContext } from '@/lib/display-currency/display-currency-context';
import type { DisplayCurrencyContextValue } from '@/types/display-currency.types';

/**
 * The one way a component reaches the display currency.
 *
 * Falls back to a canonical-USD value rather than throwing when no provider is
 * mounted. A money component rendered outside the provider — in a test, a
 * Storybook, a shell that has not been wired yet — should show the real price,
 * not crash the tree.
 */
export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const value = useContext(DisplayCurrencyReactContext);
  return value ?? CANONICAL_FALLBACK;
}

const CANONICAL_FALLBACK: DisplayCurrencyContextValue = {
  context: null,
  currency: 'USD',
  isSwitching: false,
  selectCurrency: () => undefined,
  localize: (canonicalAmountMinor, canonicalCurrency) => ({
    canonicalAmountMinor,
    canonicalCurrency,
    displayAmountMinor: canonicalAmountMinor,
    displayCurrency: canonicalCurrency,
    approximate: false,
    conversionAvailable: true,
    fxAsOf: null,
    fxSource: DisplayFxSource.IDENTITY,
    roundingPolicy: DisplayRoundingPolicy.COMMERCIAL_PRICE,
    roundingPolicyVersion: DISPLAY_ROUNDING_POLICY_VERSION,
  }),
};
