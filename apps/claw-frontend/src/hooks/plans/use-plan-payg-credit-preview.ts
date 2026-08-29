import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { UserRole } from '@/enums/user-role.enum';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PlanPaygCreditPreview } from '@/types/plan.types';
import { buildPaygCreditPreview } from '@/utilities/plan-form.utility';

/**
 * What the rate an operator is typing works out to in real money.
 *
 * The price versions are read from the SAME query key the prices page uses, so
 * opening the plan form after visiting prices costs nothing and the two screens
 * can never quote different figures. A brand-new plan has no id and no price
 * yet, so the query stays disabled and the preview stays null.
 */
export function usePlanPaygCreditPreview(
  planId: string | null,
  percentBpsText: string,
): PlanPaygCreditPreview | null {
  const { locale } = useTranslation();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;

  const query = useQuery({
    queryKey: queryKeys.adminPlans.prices(planId ?? 'new'),
    queryFn: () => plansRepository.listPriceVersions(planId ?? ''),
    enabled: isAdmin && planId !== null,
    staleTime: 30_000,
  });

  const prices = query.data;
  return useMemo(
    () => (prices === undefined ? null : buildPaygCreditPreview(prices, percentBpsText, locale)),
    [prices, percentBpsText, locale],
  );
}
