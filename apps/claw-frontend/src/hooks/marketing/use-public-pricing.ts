'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { usePricingToggle } from '@/hooks/marketing/use-pricing-toggle';
import { useTranslation } from '@/lib/i18n';
import { publicPricingRepository } from '@/repositories/marketing/public-pricing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PublicPlan, UsePublicPricingResult } from '@/types/public-pricing.types';

export function usePublicPricing(initialPlans: PublicPlan[] | null): UsePublicPricingResult {
  const { t, locale } = useTranslation();
  const toggle = usePricingToggle();
  const query = useQuery({
    queryKey: queryKeys.publicPricing.catalog(),
    queryFn: ({ signal }) => publicPricingRepository.list(signal),
    initialData: initialPlans ?? undefined,
    staleTime: 60_000,
    enabled: initialPlans !== null,
  });
  const retry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
    isError:
      query.data === undefined && !query.isFetching && (initialPlans === null || query.isError),
    error: (query.error as Error | null) ?? null,
    isYearly: toggle.isYearly,
    selectMonthly: toggle.selectMonthly,
    selectYearly: toggle.selectYearly,
    retry,
    t,
    locale,
  };
}
