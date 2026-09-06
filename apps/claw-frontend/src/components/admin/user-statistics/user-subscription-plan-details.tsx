import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import type { UserSubscriptionPlanDetailsProps } from '@/types/admin-user-statistics.types';
import { resolveEntitlementValidUntilLabel } from '@/utilities/admin-user-statistics.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';

/**
 * Plan, entitlement grant and free-trial standing — the auth-service half.
 *
 * The grant is shown even when it has expired: "why did this user lose access"
 * is answered by an expired grant, and hiding it would answer the question with
 * a blank panel.
 *
 * A trial reports `daysRemaining` rounded UP, so thirty minutes left reads as
 * "1 day", and reaches 0 only once `isExpired` is also true.
 */
export function UserSubscriptionPlanDetails({
  planOverview,
  t,
}: UserSubscriptionPlanDetailsProps): ReactElement {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionTrialLabel')}</dt>
        <dd className="text-end font-medium">
          {planOverview.trial === null ? (
            t('admin.userSubscriptionNoTrial')
          ) : (
            <Badge variant={planOverview.trial.isExpired ? 'outline' : 'default'}>
              {planOverview.trial.isExpired
                ? t('admin.userSubscriptionTrialExpired')
                : t('admin.userSubscriptionTrialDaysRemaining', {
                    days: planOverview.trial.daysRemaining,
                  })}
            </Badge>
          )}
        </dd>
      </div>
      {planOverview.trial === null ? null : (
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted-foreground">{t('admin.userSubscriptionTrialExpiresAt')}</dt>
          <dd className="text-end font-medium">
            {formatDateTimeSafe(planOverview.trial.expiresAt)}
          </dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionGrantTypeLabel')}</dt>
        <dd className="text-end font-medium">
          {planOverview.assignment?.grantType ?? t('admin.userSubscriptionNoGrant')}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionGrantStatusLabel')}</dt>
        <dd className="text-end font-medium">
          {planOverview.assignment?.status ?? t('admin.userSubscriptionNoGrant')}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionGrantStartsAt')}</dt>
        <dd className="text-end font-medium">
          {formatDateTimeSafe(planOverview.assignment?.startsAt ?? null)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">
          {t('admin.userSubscriptionEntitlementValidUntil')}
        </dt>
        <dd className="text-end font-medium">
          {resolveEntitlementValidUntilLabel(
            planOverview.assignment,
            t('admin.userSubscriptionNoGrant'),
            t('admin.userSubscriptionNeverExpires'),
          )}
        </dd>
      </div>
      {planOverview.assignment?.grantReason === null ||
      planOverview.assignment?.grantReason === undefined ? null : (
        <div className="flex items-baseline justify-between gap-2 sm:col-span-2">
          <dt className="text-muted-foreground">{t('admin.userSubscriptionGrantReasonLabel')}</dt>
          <dd className="text-end font-medium">{planOverview.assignment.grantReason}</dd>
        </div>
      )}
    </dl>
  );
}
