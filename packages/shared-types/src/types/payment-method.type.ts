import type { BillingGateway } from '../enums/billing-gateway.enum';
import type { PaymentMethodStatus } from '../enums/payment-method-status.enum';

// The ONLY payment-method shape that may cross a service or network boundary.
//
// It is structurally incapable of carrying card data: there is no field for a
// PAN, CVV, expiry-with-full-number, or provider token. The encrypted gateway
// token stays inside the payment service's database and is decrypted for the
// shortest possible window when charging.
export type PaymentMethodView = {
  id: string;
  gateway: BillingGateway;
  status: PaymentMethodStatus;
  // e.g. 'CARD', 'PAYPAL_BALANCE'.
  type: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  createdAt: string;
};
