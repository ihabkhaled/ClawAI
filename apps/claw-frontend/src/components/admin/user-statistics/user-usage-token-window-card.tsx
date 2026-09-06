import type { ReactElement } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserUsageTokenWindowCardProps } from '@/types/admin-user-statistics.types';

/**
 * One closed token window (UTC day, ISO week or calendar month).
 *
 * The window bounds are rendered alongside the totals on purpose: the figures
 * are summed from `TokenUsageLedger` rows keyed by those exact UTC dates, so an
 * operator investigating a bill can trace the number back to rows rather than
 * being handed an opaque total.
 */
export function UserUsageTokenWindowCard({
  label,
  usageWindow,
  t,
}: UserUsageTokenWindowCardProps): ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{usageWindow.totalTokens.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-xs">
          {t('admin.userUsageWindowRange', {
            from: usageWindow.fromDate,
            through: usageWindow.throughDate,
          })}
        </p>
        <dl className="text-muted-foreground grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs sm:grid-cols-2">
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <dt>{t('admin.userUsageInputTokens')}</dt>
            <dd className="text-foreground font-medium">
              {usageWindow.inputTokens.toLocaleString()}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <dt>{t('admin.userUsageOutputTokens')}</dt>
            <dd className="text-foreground font-medium">
              {usageWindow.outputTokens.toLocaleString()}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <dt>{t('admin.userUsageRequestCount')}</dt>
            <dd className="text-foreground font-medium">
              {usageWindow.requestCount.toLocaleString()}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <dt>{t('admin.userUsagePeriodKey')}</dt>
            <dd className="text-foreground font-medium">{usageWindow.periodKey}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
