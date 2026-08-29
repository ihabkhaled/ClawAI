import { BillingInterval } from '@/enums/billing.enum';
import type { AdminPlanPriceVersion } from '@/types/admin-plan-price.types';
import type { PlanPaygCreditPreview } from '@/types/plan.types';
import { formatMinorAmount } from '@/utilities/billing.utility';
import { formatMicroUsd, monthlyCreditFromPlan } from '@/utilities/credit.utility';

// Resolves the i18n key for the PlanForm submit button, avoiding a nested
// ternary inside the TSX (banned by no-nested-ternary).
export function resolvePlanSubmitLabelKey(isSubmitting: boolean, isEdit: boolean): string {
  if (isSubmitting) {
    return 'adminPlans.form.submitting';
  }
  return isEdit ? 'adminPlans.form.submitUpdate' : 'adminPlans.form.submitCreate';
}

/**
 * The plan's live monthly price version, or null while it has none.
 *
 * MONTHLY specifically, even for a plan that also sells yearly: the connector
 * credit is granted per month and is derived from the monthly price, so quoting
 * a yearly figure here would preview a number the wallet never grants.
 */
export function findActiveMonthlyPrice(
  prices: readonly AdminPlanPriceVersion[],
): AdminPlanPriceVersion | null {
  return (
    prices.find((price) => price.isActive && price.billingInterval === BillingInterval.MONTHLY) ??
    null
  );
}

/**
 * Turns the rate an operator is typing into the money it will actually grant.
 *
 * Returns `null` — and the form shows nothing — whenever the answer would be a
 * guess: no active monthly price, a blank or non-integer rate, or a rate of
 * zero. A preview that invents a price is worse than no preview, because an
 * operator would price the plan against it.
 */
export function buildPaygCreditPreview(
  prices: readonly AdminPlanPriceVersion[],
  percentBpsText: string,
  locale: string,
): PlanPaygCreditPreview | null {
  const price = findActiveMonthlyPrice(prices);
  if (price === null) {
    return null;
  }
  const trimmed = percentBpsText.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const bps = Number(trimmed);
  if (!Number.isInteger(bps) || bps <= 0) {
    return null;
  }
  const creditMicroUsd = monthlyCreditFromPlan(price.amountMinor, bps);
  if (creditMicroUsd <= 0) {
    return null;
  }
  return {
    credit: formatMicroUsd(creditMicroUsd, locale),
    price: formatMinorAmount(price.amountMinor, price.currency, locale),
  };
}
