import { useEntitlements } from '@/hooks/plans/use-entitlements';
import { useTranslation } from '@/lib/i18n';
import type { TrialStatusBannerView } from '@/types/trial-status.types';
import { resolveTrialStatusBanner } from '@/utilities/trial-status.utility';

export function useTrialStatusBanner(): TrialStatusBannerView {
  const { entitlements } = useEntitlements();
  const { t, locale } = useTranslation();
  return resolveTrialStatusBanner(entitlements, t, locale, Date.now());
}
