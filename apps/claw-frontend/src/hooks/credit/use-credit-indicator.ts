import { useCreditWallet } from '@/hooks/credit/use-credit-wallet';
import { useTranslation } from '@/lib/i18n';
import type { UseCreditIndicatorReturn } from '@/types/credit-hook.types';

// Surfaces the pay-as-you-go balance in the composer, beside the daily-token
// figure.
//
// Both numbers, because either one can refuse a message on its own: a user with
// tokens left and an empty wallet is blocked while looking at a green token bar,
// which is exactly the failure this indicator exists to prevent.
export function useCreditIndicator(): UseCreditIndicatorReturn {
  const { t, locale } = useTranslation();
  const { wallet, isLoading } = useCreditWallet();

  return { wallet, isLoading, t, locale };
}
