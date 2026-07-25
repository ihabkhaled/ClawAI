'use client';

import Link from 'next/link';

import { PlanTierCard } from '@/components/marketing/home/plan-tier-card';
import { Button } from '@/components/ui/button';
import { MARKETING_HOME_PATHS } from '@/constants/marketing-home.constants';
import { MARKETING_YEARLY_FREE_MONTHS } from '@/constants/subscription-marketing.constants';
import { usePricingToggle } from '@/hooks/marketing/use-pricing-toggle';
import { useTranslation } from '@/lib/i18n';
import type { MarketingPricingSectionProps } from '@/types';
import { resolveMarketingPlanTiers } from '@/utilities/marketing-plan-tiers.utility';

export function PricingSection({
  compact = false,
}: MarketingPricingSectionProps): React.ReactElement {
  const { t } = useTranslation();
  const { isYearly, selectMonthly, selectYearly } = usePricingToggle();

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.home.pricing.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.home.pricing.intro')}</p>
      </div>

      <div
        role="group"
        aria-label={t('marketing.home.pricing.toggleLabel')}
        className="border-border bg-card mx-auto mt-8 flex w-fit items-center gap-1 rounded-full border p-1"
      >
        <Button
          type="button"
          size="sm"
          variant={isYearly ? 'ghost' : 'default'}
          aria-pressed={!isYearly}
          className="rounded-full"
          onClick={selectMonthly}
        >
          {t('marketing.home.pricing.toggleMonthly')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isYearly ? 'default' : 'ghost'}
          aria-pressed={isYearly}
          className="rounded-full"
          onClick={selectYearly}
        >
          {t('marketing.home.pricing.toggleYearly')}
        </Button>
      </div>
      <p className="text-muted-foreground mt-3 text-center text-xs">
        {t('marketing.home.pricing.yearlyNote', { months: MARKETING_YEARLY_FREE_MONTHS })}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resolveMarketingPlanTiers(compact).map((tier) => (
          <PlanTierCard key={tier.slug} tier={tier} isYearly={isYearly} />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Link href={MARKETING_HOME_PATHS.FAQ} className="text-primary hover:underline">
          {t('marketing.home.pricing.linkFaq')}
        </Link>
        <Link href={MARKETING_HOME_PATHS.USE_CASES} className="text-primary hover:underline">
          {t('marketing.home.pricing.linkUseCases')}
        </Link>
      </div>
    </section>
  );
}
