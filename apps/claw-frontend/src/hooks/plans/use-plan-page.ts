import { useTranslation } from '@/lib/i18n';
import type { TranslateFunction, UseEntitlementsResult } from '@/types';

import { useEntitlements } from './use-entitlements';

export function usePlanPage(): UseEntitlementsResult & { t: TranslateFunction } {
  const { t } = useTranslation();
  const entitlements = useEntitlements();
  return { ...entitlements, t };
}
