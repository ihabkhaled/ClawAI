'use client';

import Link from 'next/link';

import { PlanFeatureGates } from '@/components/account/plan-feature-gates';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PublicPlanCardProps } from '@/types/public-pricing.types';
import {
  formatPlanPrice,
  formatPlanQuota,
  resolvePlanPrice,
} from '@/utilities/pricing-catalog.utility';

export function PlanTierCard({ plan, isYearly }: PublicPlanCardProps): React.ReactElement {
  const { t, locale } = useTranslation();
  const price = resolvePlanPrice(plan, isYearly);
  const isFree = price?.amountMinor === 0;
  const cadenceKey = isYearly ? 'marketing.pricing.perYear' : 'marketing.pricing.perMonth';
  const disabled = t('billing.quota.disabled');
  const unlimited = t('billing.quota.unlimited');
  const interval = isYearly ? 'yearly' : 'monthly';
  const checkoutRoute = `${ROUTES.BILLING_CHECKOUT}?plan=${encodeURIComponent(plan.slug)}&interval=${interval}`;
  const returnRoute = isFree ? ROUTES.CHAT : checkoutRoute;

  return (
    <article
      className={cn(
        'border-border bg-card flex h-full min-h-[22rem] flex-col rounded-lg border p-6',
        // The badge follows the marketing decision, not the signup grant. One
        // flag used to serve both, so the badge landed on whichever plan new
        // signups happened to receive.
        plan.isPopular && 'border-primary ring-primary/30 shadow-sm ring-1',
      )}
    >
      {plan.isPopular ? (
        <span className="bg-primary text-primary-foreground mb-3 self-start rounded-full px-2.5 py-0.5 text-xs font-medium">
          {t('marketing.pricing.mostPopular')}
        </span>
      ) : null}

      <div
        data-testid="plan-copy-scroll"
        role="region"
        aria-label={plan.name}
        className="focus-visible:ring-ring h-24 overflow-y-auto overscroll-contain pe-2 focus-visible:ring-2 focus-visible:outline-none"
      >
        <h2 className="text-foreground text-lg font-semibold">{plan.name}</h2>
        {plan.description === null ? null : (
          <p className="text-muted-foreground mt-1 text-sm">{plan.description}</p>
        )}
      </div>

      <p className="mt-6 flex items-baseline gap-1">
        <span className="text-foreground text-3xl font-bold tracking-tight">
          {price === null
            ? t('billing.plans.unavailableForInterval')
            : formatPlanPrice(price, locale)}
        </span>
        {price === null || isFree ? null : (
          <span className="text-muted-foreground text-sm">{t(cadenceKey)}</span>
        )}
      </p>

      <dl className="text-muted-foreground mt-6 space-y-2.5 text-xs">
        <div className="flex justify-between gap-2">
          <dt>{t('userPlan.dailyLimitLabel')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.dailyTokenQuota, disabled, unlimited, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('adminPlans.form.weeklyTokenQuota')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.weeklyTokenQuota, disabled, unlimited, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('userPlan.monthlyLimitLabel')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.monthlyTokenQuota, disabled, unlimited, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('userPlan.chatsLimitLabel')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.maxChatsPerDay, disabled, unlimited, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('adminPlans.form.maxMessagesPerDay')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.maxMessagesPerDay, disabled, unlimited, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('adminPlans.form.maxWorkspaceConnections')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.maxWorkspaceConnections, disabled, unlimited, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('adminPlans.form.maxContextPacks')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.maxContextPacks, disabled, unlimited, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('adminPlans.form.maxMemoryItems')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.maxMemoryItems, disabled, unlimited, locale)}
          </dd>
        </div>
      </dl>

      <div className="border-border/60 mt-6 space-y-2 border-t pt-5">
        <PlanFeatureGates featureGates={plan.featureGates} t={t} />
      </div>

      {/* `mt-auto` on the link alone pushed it down only when the card had room
          to spare. A plan carrying all sixteen features has none, so the margin
          collapsed to nothing and the button sat flush against the last feature.
          The padding is the floor the auto margin grows from. */}
      <div className="border-border/60 mt-auto shrink-0 border-t pt-6">
        <Link
          href={`${ROUTES.REGISTER}?returnTo=${encodeURIComponent(returnRoute)}`}
          aria-disabled={price === null}
          className={cn(
            buttonVariants({ variant: plan.isPopular ? 'default' : 'outline' }),
            'h-12 w-full cursor-pointer text-center leading-tight whitespace-normal',
            price === null && 'pointer-events-none opacity-50',
          )}
        >
          {isFree ? t('marketing.pricing.ctaFree') : t('marketing.pricing.ctaPaid')}
        </Link>
      </div>
    </article>
  );
}
