'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';

import { UserUsageCreditsTable } from '@/components/admin/user-statistics/user-usage-credits-table';
import { UserUsageTokenWindowCard } from '@/components/admin/user-statistics/user-usage-token-window-card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { useAdminUserUsage } from '@/hooks/admin/use-admin-user-usage';
import type { UserUsageDialogBodyProps } from '@/types/admin-user-statistics.types';

/**
 * Loading / error / empty / populated for one user's consumption panel.
 *
 * Mounted with `key={userId}` by the dialog shell, so reopening on a different
 * row starts a fresh query instead of showing the previous user's figures while
 * the new ones load.
 */
export function UserUsageDialogBody({ userId, t }: UserUsageDialogBodyProps): ReactElement {
  const { statistics, hasTokenUsage, isLoading, isError, refetch } = useAdminUserUsage(userId);

  if (isLoading) {
    return <LoadingSpinner label={t('admin.userUsageLoading')} />;
  }

  if (isError || statistics === null) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('admin.userUsageErrorTitle')}
        description={t('admin.userUsageErrorDescription')}
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
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('admin.userUsageTokensHeading')}</h3>
        {hasTokenUsage ? null : (
          <p className="text-muted-foreground text-xs">{t('admin.userUsageNoTokensRecorded')}</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UserUsageTokenWindowCard
            label={t('admin.userUsageWindowDay')}
            usageWindow={statistics.tokens.day}
            t={t}
          />
          <UserUsageTokenWindowCard
            label={t('admin.userUsageWindowWeek')}
            usageWindow={statistics.tokens.week}
            t={t}
          />
          <UserUsageTokenWindowCard
            label={t('admin.userUsageWindowMonth')}
            usageWindow={statistics.tokens.month}
            t={t}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('admin.userUsageCreditsHeading')}</h3>
        <UserUsageCreditsTable months={statistics.creditsByMonth} t={t} />
      </section>

      <p className="text-muted-foreground text-xs">
        {t('admin.userStatisticsGeneratedAt', {
          timestamp: new Date(statistics.generatedAt).toLocaleString(),
        })}
      </p>
    </div>
  );
}
