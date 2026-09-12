import type {
  DisplayCurrencyContext,
  LocalizedMoneyView,
  DisplayRoundingPolicy,
} from '@claw/shared-types';

export type DisplayCurrencyContextValue = {
  // Null while the context has not resolved. Every consumer renders canonical
  // amounts in that state rather than waiting, so a slow FX provider costs a
  // tilde and never a blank price.
  context: DisplayCurrencyContext | null;
  // The currency actually being rendered, which is USD whenever conversion is
  // unavailable — not the currency the visitor asked for.
  currency: string;
  // True while a switch is in flight, for the selector's own affordance only.
  isSwitching: boolean;
  selectCurrency: (currency: string) => void;
  localize: (
    canonicalAmountMinor: number,
    canonicalCurrency: string,
    policy?: DisplayRoundingPolicy,
  ) => LocalizedMoneyView;
};

export type DisplayCurrencyProviderProps = {
  children: React.ReactNode;
  // Resolved on the server for the first paint. Without it the page renders USD
  // and then swaps to EGP after hydration, which is the flash this avoids.
  initialContext: DisplayCurrencyContext | null;
};

export type CurrencySwitcherOption = {
  code: string;
  label: string;
  isPopular: boolean;
};

export type CurrencySwitcherState = {
  options: readonly CurrencySwitcherOption[];
  activeCurrency: string;
  detectedCountry: string | null;
  isAutomatic: boolean;
  isSwitching: boolean;
  selectCurrency: (currency: string) => void;
  selectAutomatic: () => void;
};

export type CurrencySwitcherOptionItemProps = {
  code: string;
  label: string;
  isActive: boolean;
  onSelect: (code: string) => void;
};

export type LocalizedMoneyDisplay = {
  view: LocalizedMoneyView;
  text: string;
  // The canonical figure, for a secondary "Converted from USD 10.00" line.
  // Null when nothing was converted and the second line would be noise.
  canonicalText: string | null;
  isApproximate: boolean;
};

export type MoneyFormatter = (
  canonicalAmountMinor: number,
  canonicalCurrency: string,
  policy?: DisplayRoundingPolicy,
) => string;

export type CurrencyPreferenceCardProps = {
  activeCurrency: string;
  isAutomatic: boolean;
  detectedCountry: string | null;
};
