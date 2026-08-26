import type { ReactElement } from 'react';

import { FeatureAllowanceList } from '@/components/billing/feature-allowance-list';
import { UsageWindowBar } from '@/components/billing/usage-window-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { UsageOverviewCardProps } from '@/types/billing-component.types';

export function UsageOverviewCard({
  usage,
  isLoading,
  isError,
  t,
}: UsageOverviewCardProps): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('billing.usage.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : null}

        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t('billing.usage.error')}
          </p>
        ) : null}

        {!isLoading && !isError && usage === null ? (
          <p className="text-muted-foreground text-sm">{t('billing.usage.empty')}</p>
        ) : null}

        {!isLoading && !isError && usage !== null ? (
          <>
            <UsageWindowBar label={t('billing.usage.day')} window={usage.day} t={t} />
            <UsageWindowBar label={t('billing.usage.week')} window={usage.week} t={t} />
            <UsageWindowBar label={t('billing.usage.month')} window={usage.month} t={t} />
            <FeatureAllowanceList features={usage.features} t={t} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
