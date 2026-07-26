import { BillingGateway } from '@claw/shared-types';

/**
 * The currency a gateway settles in, or null when it settles in the plan's own
 * currency.
 *
 * A switch rather than a lookup table: an exhaustive switch means adding a
 * gateway to the enum is a compile error here, instead of a silent `undefined`
 * that would skip FX conversion and charge an EGP customer a USD figure.
 */
export function resolveSettlementCurrency(gateway: BillingGateway): string | null {
  switch (gateway) {
    case BillingGateway.PAYMOB:
      return 'EGP';
    case BillingGateway.PAYPAL:
      return null;
  }
}
