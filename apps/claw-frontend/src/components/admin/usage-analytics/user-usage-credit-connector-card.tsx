import type { ReactElement } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { UserUsageCreditConnectorCardProps } from '@/types/admin-usage-analytics.types';
import { formatMicroUsd } from '@/utilities/billing-dashboard.utility';

/**
 * Credit-connector use and the free monthly allowance.
 *
 * The allowance has three honest states and they are never merged: `limit: null`
 * is unlimited, `0` is disabled, a positive number is a quota with a meter. The
 * meter also carries text, so the figure never depends on colour or on a
 * progress bar alone.
 */
export function UserUsageCreditConnectorCard({
  credit,
  t,
}: UserUsageCreditConnectorCardProps): ReactElement {
  const allowance = credit.freeAllowance;
  const quota = allowance !== null && allowance.limit !== null && allowance.limit > 0;
  const percent =
    quota && allowance !== null && allowance.limit !== null
      ? Math.min(100, Math.round((allowance.used / allowance.limit) * 100))
      : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('usageAnalytics.creditHeading')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          {credit.usedCreditConnectors
            ? t('usageAnalytics.creditUsedYes')
            : t('usageAnalytics.creditUsedNo')}
        </p>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs">{t('usageAnalytics.creditRequests')}</dt>
            <dd className="font-medium">{credit.creditRequests.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">{t('usageAnalytics.freeRequests')}</dt>
            <dd className="font-medium">{credit.freeAllowanceRequests.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">{t('usageAnalytics.creditWallet')}</dt>
            <dd className="font-medium">{formatMicroUsd(credit.walletMicroUsd)}</dd>
          </div>
        </dl>

        {allowance === null ? null : (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">
              {t('usageAnalytics.freeHeading', { period: allowance.periodKey })}
            </h4>
            {allowance.limit === 0 ? (
              <p className="text-muted-foreground text-xs">{t('usageAnalytics.freeDisabled')}</p>
            ) : (
              <>
                {quota ? (
                  <Progress
                    value={percent}
                    aria-label={t('usageAnalytics.freeMeter')}
                    className="h-2"
                  />
                ) : null}
                <p className="text-xs">
                  {allowance.limit === null
                    ? t('usageAnalytics.freeUnlimited', { used: allowance.used })
                    : t('usageAnalytics.freeUsage', {
                        used: allowance.used,
                        limit: allowance.limit,
                        remaining: allowance.remaining ?? 0,
                      })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('usageAnalytics.freeResets', {
                    date: allowance.resetsAt.slice(0, 10),
                  })}
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
