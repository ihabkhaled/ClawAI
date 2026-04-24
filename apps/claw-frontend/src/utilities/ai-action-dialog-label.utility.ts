import type { TranslateFunction } from '@/types/i18n.types';

export function resolveGenerateLabel(
  isPending: boolean,
  hasResult: boolean,
  t: TranslateFunction,
): string {
  if (isPending) {
    return t('aiActions.dialog.resolving');
  }
  if (hasResult) {
    return t('aiActions.dialog.regenerate');
  }
  return t('aiActions.dialog.generate');
}
