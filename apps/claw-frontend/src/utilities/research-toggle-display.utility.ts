import type { TranslateFunction } from '@/types/i18n.types';

export function getProviderPlaceholder(
  isLoading: boolean,
  availableCount: number,
  t: TranslateFunction,
): string {
  if (isLoading) {
    return t('common.loading');
  }

  if (availableCount > 0) {
    return t('research.toggle.autoProvider');
  }

  return t('research.toggle.noProviders');
}
