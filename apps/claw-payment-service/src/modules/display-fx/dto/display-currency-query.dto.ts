import { TIMEZONE_HINT_MAX_LENGTH } from '@claw/shared-constants';
import { z } from 'zod';

// Query validation for the public display-currency endpoint.
//
// Every field is bounded and allowlist-checked. An unbounded currency string
// would reach a Redis key namespace and a provider URL, which turns a pricing
// convenience into a cache-cardinality attack and an SSRF attempt in one.
export const displayCurrencyQuerySchema = z.object({
  // An explicit choice for this request: the anonymous cookie's value, or the
  // selector the visitor just used. Refined against the display allowlist by
  // the service, so an unknown code degrades to detection rather than a 400.
  currency: z.string().trim().max(8).optional(),
  // The browser's IANA time zone ("Africa/Cairo"), or a bare country code from
  // an older client. The weakest signal and treated as such — but the ONLY one
  // that works when the request never crossed the internet, which is every
  // local install and every corporate NAT.
  countryHint: z.string().trim().max(TIMEZONE_HINT_MAX_LENGTH).optional(),
});

export type DisplayCurrencyQueryDto = z.infer<typeof displayCurrencyQuerySchema>;
