import type { ReactElement } from 'react';

import { StatCard } from '@/components/observability/stat-card';
import type { UserSubscriptionSummaryProps } from '@/types/admin-user-statistics.types';

/**
 * The four headline answers: which plan, how long they have paid, how long a
 * billing period runs, and when money next moves.
 *
 * `nextRenewalAt` is `null` whenever the account will NOT be charged again —
 * a cancelled subscription still has a `currentPeriodEnd`, but that is when
 * access stops, not when money moves. It is therefore rendered as an explicit
 * "will not renew", never as a blank cell and never as that end date, which
 * would tell an operator a churned customer is about to pay again.
 */
export function UserSubscriptionSummary({
  planOverview,
  statistics,
  t,
}: UserSubscriptionSummaryProps): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('admin.userSubscriptionPlanLabel')}
        value={planOverview.plan?.name ?? t('admin.userSubscriptionNoPlan')}
        description={
          planOverview.plan === null
            ? undefined
            : `${t('admin.userSubscriptionPlanSlugPrefix')} ${planOverview.plan.slug}`
        }
      />
      <StatCard
        title={t('admin.userSubscriptionMonthsPaidLabel')}
        value={statistics.monthsPaid}
        description={t('admin.userSubscriptionMonthsPaidDescription')}
      />
      <StatCard
        title={t('admin.userSubscriptionPeriodLengthLabel')}
        value={
          statistics.periodLengthMonths === null
            ? t('admin.userSubscriptionNoPeriodLength')
            : t('admin.userSubscriptionPeriodLengthValue', {
                months: statistics.periodLengthMonths,
              })
        }
      />
      <StatCard
        title={t('admin.userSubscriptionNextRenewalLabel')}
        value={
          statistics.nextRenewalAt === null
            ? t('admin.userSubscriptionWillNotRenew')
            : new Date(statistics.nextRenewalAt).toLocaleDateString()
        }
        description={
          statistics.nextRenewalAt === null
            ? t('admin.userSubscriptionWillNotRenewDescription')
            : undefined
        }
      />
    </div>
  );
}
