import { type CurrencyPreferenceMode } from '@claw/shared-types';

// Everything the resolver is allowed to consider, gathered by the caller.
//
// The resolver takes headers rather than a request object so it can be tested
// against a spoofed header set without a running HTTP stack - which is exactly
// the test that matters for a signal this security-sensitive.
export type DisplayCurrencyRequest = {
  headers: Record<string, string | string[] | undefined>;
  // From the authenticated user's saved preference, when there is one.
  preferenceMode?: CurrencyPreferenceMode | null;
  preferredCurrencyCode?: string | null;
  preferredCountryCode?: string | null;
  // From the anonymous first-party cookie.
  anonymousCurrencyCode?: string | null;
  // Browser locale/timezone guess. The weakest signal: the client writes it.
  clientCountryHint?: string | null;
};
