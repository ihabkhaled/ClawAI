import { useCreditPage } from '@/hooks/credit/use-credit-page';
import { useTranslation } from '@/lib/i18n';
import type { UsePlanPageResult } from '@/types';

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

  return { ...entitlements, credit, t, locale };
}
