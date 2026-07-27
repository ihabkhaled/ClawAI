'use client';

import Link from 'next/link';

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

  return (
    <div
      className={cn(
        'border-border bg-card flex flex-col rounded-lg border p-6',
        plan.isDefault && 'border-primary ring-primary/30 shadow-sm ring-1',
      )}
    >
      {plan.isDefault ? (
        <span className="bg-primary text-primary-foreground mb-3 self-start rounded-full px-2.5 py-0.5 text-xs font-medium">
          {t('marketing.pricing.mostPopular')}
        </span>
      ) : null}

      <h3 className="text-foreground text-lg font-semibold">{plan.name}</h3>
      {plan.description === null ? null : (
        <p className="text-muted-foreground mt-1 text-sm">{plan.description}</p>
      )}

      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-foreground text-3xl font-bold tracking-tight">
          {price === null
            ? t('billing.plans.unavailableForInterval')
            : formatPlanPrice(price, locale)}
        </span>
        {price === null || isFree ? null : (
          <span className="text-muted-foreground text-sm">{t(cadenceKey)}</span>
        )}
      </p>

      <dl className="text-muted-foreground mt-4 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt>{t('marketing.pricing.dailyTokens')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.dailyTokenQuota, disabled, unlimited, locale)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('marketing.pricing.monthlyTokens')}</dt>
          <dd className="text-foreground font-medium">
            {formatPlanQuota(plan.monthlyTokenQuota, disabled, unlimited, locale)}
          </dd>
        </div>
      </dl>

      <Link
        href={ROUTES.REGISTER}
        aria-disabled={price === null}
        className={cn(
          buttonVariants({ variant: plan.isDefault ? 'default' : 'outline' }),
          'mt-6 w-full flex-1 self-end',
          price === null && 'pointer-events-none opacity-50',
        )}
      >
        {isFree ? t('marketing.pricing.ctaFree') : t('marketing.pricing.ctaPaid')}
      </Link>
    </div>
  );
}
