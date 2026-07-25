'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MarketingPlanTierCardProps } from '@/types';

export function PlanTierCard({ tier, isYearly }: MarketingPlanTierCardProps): React.ReactElement {
  const { t } = useTranslation();
  const isFree = tier.monthlyUsd === 0;
  const price = isYearly && tier.yearlyUsd !== null ? tier.yearlyUsd : tier.monthlyUsd;
  const cadenceKey =
    isYearly && tier.yearlyUsd !== null
      ? 'marketing.pricing.perYear'
      : 'marketing.pricing.perMonth';

  return (
    <div
      className={cn(
        'border-border bg-card flex flex-col rounded-lg border p-6',
        tier.isFeatured && 'border-primary ring-primary/30 shadow-sm ring-1',
      )}
    >
      {tier.isFeatured ? (
        <span className="bg-primary text-primary-foreground mb-3 self-start rounded-full px-2.5 py-0.5 text-xs font-medium">
          {t('marketing.pricing.mostPopular')}
        </span>
      ) : null}

      <h3 className="text-foreground text-lg font-semibold">{t(tier.nameKey)}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{t(tier.taglineKey)}</p>

      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-foreground text-3xl font-bold tracking-tight">${price}</span>
        {isFree ? null : <span className="text-muted-foreground text-sm">{t(cadenceKey)}</span>}
      </p>

      <dl className="text-muted-foreground mt-4 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt>{t('marketing.pricing.dailyTokens')}</dt>
          <dd className="text-foreground font-medium">{tier.dailyTokens}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('marketing.pricing.monthlyTokens')}</dt>
          <dd className="text-foreground font-medium">
            {tier.slug === 'unlimited' ? t(tier.monthlyTokens) : tier.monthlyTokens}
          </dd>
        </div>
      </dl>

      <ul className="mt-5 flex-1 space-y-2">
        {tier.highlightKeys.map((key) => (
          <li key={key} className="text-muted-foreground flex gap-2 text-sm">
            <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>

      <Link
        href={isFree ? ROUTES.REGISTER : ROUTES.REGISTER}
        className={cn(
          buttonVariants({ variant: tier.isFeatured ? 'default' : 'outline' }),
          'mt-6 w-full',
        )}
      >
        {isFree ? t('marketing.pricing.ctaFree') : t('marketing.pricing.ctaPaid')}
      </Link>
    </div>
  );
}
