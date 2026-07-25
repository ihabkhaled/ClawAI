import type { AppConfigType } from '../../../../app/config/app.config';
import { isPaymobConfigured, isPaypalConfigured, isPresent } from '../gateway-readiness.utility';

// Bound to a variable rather than written as a literal argument. `eslint --fix`
// (unicorn/no-useless-undefined) rewrites `isPresent(undefined)` into
// `isPresent()`, which changes what the test asserts — and here broke the build,
// since the parameter is required. A variable is immune to that rewrite.
const ABSENT_VALUE: string | undefined = undefined;

function buildConfig(overrides: Partial<AppConfigType>): AppConfigType {
  return {
    PAYPAL_CLIENT_ID: 'client-id',
    PAYPAL_CLIENT_SECRET: 'client-secret',
    PAYPAL_WEBHOOK_ID: 'webhook-id',
    PAYPAL_ENV: 'sandbox',
    PAYMOB_SECRET_KEY: 'secret',
    PAYMOB_PUBLIC_KEY: 'public',
    PAYMOB_API_KEY: 'api',
    PAYMOB_HMAC_SECRET: 'hmac',
    PAYMOB_CARD_INTEGRATION_ID: '12345',
    PAYMOB_CURRENCY: 'EGP',
    ...overrides,
  } as AppConfigType;
}

describe('gateway-readiness.utility', () => {
  describe('isPresent', () => {
    it('accepts a non-empty value', () => {
      expect(isPresent('x')).toBe(true);
    });

    it('rejects undefined', () => {
      expect(isPresent(ABSENT_VALUE)).toBe(false);
    });

    it('rejects an empty or whitespace-only value', () => {
      // A blank line in .env is a common way to "unset" a variable; it must not
      // read as configured.
      expect(isPresent('')).toBe(false);
      expect(isPresent('   ')).toBe(false);
      expect(isPresent('\t\n')).toBe(false);
    });
  });

  describe('isPaypalConfigured', () => {
    it('accepts a complete credential set', () => {
      expect(isPaypalConfigured(buildConfig({}))).toBe(true);
    });

    it('rejects a missing client id', () => {
      expect(isPaypalConfigured(buildConfig({ PAYPAL_CLIENT_ID: undefined }))).toBe(false);
    });

    it('rejects a missing client secret', () => {
      expect(isPaypalConfigured(buildConfig({ PAYPAL_CLIENT_SECRET: undefined }))).toBe(false);
    });

    it('rejects a missing webhook id', () => {
      // Without the webhook id a payment can be taken but never verified —
      // strictly worse than the gateway being off.
      expect(isPaypalConfigured(buildConfig({ PAYPAL_WEBHOOK_ID: undefined }))).toBe(false);
    });

    it('rejects a blanked-out credential', () => {
      expect(isPaypalConfigured(buildConfig({ PAYPAL_CLIENT_SECRET: '  ' }))).toBe(false);
    });
  });

  describe('isPaymobConfigured', () => {
    it('accepts a complete credential set', () => {
      expect(isPaymobConfigured(buildConfig({}))).toBe(true);
    });

    it('rejects a missing HMAC secret', () => {
      // Callbacks would be unauthenticatable, so the gateway must read as off.
      expect(isPaymobConfigured(buildConfig({ PAYMOB_HMAC_SECRET: undefined }))).toBe(false);
    });

    it('rejects a missing card integration id', () => {
      expect(isPaymobConfigured(buildConfig({ PAYMOB_CARD_INTEGRATION_ID: undefined }))).toBe(
        false,
      );
    });

    it('rejects a missing secret or public key', () => {
      expect(isPaymobConfigured(buildConfig({ PAYMOB_SECRET_KEY: undefined }))).toBe(false);
      expect(isPaymobConfigured(buildConfig({ PAYMOB_PUBLIC_KEY: undefined }))).toBe(false);
    });

    it('does not require the legacy API key, which newer merchants lack', () => {
      expect(isPaymobConfigured(buildConfig({ PAYMOB_API_KEY: undefined }))).toBe(true);
    });
  });
});
