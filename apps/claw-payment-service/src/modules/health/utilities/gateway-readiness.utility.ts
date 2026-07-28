import type { AppConfigType } from '../../../app/config/app.config';

// A gateway counts as configured only when EVERY credential it needs is
// present. Half-configuration is treated as "off" throughout the service: a
// checkout that reaches PayPal without a webhook id can be paid but never
// verified, and a Paymob intention without an HMAC secret produces callbacks
// that cannot be authenticated. Both are worse than the gateway being absent.

export function isPaypalConfigured(config: AppConfigType): boolean {
  return (
    isPresent(config.PAYPAL_CLIENT_ID) &&
    isPresent(config.PAYPAL_CLIENT_SECRET) &&
    isPresent(config.PAYPAL_WEBHOOK_ID)
  );
}

export function isPaymobConfigured(config: AppConfigType): boolean {
  return (
    isPresent(config.PAYMOB_SECRET_KEY) &&
    isPresent(config.PAYMOB_PUBLIC_KEY) &&
    isPresent(config.PAYMOB_API_KEY) &&
    isPresent(config.PAYMOB_HMAC_SECRET) &&
    isPresent(config.PAYMOB_CARD_INTEGRATION_ID)
  );
}

// Treats an empty or whitespace-only string as absent. A blank value in a .env
// file is a common way to "unset" a variable and must not read as configured.
export function isPresent(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}
