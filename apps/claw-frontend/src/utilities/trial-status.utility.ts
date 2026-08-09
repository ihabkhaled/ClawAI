import { ROUTES } from '@/constants/routes.constants';
import { MILLISECONDS_PER_TRIAL_DAY } from '@/constants/trial-status.constants';
import { TrialStatus } from '@/enums/trial-status.enum';
import type { TranslateFunction, UserEntitlements } from '@/types';
import type { TrialStatusBannerView } from '@/types/trial-status.types';

export function resolveTrialStatusBanner(
  entitlements: UserEntitlements | null,
  t: TranslateFunction,
  locale: string,
  now: number,
): TrialStatusBannerView {
  const plan = entitlements?.plan;
  if (entitlements?.isAdmin === true || plan?.isTrial !== true) {
    return { status: TrialStatus.HIDDEN };
  }

  if (plan.isTrialExpired) {
    return {
      status: TrialStatus.EXPIRED,
      title: t('trialStatus.expiredTitle'),
      body: t('trialStatus.expiredBody'),
      upgradeLabel: t('trialStatus.upgrade'),
      upgradeHref: ROUTES.BILLING,
    };
  }

  if (plan.trialEndsAt === null) {
    return { status: TrialStatus.HIDDEN };
  }

  const endTime = new Date(plan.trialEndsAt).getTime();
  if (!Number.isFinite(endTime)) {
    return { status: TrialStatus.HIDDEN };
  }

  const days = Math.max(0, Math.ceil((endTime - now) / MILLISECONDS_PER_TRIAL_DAY));
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(endTime);
  return {
    status: TrialStatus.ACTIVE,
    title: t('trialStatus.activeTitle'),
    body: t('trialStatus.activeBody', { days, date }),
    upgradeLabel: t('trialStatus.upgrade'),
    upgradeHref: ROUTES.BILLING,
  };
}
