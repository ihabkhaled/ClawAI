import { useCreditWallet } from '@/hooks/credit/use-credit-wallet';
import { useTranslation } from '@/lib/i18n';
import type { UseUsagePageResult } from '@/types';

import { useEntitlements } from './use-entitlements';

// /usage answers "how much have I got left". Since a cloud answer spends the
// dollar wallet as well as the daily tokens, that question has two numbers and
// the page would be misleading with only one.
export function useUsagePage(): UseUsagePageResult {
  const { t, locale } = useTranslation();
  const entitlements = useEntitlements();
  const { wallet } = useCreditWallet();
  return { ...entitlements, wallet, t, locale };
}
