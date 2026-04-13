import { useTranslation } from '@/lib/i18n';
import type { UseRecoveryPageReturn } from '@/types';

import { useRecoveryStats } from './use-recovery-stats';

export function useRecoveryPage(): UseRecoveryPageReturn {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useRecoveryStats();

  return { t, data, isLoading, isError };
}
