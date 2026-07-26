import type { ReactElement } from 'react';

import { Alert } from '@/components/ui/alert';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { SubscriptionStatus } from '@/enums/billing.enum';
import type { BillingStatusBannerProps } from '@/types/billing-component.types';
import { formatDateTimeSafe } from '@/utilities/date.utility';

// Tells the user, unprompted, that something needs their attention: a failed
// renewal inside its grace window, a suspended account, or a downgrade that
// will take effect at period end.
//
// A scheduled downgrade gets a banner too. It is not an error, but discovering
// on renewal day that your plan shrank is a support ticket every time.
export function BillingStatusBanner({
  subscription,
  t,
}: BillingStatusBannerProps): ReactElement | null {
  if (subscription === null) {
    return null;
  }

  if (subscription.status === SubscriptionStatus.PAST_DUE) {
    return (
      <Alert
        variant={AlertVariant.Warning}
        title={t('billing.banner.pastDueTitle')}
        description={
          subscription.gracePeriodEndsAt === null
            ? t('billing.banner.pastDueDescription')
            : t('billing.banner.pastDueWithGrace', {
                date: formatDateTimeSafe(subscription.gracePeriodEndsAt),
              })
        }
      />
    );
  }

  if (subscription.status === SubscriptionStatus.SUSPENDED) {
    return (
      <Alert
        variant={AlertVariant.Error}
        title={t('billing.banner.suspendedTitle')}
        description={t('billing.banner.suspendedDescription')}
      />
    );
  }

  if (subscription.status === SubscriptionStatus.INCOMPLETE) {
    return (
      <Alert
        variant={AlertVariant.Info}
        title={t('billing.banner.incompleteTitle')}
        description={t('billing.banner.incompleteDescription')}
      />
    );
  }

  if (subscription.cancelAtPeriodEnd) {
    return (
      <Alert
        variant={AlertVariant.Info}
        title={t('billing.banner.cancellingTitle')}
        description={t('billing.banner.cancellingDescription', {
          date: formatDateTimeSafe(subscription.currentPeriodEnd),
        })}
      />
    );
  }

  if (subscription.scheduledPlanSlug !== null) {
    return (
      <Alert
        variant={AlertVariant.Info}
        title={t('billing.banner.scheduledChangeTitle')}
        description={t('billing.banner.scheduledChangeDescription', {
          plan: subscription.scheduledPlanSlug,
          date: formatDateTimeSafe(subscription.scheduledEffectiveAt),
        })}
      />
    );
  }

  return null;
}
