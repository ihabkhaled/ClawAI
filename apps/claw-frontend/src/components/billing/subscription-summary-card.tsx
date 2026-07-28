import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionStatus } from '@/enums/billing.enum';
import type { SubscriptionSummaryCardProps } from '@/types/billing-component.types';
import { formatMinorAmount } from '@/utilities/billing.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';

export function SubscriptionSummaryCard({
  subscription,
  onCancel,
  onResume,
  onEndNow,
  isCancelPending,
  isResumePending,
  isEndNowPending,
  t,
}: SubscriptionSummaryCardProps): ReactElement {
  // No subscription is a normal state, not an error: it is what every free
  // account looks like.
  if (subscription === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('billing.summary.freeTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t('billing.summary.freeDescription')}</p>
        </CardContent>
      </Card>
    );
  }

  const isCancelling = subscription.cancelAtPeriodEnd;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">{subscription.planName}</CardTitle>
        <Badge variant={subscription.status === SubscriptionStatus.ACTIVE ? 'default' : 'outline'}>
          {t(`billing.status.${subscription.status}`)}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t('billing.summary.price')}</dt>
            <dd className="font-medium">
              {formatMinorAmount(subscription.amountMinor, subscription.currency)}{' '}
              <span className="text-muted-foreground">
                {t(`billing.interval.${subscription.billingInterval}`)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('billing.summary.renewsOn')}</dt>
            <dd className="font-medium">{formatDateTimeSafe(subscription.currentPeriodEnd)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          {isCancelling ? (
            <>
              <Button type="button" variant="outline" onClick={onResume} disabled={isResumePending}>
                {isResumePending ? t('billing.actions.resuming') : t('billing.actions.resume')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onEndNow}
                disabled={isEndNowPending}
              >
                {isEndNowPending ? t('billing.actions.removing') : t('billing.actions.remove')}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isCancelPending}>
              {isCancelPending ? t('billing.actions.cancelling') : t('billing.actions.cancel')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
