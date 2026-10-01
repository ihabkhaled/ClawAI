import { useCreditPage } from '@/hooks/credit/use-credit-page';
import { useTranslation } from '@/lib/i18n';
import type { UsePlanPageResult } from '@/types';
import { resolveTrialStatusBanner } from '@/utilities/trial-status.utility';

import { useEntitlements } from './use-entitlements';

// Controller hook for /plan.
//
// The plan page owns the PRIMARY "Add credit" call to action: the user asked for
// credit to live in plan settings, and it is the screen where somebody who has
// just been refused arrives. /billing still shows the balance and the ledger,
// but the purchase starts here.
export function usePlanPage(): UsePlanPageResult {
  const { t, locale } = useTranslation();
  const entitlements = useEntitlements();
  const credit = useCreditPage();

  // Same whole-days-rounded-up count the global trial banner shows, so the two
  // can never disagree about how long is left.
  const trial = resolveTrialStatusBanner(entitlements.entitlements, t, locale, Date.now());

  return { ...entitlements, credit, trial, t, locale };
}
