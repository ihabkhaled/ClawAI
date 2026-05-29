import { useEntitlements } from '@/hooks/plans/use-entitlements';
import { useTranslation } from '@/lib/i18n';
import type { UseDailyTokenIndicatorResult } from '@/types';

// Surfaces the user's daily token quota (consumed by every model call across
// chat/compare/judge/etc.) so the consumption is visible while comparing.
export function useDailyTokenIndicator(): UseDailyTokenIndicatorResult {
  const { t } = useTranslation();
  const { entitlements, isLoading } = useEntitlements();

  return {
    quota: entitlements?.quota ?? null,
    isLoading,
    t,
  };
}
