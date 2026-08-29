import { useCreditWallet } from '@/hooks/credit/use-credit-wallet';
import { useEntitlements } from '@/hooks/plans/use-entitlements';
import { useTranslation } from '@/lib/i18n';
import type { UseDailyTokenIndicatorResult } from '@/types';

// Surfaces BOTH ceilings the user is spending against while they compare models.
//
// Tokens alone were the whole story until pay-as-you-go credit existed. They are
// not any more: a cloud answer debits the dollar wallet AND the token allowance,
// so a user with tokens to spare can still be refused. Showing one number and
// hiding the other is how a refusal becomes inexplicable.
export function useDailyTokenIndicator(): UseDailyTokenIndicatorResult {
  const { t, locale } = useTranslation();
  const { entitlements, isLoading } = useEntitlements();
  const { wallet, isLoading: isWalletLoading } = useCreditWallet();

  return {
    quota: entitlements?.quota ?? null,
    wallet,
    // The token bar is the primary figure, so it renders as soon as it can
    // rather than waiting on the wallet request beside it.
    isLoading,
    isWalletLoading,
    t,
    locale,
  };
}
