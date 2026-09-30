import type { BillingInterval } from '@/enums/billing.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type { PlanView } from '@/types/plan.types';
import type { UserProfile } from '@/types/user.types';

export type AdminPlanPriceVersion = {
  id: string;
  planId: string;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  version: number;
  isActive: boolean;
  effectiveFrom: string;
  retiredAt: string | null;
  createdAt: string;
};

export type PublishAdminPlanPriceRequest = {
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
};

/** A plan's term discounts, in basis points (2000 = 20%). */
export type AdminPlanIntervalDiscounts = {
  quarterlyDiscountBps: number;
  semiannualDiscountBps: number;
  yearlyDiscountBps: number;
};

/** The discounts and the ACTIVE price per interval, as the auth service reports them. */
export type AdminPlanIntervalPricing = {
  planId: string;
  discounts: AdminPlanIntervalDiscounts;
  prices: AdminPlanPriceVersion[];
};

export type SetAdminPlanIntervalDiscountsRequest = AdminPlanIntervalDiscounts;

/** The three percent fields, as the admin typed them. */
export type IntervalDiscountInputs = {
  quarterly: string;
  semiannual: string;
  yearly: string;
};

export type IntervalDiscountField = keyof IntervalDiscountInputs;

export type AdminPriceSubscriberCount = {
  planPriceVersionId: string;
  count: number;
};

export type UseAdminPlanPricesResult = {
  t: TranslateFunction;
  locale: string;
  user: UserProfile | null;
  plan: PlanView | null;
  prices: AdminPlanPriceVersion[];
  subscriberCounts: ReadonlyMap<string, number>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSaving: boolean;
  saveError: Error | null;
  currency: string;
  amount: string;
  discountInputs: IntervalDiscountInputs;
  discountsError: string | null;
  isSavingDiscounts: boolean;
  setDiscountInput: (field: IntervalDiscountField, value: string) => void;
  saveDiscounts: () => void;
  setCurrency: (value: string) => void;
  setAmount: (value: string) => void;
  publish: () => void;
  retry: () => void;
};
