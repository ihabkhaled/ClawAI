'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { usePricingToggle } from '@/hooks/marketing/use-pricing-toggle';
import { useTranslation } from '@/lib/i18n';
import { publicPricingRepository } from '@/repositories/marketing/public-pricing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PublicPlan, UsePublicPricingResult } from '@/types/public-pricing.types';

/**
 * The plans on the public pricing page, from the database and nowhere else.
 *
 * This hook used to fall back to seven hardcoded plans — names, prices and token
 * quotas — whenever the catalog could not be read, and reported `isError: false`
 * while doing it. So a total backend outage rendered confident prices that
 * nobody had checked against the database in months. That is worse than an
 * error: a wrong price shown calmly is a price a customer can hold us to.
 *
 * Now there is no fallback. If the catalog cannot be read the page says so and
 * offers a retry. An empty list and a failed fetch are also kept distinct —
 * "we have no public plans right now" and "we could not ask" need different
 * words, and collapsing them hides an outage behind a shrug.
 *
 * The client query stays enabled even when the server render already succeeded,
 * so the retry button can actually re-fetch. It previously ran only when the
 * server fetch had produced data, which meant the one case that needed a retry
 * was the one case where retry did nothing.
 */
export function usePublicPricing(initialPlans: PublicPlan[] | null): UsePublicPricingResult {
  const { t, locale } = useTranslation();
  const toggle = usePricingToggle();
  const query = useQuery({
    queryKey: queryKeys.publicPricing.catalog(),
    queryFn: ({ signal }) => publicPricingRepository.list(signal),
    initialData: initialPlans ?? undefined,
    staleTime: 60_000,
  });
  const retry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  // A server render that failed leaves no initial data, and the client fetch may
  // fail too. Either way there is nothing honest to show but the error.
  const hasPlans = query.data !== undefined;

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading && !hasPlans,
    isError: query.isError || (!hasPlans && !query.isLoading),
    error: (query.error as Error | null) ?? null,
    interval: toggle.interval,
    selectInterval: toggle.selectInterval,
    retry,
    t,
    locale,
  };
}
