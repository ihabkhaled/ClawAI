import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { ADAPTIVE_LEARNING_DEFAULT_WINDOW_DAYS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdaptiveLearningPageReturn } from '@/types';

export function useAdaptiveLearningPage(): UseAdaptiveLearningPageReturn {
  const { t } = useTranslation();
  const [windowDays, setWindowDays] = useState<number>(ADAPTIVE_LEARNING_DEFAULT_WINDOW_DAYS);

  const {
    data: insights,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.adaptiveLearning.insights(windowDays),
    queryFn: () => routingRepository.getAdaptiveInsights(windowDays),
  });

  return { t, insights, isLoading, isError, windowDays, setWindowDays };
}
