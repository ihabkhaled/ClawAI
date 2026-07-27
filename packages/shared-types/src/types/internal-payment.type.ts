import type { BillingGateway } from '../enums/billing-gateway.enum';
import type { BillingInterval } from '../enums/billing-interval.enum';
import type { PaymentTransactionStatus } from '../enums/payment-transaction-status.enum';
import type { PaymentTransactionType } from '../enums/payment-transaction-type.enum';
import type { SubscriptionStatus } from '../enums/subscription-status.enum';

export type InternalPaymentStatus = {
  paymentTransactionId: string;
  subscriptionId: string | null;
  userId: string;
  gateway: BillingGateway;
  type: PaymentTransactionType;
  status: PaymentTransactionStatus;
  amountMinor: number;
  currency: string;
  capturedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InternalSubscriptionStatus = {
  subscriptionId: string;
  userId: string;
  planId: string;
  planSlug: string;
  planPriceVersionId: string;
  gateway: BillingGateway;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  entitlementValidUntil: string;
  gracePeriodEndsAt: string | null;
  updatedAt: string;
};

type AuthoritativeBillingEntitlementBase = {
  userId: string;
  subscriptionId: string | null;
  planSlug: string;
  effectiveAt: string;
  entitlementValidUntil: string;
};

export type AuthoritativeBillingEntitlement = AuthoritativeBillingEntitlementBase &
  (
    | {
        hasPaidEntitlement: true;
        planId: string;
        planPriceVersionId: string;
        subscriptionStatus: SubscriptionStatus;
      }
    | {
        hasPaidEntitlement: false;
        planId: null;
        planPriceVersionId: null;
        subscriptionStatus: SubscriptionStatus | null;
      }
  );
