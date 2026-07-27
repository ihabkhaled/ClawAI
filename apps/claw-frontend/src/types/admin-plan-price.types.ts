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
  billingInterval: BillingInterval;
  currency: string;
  amount: string;
  setBillingInterval: (value: BillingInterval) => void;
  setCurrency: (value: string) => void;
  setAmount: (value: string) => void;
  publish: () => void;
  retry: () => void;
};
