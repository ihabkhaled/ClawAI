import { CreditCard } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import type { UserSubscriptionCurrentProps } from '@/types/admin-user-statistics.types';
import { resolveNoSubscriptionDescriptionKey } from '@/utilities/admin-user-statistics.utility';
import { formatMinorAmount } from '@/utilities/billing.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';

/**
 * The one effective subscription, or the honest free-account answer.
 *
 * `subscription: null` is a NORMAL state — not an error — so it renders as a
 * plain statement rather than a failure notice. It is NOT the same thing as a
 * free account, which is why the sentence is chosen from the entitlement grant
 * rather than assumed: an admin-granted Pro user has no subscription and never
 * will, and the panel used to describe them as "an ordinary free account".
 *
 * `totalPaidMinor` is a list per currency and is rendered as one. Adding 500 USD
 * to 10000 EGP produces a number that means nothing, so the currencies are never
 * summed together.
 */
export function UserSubscriptionCurrent({
  subscription,
  totalPaidMinor,
  assignment,
  t,
}: UserSubscriptionCurrentProps): ReactElement {
  if (subscription === null) {
    return (
      <EmptyState
        icon={CreditCard}
        title={t('admin.userSubscriptionNoneTitle')}
        description={t(resolveNoSubscriptionDescriptionKey(assignment))}
        variant={EmptyStateVariant.Compact}
      />
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionStatusLabel')}</dt>
        <dd className="text-end font-medium">
          <Badge variant="secondary">{t(`billing.status.${subscription.status}`)}</Badge>
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionIntervalLabel')}</dt>
        <dd className="text-end font-medium">
          {t(`billing.interval.${subscription.billingInterval}`)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionAmountLabel')}</dt>
        <dd className="text-end font-medium">
          {formatMinorAmount(subscription.amountMinor, subscription.currency)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionCurrentPeriodLabel')}</dt>
        <dd className="text-end font-medium">
          {t('admin.userSubscriptionCurrentPeriodValue', {
            from: formatDateTimeSafe(subscription.currentPeriodStart),
            through: formatDateTimeSafe(subscription.currentPeriodEnd),
          })}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionCancelAtPeriodEnd')}</dt>
        <dd className="text-end font-medium">
          {subscription.cancelAtPeriodEnd ? t('common.yes') : t('common.no')}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">
          {t('admin.userSubscriptionEntitlementValidUntil')}
        </dt>
        <dd className="text-end font-medium">
          {formatDateTimeSafe(subscription.entitlementValidUntil)}
        </dd>
      </div>
      {subscription.scheduledPlanSlug === null ? null : (
        <div className="flex items-baseline justify-between gap-2 sm:col-span-2">
          <dt className="text-muted-foreground">{t('admin.userSubscriptionScheduledChange')}</dt>
          <dd className="text-end font-medium">
            {t('admin.userSubscriptionScheduledChangeValue', {
              plan: subscription.scheduledPlanSlug,
              at: formatDateTimeSafe(subscription.scheduledEffectiveAt),
            })}
          </dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2 sm:col-span-2">
        <dt className="text-muted-foreground">{t('admin.userSubscriptionTotalPaidLabel')}</dt>
        <dd className="text-end font-medium">
          {totalPaidMinor.length === 0
            ? t('admin.userSubscriptionNothingPaid')
            : totalPaidMinor
                .map((total) => formatMinorAmount(total.amountMinor, total.currency))
                .join(' · ')}
        </dd>
      </div>
    </dl>
  );
}
