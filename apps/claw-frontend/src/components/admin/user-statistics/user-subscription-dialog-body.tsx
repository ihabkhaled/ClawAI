'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';

import { UserSubscriptionCurrent } from '@/components/admin/user-statistics/user-subscription-current';
import { UserSubscriptionHistoryTable } from '@/components/admin/user-statistics/user-subscription-history-table';
import { UserSubscriptionInvoicesTable } from '@/components/admin/user-statistics/user-subscription-invoices-table';
import { UserSubscriptionPlanDetails } from '@/components/admin/user-statistics/user-subscription-plan-details';
import { UserSubscriptionSummary } from '@/components/admin/user-statistics/user-subscription-summary';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { useAdminUserSubscription } from '@/hooks/admin/use-admin-user-subscription';
import type { UserSubscriptionDialogBodyProps } from '@/types/admin-user-statistics.types';

/**
 * Loading / error / empty / populated for one user's billing panel.
 *
 * Two services answer here and BOTH must land before anything is drawn: showing
 * the plan half while the money half is still failing would read as "this user
 * has never paid", which is a different claim from "we could not ask".
 *
 * Mounted with `key={userId}` by the dialog shell so reopening on another row
 * cannot show the previous account's subscription.
 */
export function UserSubscriptionDialogBody({
  userId,
  t,
}: UserSubscriptionDialogBodyProps): ReactElement {
  const { planOverview, subscriptionStatistics, isLoading, isError, refetch } =
    useAdminUserSubscription(userId);

  if (isLoading) {
    return <LoadingSpinner label={t('admin.userSubscriptionLoading')} />;
  }

  if (isError || planOverview === null || subscriptionStatistics === null) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('admin.userSubscriptionErrorTitle')}
        description={t('admin.userSubscriptionErrorDescription')}
        variant={EmptyStateVariant.Compact}
        action={
          <Button variant="outline" size="sm" onClick={refetch}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <UserSubscriptionSummary
        planOverview={planOverview}
        statistics={subscriptionStatistics}
        t={t}
      />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('admin.userSubscriptionPlanHeading')}</h3>
        <UserSubscriptionPlanDetails planOverview={planOverview} t={t} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('admin.userSubscriptionCurrentHeading')}</h3>
        <UserSubscriptionCurrent
          subscription={subscriptionStatistics.subscription}
          totalPaidMinor={subscriptionStatistics.totalPaidMinor}
          assignment={planOverview.assignment}
          t={t}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('admin.userSubscriptionHistoryHeading')}</h3>
        <UserSubscriptionHistoryTable history={subscriptionStatistics.subscriptionHistory} t={t} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('admin.userSubscriptionInvoicesHeading')}</h3>
        <UserSubscriptionInvoicesTable invoices={subscriptionStatistics.recentInvoices} t={t} />
      </section>

      <p className="text-muted-foreground text-xs">
        {t('admin.userStatisticsGeneratedAt', {
          timestamp: new Date(subscriptionStatistics.generatedAt).toLocaleString(),
        })}
      </p>
    </div>
  );
}
