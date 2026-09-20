import { EXTERNAL_ENDPOINT_HOSTS } from '@claw/shared-utilities';

import { PAYMOB_BASE_URL } from '../paymob/constants/paymob.constants';
import {
  PAYPAL_LIVE_BASE_URL,
  PAYPAL_SANDBOX_BASE_URL,
} from '../paypal/constants/paypal.constants';

/**
 * The shared HTTP client refuses any host that is not on its allowlist
 * (CodeQL alert #58). The gateway hosts have no environment variable — they are
 * constants — so `EXTERNAL_ENDPOINT_HOSTS` repeats them, because a shared
 * package may not import a service.
 *
 * Two copies of a fact drift. This test is the thing that stops the drift from
 * reaching production as "refusing a host this service does not call" in the
 * middle of a checkout.
 */
describe('payment gateway hosts are on the shared HTTP allowlist', () => {
  it.each([PAYMOB_BASE_URL, PAYPAL_SANDBOX_BASE_URL, PAYPAL_LIVE_BASE_URL])(
    '%s is allowlisted',
    (baseUrl) => {
      expect(EXTERNAL_ENDPOINT_HOSTS.has(new URL(baseUrl).host)).toBe(true);
    },
  );
});
