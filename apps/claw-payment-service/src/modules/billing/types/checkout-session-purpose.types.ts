import type { CheckoutSession } from '../../../generated/prisma';

/**
 * Money fields every purchase-bearing session has, whatever it is buying.
 *
 * A `PAYMENT_METHOD_SETUP` session also carries an amount (the refundable
 * verification charge), so a non-null amount alone does NOT identify a
 * purchase — the purpose check is what does, and every narrowing below keeps it.
 */
export type PayableCheckoutField =
  'baseAmountMinor' | 'baseCurrency' | 'chargeAmountMinor' | 'chargeCurrency';

export type SubscriptionCheckoutField =
  'planId' | 'planSlug' | 'planPriceVersionId' | 'billingInterval' | PayableCheckoutField;

export type CreditTopupCheckoutField =
  'creditPackageId' | 'creditPackageVersionId' | 'creditMicroUsd' | PayableCheckoutField;

/**
 * Any session that represents a real purchase — a subscription or a credit
 * top-up, never a card-vaulting setup.
 *
 * Exists so the reconciliation sweep can read a lost callback back from the
 * gateway for BOTH purchase kinds. Narrowing that path to subscriptions alone
 * would quarantine a paid top-up whose callback never arrived, which is the one
 * outcome reconciliation exists to prevent: money taken, nothing delivered.
 */
export type PayableCheckoutSession = CheckoutSession & {
  [Field in PayableCheckoutField]-?: NonNullable<CheckoutSession[Field]>;
};

export type SubscriptionCheckoutSession = CheckoutSession & {
  [Field in SubscriptionCheckoutField]-?: NonNullable<CheckoutSession[Field]>;
};

/**
 * A completed-or-pending purchase of PAYG credit.
 *
 * The plan fields are absent by construction and the credit fields are present
 * by construction — the database CHECK constraint added in
 * `20260829120200_add_credit_topup_checkout` makes any other combination
 * unstorable, so this narrowing is a projection of a database guarantee rather
 * than an application convention.
 */
export type CreditTopupCheckoutSession = CheckoutSession & {
  [Field in CreditTopupCheckoutField]-?: NonNullable<CheckoutSession[Field]>;
};
